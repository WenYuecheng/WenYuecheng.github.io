"""Small, independent guestbook. No external services or API credentials."""

import hashlib
import hmac
import ipaddress
import math
import os
import secrets
import sqlite3
import uuid
from collections.abc import Callable, Iterator
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

PRODUCTION_ORIGINS = ("https://wenyuecheng.cn", "https://wenyuecheng.github.io")
DEVELOPMENT_ORIGINS = (
    "http://localhost:4321", "http://localhost:3000",
    "http://127.0.0.1:4321", "http://127.0.0.1:3000",
)
MAX_BODY_BYTES = 8192


@dataclass(frozen=True)
class Settings:
    db_path: Path
    development: bool = False
    trust_proxy_header: bool = False
    hmac_salt: str | None = None

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            db_path=Path(os.environ.get("PORTAL_DB_PATH", "/data/guestbook.sqlite3")),
            development=os.environ.get("PORTAL_ENV") == "development",
            trust_proxy_header=os.environ.get("PORTAL_TRUST_LOCAL_PROXY") == "1",
            hmac_salt=os.environ.get("PORTAL_HMAC_SALT"),
        )


class MessageInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, strict=True, extra="forbid")
    name: str = Field(default="", max_length=40)
    message: str = Field(min_length=1, max_length=500)
    website: str = Field(default="", max_length=2048)


class PublicMessage(BaseModel):
    id: str
    name: str
    message: str
    createdAt: str


class MessageList(BaseModel):
    messages: list[PublicMessage]


class Health(BaseModel):
    status: str = "UP"


class RequestBoundary:
    """Check actual streamed bytes before FastAPI parses any JSON."""

    def __init__(self, app: ASGIApp, origins: tuple[str, ...]) -> None:
        self.app = app
        self.origins = origins

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def safe_send(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Cache-Control"] = "no-store"
                headers["X-Content-Type-Options"] = "nosniff"
            await send(message)

        async def reject(status: int, error: str) -> None:
            await JSONResponse({"error": error}, status_code=status)(scope, receive, safe_send)

        headers = Headers(scope=scope)
        origins = headers.getlist("origin")
        if origins and (len(origins) != 1 or origins[0] not in self.origins):
            await reject(403, "Origin is not allowed.")
            return

        if scope["method"] != "POST":
            await self.app(scope, receive, safe_send)
            return
        if headers.get("content-type", "").split(";", 1)[0].strip().lower() != "application/json":
            await reject(415, "Use application/json.")
            return
        if "content-length" in headers:
            try:
                length = int(headers["content-length"])
                if length < 0:
                    raise ValueError
            except ValueError:
                await reject(400, "Invalid request size.")
                return
            if length > MAX_BODY_BYTES:
                await reject(413, "Request is too large.")
                return
        body = bytearray()
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            body.extend(event.get("body", b""))
            if len(body) > MAX_BODY_BYTES:
                await reject(413, "Request is too large.")
                return
            if not event.get("more_body", False):
                break
        delivered = False

        async def replay() -> Message:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, replay, safe_send)


@contextmanager
def connect(path: Path) -> Iterator[sqlite3.Connection]:
    db = sqlite3.connect(path, timeout=5)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize(settings: Settings) -> bytes:
    settings.db_path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if settings.hmac_salt is not None:
        salt = settings.hmac_salt.encode("utf-8")
        if len(salt) < 32:
            raise ValueError("PORTAL_HMAC_SALT must contain at least 32 bytes.")
    else:
        salt_path = settings.db_path.with_suffix(".salt")
        try:
            descriptor = os.open(salt_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            salt = salt_path.read_bytes()
        else:
            salt = secrets.token_bytes(32)
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(salt)
        salt_path.chmod(0o600)
        if len(salt) < 32:
            raise ValueError("Persisted guestbook salt must contain at least 32 bytes.")
    with connect(settings.db_path) as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY, name TEXT NOT NULL,
                message TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS rate_events (
                peer_key TEXT NOT NULL, created_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS rate_peer_time ON rate_events(peer_key, created_at);
            CREATE INDEX IF NOT EXISTS rate_time ON rate_events(created_at);
            CREATE INDEX IF NOT EXISTS messages_time ON messages(created_at);
        """)
    settings.db_path.chmod(0o600)
    return salt


def peer_key(request: Request, settings: Settings, salt: bytes) -> str:
    peer = request.client.host if request.client else "unknown"
    try:
        address = ipaddress.ip_address(peer)
    except ValueError:
        address = None
    if settings.trust_proxy_header and address is not None and address.is_loopback:
        candidate = request.headers.get("x-portal-client-ip", "")
        try:
            peer = str(ipaddress.ip_address(candidate))
        except ValueError:
            pass
    return hmac.new(salt, peer.encode("utf-8"), hashlib.sha256).hexdigest()


def create_app(
    settings: Settings | None = None, clock: Callable[[], datetime] | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    clock = clock or (lambda: datetime.now(timezone.utc))

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.salt = initialize(settings)
        yield

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    origins = PRODUCTION_ORIGINS + (DEVELOPMENT_ORIGINS if settings.development else ())
    app.add_middleware(RequestBoundary, origins=origins)
    app.add_middleware(
        CORSMiddleware, allow_origins=list(origins), allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"], expose_headers=["Retry-After"],
        allow_credentials=False, max_age=600,
    )

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, _error: RequestValidationError) -> JSONResponse:
        return JSONResponse({"error": "Check name and message lengths."}, status_code=422)

    @app.exception_handler(sqlite3.Error)
    async def storage_error(_request: Request, _error: sqlite3.Error) -> JSONResponse:
        return JSONResponse({"error": "Guestbook is temporarily unavailable."}, status_code=503)

    @app.get("/health")
    def health() -> Health:
        with connect(settings.db_path) as db:
            db.execute("SELECT 1 FROM messages LIMIT 1")
        return Health()

    @app.get("/messages")
    def list_messages() -> MessageList:
        with connect(settings.db_path) as db:
            rows = db.execute(
                "SELECT id, name, message, created_at AS createdAt "
                "FROM messages ORDER BY created_at DESC, rowid DESC LIMIT 60"
            ).fetchall()
        return MessageList(messages=[PublicMessage(**dict(row)) for row in rows])

    @app.post("/messages", status_code=201, response_model=PublicMessage)
    def create_message(payload: MessageInput, request: Request):
        now = clock().astimezone(timezone.utc)
        item = PublicMessage(
            id=uuid.uuid4().hex, name=payload.name or "Anonymous", message=payload.message,
            createdAt=now.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        )
        if payload.website:
            return item
        key = peer_key(request, settings, app.state.salt)
        timestamp = now.timestamp()
        window_start = timestamp - 600
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
        with connect(settings.db_path) as db:
            # Serialize the check and write across threads and future processes.
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM rate_events WHERE created_at < ?", (min(day_start, window_start),))
            peer = db.execute(
                "SELECT count(*), min(created_at) FROM rate_events WHERE peer_key = ? AND created_at > ?",
                (key, window_start),
            ).fetchone()
            daily = db.execute("SELECT count(*) FROM rate_events WHERE created_at >= ?", (day_start,)).fetchone()[0]
            if daily >= 200 or peer[0] >= 3:
                retry = (day_start + 86400 - timestamp) if daily >= 200 else (peer[1] + 600 - timestamp)
                return JSONResponse(
                    {"error": "Too many messages. Please try again later."}, status_code=429,
                    headers={"Retry-After": str(max(1, math.ceil(retry)))},
                )
            db.execute("INSERT INTO rate_events(peer_key, created_at) VALUES (?, ?)", (key, timestamp))
            db.execute(
                "INSERT INTO messages(id, name, message, created_at) VALUES (?, ?, ?, ?)",
                (item.id, item.name, item.message, item.createdAt),
            )
        return item

    return app


app = create_app()
