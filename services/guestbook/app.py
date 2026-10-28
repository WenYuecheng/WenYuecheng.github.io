"""Independent portfolio accounts, moderated guestbook, and protected link API."""

import fcntl
import hashlib
import html
import hmac
import ipaddress
import json
import math
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import uuid
from collections.abc import Callable, Iterator
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.headerregistry import Address
from email.utils import format_datetime, make_msgid
from mail_template import verification_content
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from private_content import load_content, project_view, asset_path
from pydantic import BaseModel, ConfigDict, Field, field_validator
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

PRODUCTION_ORIGINS = ("https://wenyuecheng.cn", "https://wenyuecheng.github.io")
DEVELOPMENT_ORIGINS = (
    "http://localhost:4321", "http://localhost:3000",
    "http://127.0.0.1:4321", "http://127.0.0.1:3000",
)
PRIVACY_VERSION = "2026-10-28.1"
MAX_BODY_BYTES = 8192


@dataclass(frozen=True)
class Settings:
    db_path: Path
    content_dir: Path | None = None
    development: bool = False
    trust_proxy_header: bool = False
    hmac_salt: str | None = None
    admin_email: str = ""
    mail_mode: str = "smtp"
    dev_mailbox: bool = False
    outbox_path: Path | None = None
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_security: str = "starttls"

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            db_path=Path(os.environ.get("PORTAL_DB_PATH", "/data/guestbook.sqlite3")),
            content_dir=Path(os.environ["PORTAL_CONTENT_DIR"]) if os.environ.get("PORTAL_CONTENT_DIR") else None,
            development=os.environ.get("PORTAL_ENV") == "development",
            trust_proxy_header=os.environ.get("PORTAL_TRUST_LOCAL_PROXY") == "1",
            hmac_salt=os.environ.get("PORTAL_HMAC_SALT"),
            admin_email=os.environ.get("PORTAL_ADMIN_EMAIL", ""),
            mail_mode=os.environ.get("PORTAL_MAIL_MODE", "smtp"),
            dev_mailbox=os.environ.get("PORTAL_DEV_MAILBOX") == "1",
            outbox_path=Path(os.environ["PORTAL_OUTBOX_PATH"]) if os.environ.get("PORTAL_OUTBOX_PATH") else None,
            smtp_host=os.environ.get("PORTAL_SMTP_HOST", ""),
            smtp_port=int(os.environ.get("PORTAL_SMTP_PORT", "587")),
            smtp_user=os.environ.get("PORTAL_SMTP_USER", ""),
            smtp_password=os.environ.get("PORTAL_SMTP_PASSWORD", ""),
            smtp_from=os.environ.get("PORTAL_SMTP_FROM", ""),
            smtp_security=os.environ.get("PORTAL_SMTP_SECURITY", "starttls"),
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


class MessagePage(MessageList):
    page: int | None = None
    pageSize: int | None = None
    total: int | None = None
    totalPages: int | None = None


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
                headers["Cache-Control"] = "private, no-store" if scope["path"].startswith("/content/") else "no-store"
                headers.add_vary_header("Authorization")
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
        body_limit = 16384 if scope.get("path") == "/feedback" else MAX_BODY_BYTES
        if "content-length" in headers:
            try:
                length = int(headers["content-length"])
                if length < 0:
                    raise ValueError
            except ValueError:
                await reject(400, "Invalid request size.")
                return
            if length > body_limit:
                await reject(413, "Request is too large.")
                return
        body = bytearray()
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            body.extend(event.get("body", b""))
            if len(body) > body_limit:
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
    with connect(settings.db_path) as db:
        columns = {row[1] for row in db.execute("PRAGMA table_info(messages)")}
        for name, definition in (("user_id", "TEXT"), ("status", "TEXT NOT NULL DEFAULT 'pending'"), ("reviewed_at", "TEXT")):
            if name not in columns:
                db.execute(f"ALTER TABLE messages ADD COLUMN {name} {definition}")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, nickname TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS challenges (
                id TEXT PRIMARY KEY, email TEXT NOT NULL, code_hash TEXT NOT NULL,
                created_at REAL NOT NULL, expires_at REAL NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0, invalidated INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS challenge_email ON challenges(email);
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                kind TEXT NOT NULL, peer_key TEXT NOT NULL, subject_key TEXT NOT NULL, created_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS event_limits ON events(kind, created_at);
            CREATE INDEX IF NOT EXISTS public_message_pages ON messages(status, created_at);
            CREATE TABLE IF NOT EXISTS challenge_consents (
                challenge_id TEXT PRIMARY KEY, privacy_version TEXT NOT NULL, accepted_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_consents (
                user_id TEXT NOT NULL, privacy_version TEXT NOT NULL, copyright_version TEXT NOT NULL,
                accepted_at REAL NOT NULL, PRIMARY KEY(user_id,privacy_version,copyright_version)
            );
            CREATE TABLE IF NOT EXISTS feedback_reports (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, request_id TEXT NOT NULL,
                day TEXT NOT NULL, created_at REAL NOT NULL, status TEXT NOT NULL,
                UNIQUE(user_id, request_id)
            );
            CREATE INDEX IF NOT EXISTS feedback_daily ON feedback_reports(user_id,day);
            CREATE TABLE IF NOT EXISTS review_audit (
                id INTEGER PRIMARY KEY, message_id TEXT NOT NULL, actor_id TEXT NOT NULL,
                reviewed_at TEXT NOT NULL, from_status TEXT NOT NULL, to_status TEXT NOT NULL
            );
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


# ASCII mailbox syntax, with label boundaries rather than a substring match.
EMAIL_LOCAL = re.compile(r"[a-z0-9!#$%&'*+/=?^_`{|}~.-]+", re.ASCII)
DOMAIN_LABEL = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", re.ASCII)



def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if not email.isascii() or len(email) > 254 or email.count('@') != 1:
        raise ValueError('Invalid email.')
    local, domain = email.split('@')
    if not 1 <= len(local) <= 64 or not EMAIL_LOCAL.fullmatch(local) or local.startswith('.') or local.endswith('.') or '..' in local:
        raise ValueError('Invalid email.')
    labels = domain.split('.')
    if len(labels) < 2 or not all(DOMAIN_LABEL.fullmatch(label) for label in labels):
        raise ValueError('Invalid email.')
    return email


def eligible_email(value: str, admin_email: str) -> str:
    email = normalize_email(value)
    labels = email.split('@')[1].split('.')
    educational = (len(labels) >= 2 and labels[-1] == 'edu') or (
        len(labels) >= 3 and labels[-2] == 'edu' and re.fullmatch('[a-z]{2}', labels[-1])
    )
    if email != admin_email and not educational:
        raise ValueError('Use an educational email address.')
    return email


def digest(salt: bytes, domain: str, value: str) -> str:
    return hmac.new(salt, (domain + '\0' + value).encode(), hashlib.sha256).hexdigest()


def iso(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def validate_settings(settings: Settings) -> str:
    admin = normalize_email(settings.admin_email) if settings.admin_email else ''
    if settings.mail_mode not in ('smtp', 'file'):
        raise ValueError('PORTAL_MAIL_MODE must be smtp or file.')
    if settings.mail_mode == 'file' and (not settings.development or settings.trust_proxy_header or not settings.outbox_path):
        raise ValueError('File mail requires explicit development, an outbox path, and no trusted proxy.')
    if settings.dev_mailbox and (not settings.development or settings.mail_mode != 'file' or settings.trust_proxy_header):
        raise ValueError('Development mailbox requires file mail, development, and no trusted proxy.')
    if settings.smtp_security not in ('ssl', 'starttls') or not 1 <= settings.smtp_port <= 65535:
        raise ValueError('SMTP requires verified SSL or STARTTLS and a valid port.')
    if any(c in settings.smtp_host for c in '\r\n'):
        raise ValueError('Invalid SMTP host.')
    if settings.smtp_from:
        normalize_email(settings.smtp_from)
    return admin


def outbox(settings: Settings, timestamp: float, message: dict | None = None) -> list[dict]:
    """Private, bounded local development file; lock covers read/prune/write."""
    path = settings.outbox_path
    if path is None:
        raise ValueError('No development outbox.')
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'r+', encoding='utf-8') as stream:
        fcntl.flock(stream, fcntl.LOCK_EX)
        os.fchmod(stream.fileno(), 0o600)
        data = stream.read(131073)
        if len(data) > 131072:
            rows = []
        else:
            rows = json.loads(data) if data else []
        rows = [row for row in rows if row['timestamp'] > timestamp - 600]
        if message:
            rows.append(message)
        rows = rows[-100:]
        stream.seek(0)
        json.dump(rows, stream, ensure_ascii=True)
        stream.truncate()
        stream.flush()
        return rows


def deliver_code(settings: Settings, email: str, code: str, timestamp: float) -> None:
    if settings.mail_mode == 'file':
        outbox(settings, timestamp, {'email': email, 'code': code, 'createdAt': iso(timestamp), 'timestamp': timestamp})
        return
    if not settings.smtp_host or not settings.smtp_from:
        raise OSError('Mail is not configured.')
    message = EmailMessage()
    message['Subject'] = 'wenyuecheng.cn · 登录验证码 / Sign-in code'
    message['From'] = Address(display_name='Eugene · wenyuecheng.cn', addr_spec=normalize_email(settings.smtp_from))
    message['To'] = email
    message['Date'] = format_datetime(datetime.fromtimestamp(timestamp, timezone.utc))
    message['Message-ID'] = make_msgid(domain='wenyuecheng.cn')
    plain, html = verification_content(code, timestamp)
    message.set_content(plain, cte='quoted-printable')
    message.add_alternative(html, subtype='html', cte='quoted-printable')
    send_mail(settings, message)


def send_mail(settings: Settings, message: EmailMessage) -> None:
    context = ssl.create_default_context()
    if settings.smtp_security == 'ssl':
        smtp = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=8, context=context)
    else:
        smtp = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=8)
    with smtp:
        if settings.smtp_security == 'starttls':
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)


def deliver_feedback(settings: Settings, sender: str, report: dict, timestamp: float) -> None:
    recipient = normalize_email(settings.admin_email)
    if settings.mail_mode == 'file':
        outbox(settings, timestamp, {'kind':'feedback','email':recipient,'sender':sender,'report':report,'timestamp':timestamp})
        return
    if not settings.smtp_host or not settings.smtp_from:
        raise OSError('Mail is not configured.')
    message = EmailMessage()
    message['Subject'] = 'Eugene · 问题反馈 / Feedback · ' + report['title']
    message['From'] = Address(display_name='Eugene · Website feedback', addr_spec=normalize_email(settings.smtp_from))
    message['To'] = recipient
    message['Reply-To'] = sender
    message['Date'] = format_datetime(datetime.fromtimestamp(timestamp, timezone.utc))
    message['Message-ID'] = make_msgid(domain='wenyuecheng.cn')
    body = '\n'.join([report['title'], 'Type: '+report['category'], 'From: '+sender, 'Page: '+report['page'], report['context'], '', report['message']])
    message.set_content(body)
    safe = html.escape
    message.add_alternative('<!doctype html><html><body style="margin:0;background:#f5f0ed;padding:32px;font-family:Arial,sans-serif;color:#342b39"><div style="max-width:600px;margin:auto;background:#fffdf9;border-radius:24px;padding:32px"><p style="color:#8b6d98;letter-spacing:3px">EUGENE · FEEDBACK</p><h1 style="font-size:26px">'+safe(report['title'])+'</h1><p style="color:#7c6d80">'+safe(report['category'])+' · '+safe(sender)+'</p><div style="white-space:pre-wrap;line-height:1.8;background:#f7f2f9;padding:24px;border-radius:16px">'+safe(report['message'])+'</div><p style="font-size:13px;color:#817886">'+safe(report['page'])+'<br>'+safe(report['context'])+'</p><p style="font-size:12px;color:#817886">Reply to this email to contact the reporter.</p></div></body></html>', subtype='html')
    send_mail(settings, message)


class FeedbackInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, strict=True, extra='forbid')
    category: Literal['bug','suggestion','other']
    title: str = Field(min_length=3, max_length=100)
    message: str = Field(min_length=10, max_length=3000)
    page: str = Field(default='', max_length=300)
    context: str = Field(default='', max_length=400)
    requestId: str = Field(pattern=r'^[A-Za-z0-9_-]{32,64}$')

    @field_validator('title')
    @classmethod
    def single_line(cls, value):
        if any(c in value for c in '\r\n'):
            raise ValueError('Title must be one line.')
        return value


def feedback_window(timestamp: float) -> tuple[str, str]:
    beijing = timezone(timedelta(hours=8))
    current = datetime.fromtimestamp(timestamp, beijing)
    reset = (current + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return current.date().isoformat(), reset.isoformat()


class StrictInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, strict=True, extra='forbid')


class ConsentInput(StrictInput):
    privacyAccepted: bool = False
    privacyVersion: str = Field(default='', max_length=40)


class EmailInput(ConsentInput):
    email: str = Field(min_length=3, max_length=254)


class VerifyInput(ConsentInput):
    challengeId: str = Field(min_length=1, max_length=64)
    code: str = Field(pattern=r'^[0-9]{6}$')
    nickname: str = Field(default='', max_length=40)


class ReviewInput(StrictInput):
    decision: str = Field(pattern=r'^(approved|rejected)$')


def limited(db: sqlite3.Connection, kind: str, peer: str, subject: str, timestamp: float,
            bounds: list[tuple[str, str, int, float]]) -> JSONResponse | None:
    for column, value, maximum, window in bounds:
        # Column names are fixed internal literals, never derived from a request.
        row = db.execute(f'SELECT count(*), min(created_at) FROM events WHERE kind=? AND {column}=? AND created_at>?',
                         (kind, value, timestamp - window)).fetchone()
        if row[0] >= maximum:
            return JSONResponse({'error': 'Too many requests. Please try again later.'}, status_code=429,
                                headers={'Retry-After': str(max(1, math.ceil(row[1] + window - timestamp)))})
    day = datetime.fromtimestamp(timestamp, timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
    global_max = 100 if kind == 'issue' else 200 if kind == 'message' else None
    if global_max and db.execute('SELECT count(*) FROM events WHERE kind=? AND created_at>=?', (kind, day)).fetchone()[0] >= global_max:
        return JSONResponse({'error': 'Too many requests. Please try again later.'}, status_code=429,
                            headers={'Retry-After': str(max(1, math.ceil(day + 86400 - timestamp)))})
    db.execute('DELETE FROM events WHERE created_at < ?', (min(day, timestamp - 3600),))
    db.execute('INSERT INTO events VALUES (?, ?, ?, ?)', (kind, peer, subject, timestamp))
    return None


def create_app(settings: Settings | None = None, clock: Callable[[], datetime] | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    clock = clock or (lambda: datetime.now(timezone.utc))
    admin_email = validate_settings(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.salt = initialize(settings)
        yield

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    origins = PRODUCTION_ORIGINS + (DEVELOPMENT_ORIGINS if settings.development else ())
    app.add_middleware(RequestBoundary, origins=origins)
    app.add_middleware(CORSMiddleware, allow_origins=list(origins), allow_methods=['GET', 'POST'],
                       allow_headers=['Content-Type', 'Authorization'], expose_headers=['Retry-After'],
                       allow_credentials=False, max_age=600)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, _error: RequestValidationError) -> JSONResponse:
        return JSONResponse({'error': 'Check the submitted fields and lengths.'}, status_code=422)

    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, error: HTTPException) -> JSONResponse:
        return JSONResponse({'error': error.detail}, status_code=error.status_code)

    @app.exception_handler(sqlite3.Error)
    async def storage_error(_request: Request, _error: sqlite3.Error) -> JSONResponse:
        return JSONResponse({'error': 'Guestbook is temporarily unavailable.'}, status_code=503)

    def owner_name(locale: str = 'en', viewer: str = 'admin') -> str:
        if viewer == 'anonymous':
            return 'Eugene'
        try:
            return load_content(settings.content_dir)['identity'][locale if viewer == 'admin' else 'en']
        except HTTPException:
            return 'Eugene'

    def user_view(row, locale: str = 'en') -> dict:
        return {'id': row['id'], 'nickname': owner_name(locale) if row['email'] == admin_email else row['nickname'], 'email': row['email'],
                'role': 'admin' if row['email'] == admin_email else 'user'}

    def authenticated(request: Request) -> dict:
        authorization = request.headers.get('authorization', '')
        scheme, _, token = authorization.partition(' ')
        if scheme.lower() != 'bearer' or not token or len(token) > 256:
            raise HTTPException(401, 'Sign in to continue.')
        token_hash = digest(app.state.salt, 'session', token)
        with connect(settings.db_path) as db:
            row = db.execute('SELECT users.*, sessions.expires_at FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?',
                             (token_hash, clock().timestamp())).fetchone()
        if row is None:
            raise HTTPException(401, 'Sign in to continue.')
        return {'user': user_view(row, request.query_params.get('locale', 'en') if request.query_params.get('locale', 'en') in ('en', 'zh') else 'en'), 'expiresAt': iso(row['expires_at']), 'token_hash': token_hash}

    CurrentUser = Annotated[dict, Depends(authenticated)]

    def administrator(session: CurrentUser) -> dict:
        if session['user']['role'] != 'admin':
            raise HTTPException(403, 'Administrator access required.')
        return session

    AdminUser = Annotated[dict, Depends(administrator)]

    @app.get('/health')
    def health() -> Health:
        with connect(settings.db_path) as db:
            db.execute('SELECT 1 FROM messages LIMIT 1')
        return Health()

    @app.get('/auth/config')
    def auth_config() -> dict:
        return {'registration': 'edu', 'deliveryMode': 'local' if settings.mail_mode == 'file' else 'smtp', 'devMailbox': settings.dev_mailbox, 'privacyVersion': PRIVACY_VERSION}

    @app.post('/auth/request-code')
    def request_code(payload: EmailInput, request: Request):
        if payload.privacyAccepted is not True or payload.privacyVersion != PRIVACY_VERSION:
            raise HTTPException(422, 'Please read and agree to the current privacy agreement.')
        try:
            email = eligible_email(payload.email, admin_email)
        except ValueError:
            raise HTTPException(422, 'Use a valid educational email address.') from None
        timestamp = clock().timestamp()
        peer = peer_key(request, settings, app.state.salt)
        subject = digest(app.state.salt, 'email', email)
        challenge = secrets.token_urlsafe(24)
        code = f'{secrets.randbelow(1000000):06d}'
        failed = False
        with connect(settings.db_path) as db:
            db.execute('BEGIN IMMEDIATE')
            blocked = limited(db, 'issue', peer, subject, timestamp, [
                ('subject_key', subject, 1, 60), ('subject_key', subject, 3, 3600), ('peer_key', peer, 10, 3600)])
            if blocked:
                return blocked
            db.execute('DELETE FROM challenges WHERE created_at < ?', (timestamp - 86400,))
            db.execute('DELETE FROM challenge_consents WHERE challenge_id NOT IN (SELECT id FROM challenges)')
            db.execute('UPDATE challenges SET invalidated=1 WHERE email=?', (email,))
            db.execute('INSERT INTO challenges(id,email,code_hash,created_at,expires_at) VALUES (?,?,?,?,?)',
                       (challenge, email, digest(app.state.salt, 'otp', challenge + '\0' + email + '\0' + code), timestamp, timestamp + 600))
            db.execute('INSERT INTO challenge_consents VALUES (?,?,?)',(challenge,PRIVACY_VERSION,timestamp))
            try:
                deliver_code(settings, email, code, timestamp)
            except (OSError, smtplib.SMTPException, ValueError):
                db.execute('UPDATE challenges SET invalidated=1 WHERE id=?', (challenge,))
                failed = True
        if failed:
            raise HTTPException(503, 'Email delivery is temporarily unavailable.')
        return {'challengeId': challenge, 'expiresIn': 600, 'resendAfter': 60, 'deliveryMode': 'local' if settings.mail_mode == 'file' else 'smtp'}

    @app.post('/auth/verify')
    def verify(payload: VerifyInput, request: Request):
        if payload.privacyAccepted is not True or payload.privacyVersion != PRIVACY_VERSION:
            raise HTTPException(422, 'Please read and agree to the current privacy agreement.')
        timestamp = clock().timestamp()
        peer = peer_key(request, settings, app.state.salt)
        with connect(settings.db_path) as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT * FROM challenges WHERE id=?', (payload.challengeId,)).fetchone()
            subject = digest(app.state.salt, 'email', row['email']) if row else 'unknown'
            bounds = [('peer_key', peer, 20, 600)]
            if row:
                bounds.append(('subject_key', subject, 10, 600))
            blocked = limited(db, 'verify', peer, subject, timestamp, bounds)
            if blocked:
                return blocked
            if row and row['attempts'] >= 5:
                return JSONResponse({'error': 'Too many verification attempts.'}, status_code=429, headers={'Retry-After': '600'})
            if not row or row['invalidated'] or row['expires_at'] <= timestamp:
                return JSONResponse({'error': 'Code is invalid or expired.'}, status_code=400)
            consent = db.execute('SELECT * FROM challenge_consents WHERE challenge_id=?',(payload.challengeId,)).fetchone()
            if not consent or consent['privacy_version'] != PRIVACY_VERSION:
                return JSONResponse({'error':'Request a new code after agreeing to the current privacy agreement.'},status_code=400)
            db.execute('UPDATE challenges SET attempts=attempts+1 WHERE id=?', (row['id'],))
            actual = digest(app.state.salt, 'otp', row['id'] + '\0' + row['email'] + '\0' + payload.code)
            if not hmac.compare_digest(actual, row['code_hash']):
                return JSONResponse({'error': 'Code is invalid or expired.'}, status_code=400)
            db.execute('UPDATE challenges SET invalidated=1 WHERE id=?', (row['id'],))
            db.execute('INSERT OR IGNORE INTO users VALUES (?, ?, ?)', (uuid.uuid4().hex, row['email'], 'Eugene' if row['email'] == admin_email else payload.nickname or 'A visitor'))
            user = db.execute('SELECT * FROM users WHERE email=?', (row['email'],)).fetchone()
            db.execute('INSERT OR IGNORE INTO user_consents VALUES (?,?,?,?)',(user['id'],PRIVACY_VERSION,PRIVACY_VERSION,timestamp))
            token = secrets.token_urlsafe(32)
            db.execute('DELETE FROM sessions WHERE expires_at<=?', (timestamp,))
            db.execute('INSERT INTO sessions VALUES (?, ?, ?)', (digest(app.state.salt, 'session', token), user['id'], timestamp + 28800))
            result = {'token': token, 'expiresAt': iso(timestamp + 28800), 'user': user_view(user)}
        return result

    @app.get('/auth/me')
    def me(session: CurrentUser) -> dict:
        return {'user': session['user'], 'expiresAt': session['expiresAt']}

    @app.post('/auth/logout', status_code=204)
    def logout(_payload: StrictInput, session: CurrentUser) -> Response:
        with connect(settings.db_path) as db:
            db.execute('DELETE FROM sessions WHERE token_hash=?', (session['token_hash'],))
        return Response(status_code=204)

    if settings.dev_mailbox:
        @app.get('/dev/mailbox')
        def mailbox(request: Request, email: str = '') -> dict:
            peer = request.client.host if request.client else ''
            host = request.headers.get('host', '').lower()
            valid_host = re.fullmatch(r'(localhost|127\.0\.0\.1)(?::([0-9]{1,5}))?', host)
            if valid_host and valid_host.group(2) and not 1 <= int(valid_host.group(2)) <= 65535:
                valid_host = None
            try:
                local_peer = ipaddress.ip_address(peer).is_loopback
            except ValueError:
                local_peer = False
            origin = request.headers.get('origin')
            if not local_peer or not valid_host or (origin and origin not in DEVELOPMENT_ORIGINS):
                raise HTTPException(404, 'Not found.')
            try:
                email = normalize_email(email)
            except ValueError:
                raise HTTPException(422, 'Invalid email.') from None
            rows = outbox(settings, clock().timestamp())
            return {'messages': [{k: row[k] for k in ('email', 'code', 'createdAt')} for row in rows if row['email'] == email]}

    def message_view(row, private: bool = False, admin: bool = False, viewer: str = 'anonymous', locale: str = 'en') -> dict:
        owner = 'email' in row.keys() and row['email'] == admin_email
        item = {'id': row['id'], 'name': owner_name(locale, viewer) if owner else row['name'], 'message': row['message'], 'createdAt': row['created_at']}
        if private:
            item['status'] = row['status']
        if admin:
            item['email'] = row['email'] or ''
            if row['reviewed_at']:
                item['reviewedAt'] = row['reviewed_at']
        return item

    @app.get('/messages', response_model=MessagePage, response_model_exclude_none=True)
    def list_messages(request: Request, locale: Annotated[str, Query(pattern=r'^(en|zh)$')] = 'en', page: Annotated[int | None, Query(ge=1, le=100000)] = None,
                      page_size: Annotated[int, Query(alias='pageSize', ge=1, le=24)] = 12) -> dict:
        viewer = authenticated(request)['user']['role'] if request.headers.get('authorization') else 'anonymous'
        with connect(settings.db_path) as db:
            db.execute('BEGIN')
            # Keep old clients compatible; the new website always requests explicit pages.
            total = db.execute("SELECT count(*) FROM messages WHERE status='approved'").fetchone()[0]
            pages = max(1, math.ceil(total / page_size))
            current = min(page, pages) if page is not None else 1
            limit = page_size if page is not None else 60
            rows = db.execute("SELECT messages.*,users.email FROM messages LEFT JOIN users ON users.id=messages.user_id WHERE status='approved' ORDER BY messages.created_at DESC,messages.rowid DESC LIMIT ? OFFSET ?",
                              (limit, (current - 1) * page_size)).fetchall()
        result = {'messages': [message_view(row, viewer=viewer, locale=locale) for row in rows]}
        if page is not None:
            result.update(page=current, pageSize=page_size, total=total, totalPages=pages)
        return result

    @app.post('/messages', status_code=201)
    def create_message(payload: MessageInput, request: Request, session: CurrentUser):
        timestamp = clock().timestamp()
        user = session['user']
        item = {'id': uuid.uuid4().hex, 'name': user['nickname'], 'message': payload.message,
                'createdAt': iso(timestamp), 'status': 'pending'}
        if payload.website:
            return item
        peer = peer_key(request, settings, app.state.salt)
        with connect(settings.db_path) as db:
            db.execute('BEGIN IMMEDIATE')
            blocked = limited(db, 'message', peer, user['id'], timestamp,
                              [('peer_key', peer, 3, 600), ('subject_key', user['id'], 3, 600)])
            if blocked:
                return blocked
            db.execute('INSERT INTO messages(id,name,message,created_at,user_id,status) VALUES (?,?,?,?,?,?)',
                       (item['id'], item['name'], item['message'], item['createdAt'], user['id'], 'pending'))
        return item

    @app.get('/messages/mine')
    def mine(session: CurrentUser, locale: Annotated[str, Query(pattern=r'^(en|zh)$')] = 'en') -> dict:
        with connect(settings.db_path) as db:
            rows = db.execute('SELECT messages.*,users.email FROM messages LEFT JOIN users ON users.id=messages.user_id WHERE messages.user_id=? ORDER BY messages.created_at DESC,messages.rowid DESC LIMIT 60', (session['user']['id'],)).fetchall()
        return {'messages': [message_view(row, private=True, viewer=session['user']['role'], locale=locale) for row in rows]}

    @app.get('/admin/messages')
    def admin_messages(_session: AdminUser, locale: Annotated[str, Query(pattern=r'^(en|zh)$')] = 'en', status: Annotated[str, Query(pattern=r'^(pending|approved|rejected)$')] = 'pending') -> dict:
        with connect(settings.db_path) as db:
            rows = db.execute('SELECT messages.*,users.email FROM messages LEFT JOIN users ON users.id=messages.user_id WHERE status=? ORDER BY created_at DESC,messages.rowid DESC LIMIT 100', (status,)).fetchall()
        return {'messages': [message_view(row, private=True, admin=True, viewer='admin', locale=locale) for row in rows]}

    @app.post('/admin/messages/{message_id}/review')
    def review(message_id: str, payload: ReviewInput, session: AdminUser) -> dict:
        with connect(settings.db_path) as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT * FROM messages WHERE id=?', (message_id,)).fetchone()
            if not row:
                raise HTTPException(404, 'Message not found.')
            reviewed_at = iso(clock().timestamp())
            db.execute('INSERT INTO review_audit(message_id,actor_id,reviewed_at,from_status,to_status) VALUES (?,?,?,?,?)',
                       (message_id, session['user']['id'], reviewed_at, row['status'], payload.decision))
            db.execute('UPDATE messages SET status=?,reviewed_at=? WHERE id=?', (payload.decision, reviewed_at, message_id))
            updated = db.execute('SELECT messages.*,users.email FROM messages LEFT JOIN users ON users.id=messages.user_id WHERE messages.id=?', (message_id,)).fetchone()
        return message_view(updated, private=True, admin=True, viewer='admin')


    @app.get('/feedback/quota')
    def feedback_quota(session: CurrentUser) -> dict:
        day, reset = feedback_window(clock().timestamp())
        with connect(settings.db_path) as db:
            db.execute('DELETE FROM feedback_reports WHERE created_at<?',(clock().timestamp()-30*86400,))
            used = db.execute('SELECT count(*) FROM feedback_reports WHERE user_id=? AND day=?', (session['user']['id'],day)).fetchone()[0]
        return {'limit':3, 'remaining':max(0,3-used), 'resetsAt':reset}

    @app.post('/feedback')
    def feedback(payload: FeedbackInput, session: CurrentUser):
        if not admin_email:
            raise HTTPException(503, 'Feedback is temporarily unavailable.')
        timestamp = clock().timestamp()
        day, reset = feedback_window(timestamp)
        user_id = session['user']['id']
        report_id = uuid.uuid4().hex
        with connect(settings.db_path) as db:
            db.execute('BEGIN IMMEDIATE')
            existing = db.execute('SELECT status FROM feedback_reports WHERE user_id=? AND request_id=?', (user_id,payload.requestId)).fetchone()
            if existing:
                if existing['status'] == 'sent':
                    count = db.execute('SELECT count(*) FROM feedback_reports WHERE user_id=? AND day=?',(user_id,day)).fetchone()[0]
                    return {'status':'sent','limit':3,'remaining':max(0,3-count),'resetsAt':reset}
                raise HTTPException(409 if existing['status']=='pending' else 503, 'Feedback delivery is pending or failed.')
            used = db.execute('SELECT count(*) FROM feedback_reports WHERE user_id=? AND day=?', (user_id,day)).fetchone()[0]
            if used >= 3:
                return JSONResponse({'error':'Daily feedback limit reached.', 'remaining':0, 'resetsAt':reset},status_code=429)
            db.execute('INSERT INTO feedback_reports VALUES (?,?,?,?,?,?)',(report_id,user_id,payload.requestId,day,timestamp,'pending'))
        try:
            deliver_feedback(settings,session['user']['email'],payload.model_dump(exclude={'requestId'}),timestamp)
        except Exception:
            with connect(settings.db_path) as db:
                db.execute("UPDATE feedback_reports SET status='failed' WHERE id=?",(report_id,))
            raise HTTPException(503,'Feedback could not be sent. Please try again later.') from None
        with connect(settings.db_path) as db:
            db.execute("UPDATE feedback_reports SET status='sent' WHERE id=?",(report_id,))
        return {'status':'sent', **feedback_quota(session)}

    @app.get('/content/home')
    def home_content(session: CurrentUser, locale: Annotated[str, Query(pattern=r'^(en|zh)$')] = 'en') -> dict:
        config = load_content(settings.content_dir)
        home = config['home'][locale]
        return {'name': config['identity'][locale if session['user']['role'] == 'admin' else 'en'], 'portraitAsset': 'portrait',
                'profile': home['profile'], 'education': {key: value for key, value in home['education'].items() if key not in ('courses', 'coursework')},
                'interests': home['interests'], 'contact': {'csdn': config.get('csdn', ''), 'email': config.get('ownerEmail','') if session['user']['role'] == 'admin' else admin_email}}

    @app.get('/content/projects')
    def projects_content(session: CurrentUser, locale: Annotated[str, Query(pattern=r'^(en|zh)$')] = 'en') -> dict:
        config = load_content(settings.content_dir)
        return {'projects': [project_view(project, locale, session['user']['role'] == 'admin') for project in config['projects']]}

    @app.get('/content/projects/{slug}')
    def one_project_content(slug: str, session: CurrentUser, locale: Annotated[str, Query(pattern=r'^(en|zh)$')] = 'en') -> dict:
        config = load_content(settings.content_dir)
        for project in config['projects']:
            if project.get('slug') == slug:
                return {'project': project_view(project, locale, session['user']['role'] == 'admin')}
        raise HTTPException(404, 'Project not found.')

    @app.get('/content/assets/{asset_id}')
    def content_asset(asset_id: str, _session: CurrentUser):
        config = load_content(settings.content_dir)
        return FileResponse(asset_path(settings.content_dir, config, asset_id), headers={'Cache-Control': 'private, no-store', 'Vary': 'Authorization'})

    @app.get('/profile/links/github')
    def github_profile(_session: CurrentUser) -> dict:
        return {'url': load_content(settings.content_dir)['github']}

    @app.get('/projects/{slug}/links/{key}')
    def project_link(slug: str, key: str, _session: CurrentUser) -> dict:
        url = load_content(settings.content_dir).get('projectLinks', {}).get(slug, {}).get(key)
        if not url:
            raise HTTPException(404, 'Link not found.')
        return {'url': url}

    return app


app = create_app()
