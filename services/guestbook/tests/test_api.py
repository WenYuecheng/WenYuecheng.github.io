import sqlite3
import secrets
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app import Settings, create_app, digest


def authorize(client):
    """Seed authentication for request-boundary tests; API login is covered separately."""
    token = secrets.token_urlsafe(32)
    user_id = uuid.uuid4().hex
    with sqlite3.connect(client.app.state.db_path) as db:
        db.execute('INSERT INTO users VALUES (?,?,?)', (user_id, user_id + '@school.edu', 'A visitor'))
        db.execute('INSERT INTO sessions VALUES (?,?,?)', (digest(client.app.state.salt, 'session', token), user_id, 9999999999))
    client.headers['Authorization'] = 'Bearer ' + token
    return user_id


def test_app(settings, clock=None):
    app = create_app(settings, clock=clock)
    app.state.db_path = settings.db_path
    return app


test_app.__test__ = False


@pytest.fixture
def settings(tmp_path):
    return Settings(db_path=tmp_path / "guestbook.sqlite3")


@pytest.fixture
def client(settings):
    with TestClient(test_app(settings)) as client:
        authorize(client)
        yield client


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_create_trim_authenticated_plain_text_and_storage(client, settings):
    text = "<script>alert('hi')</script>'; DROP TABLE messages; --"
    response = client.post("/messages", json={"name": "  ", "message": f" {text} "})
    assert response.status_code == 201
    item = response.json()
    assert item["name"] == "A visitor"
    assert item["message"] == text
    assert set(item) == {"id", "name", "message", "createdAt", "status"}
    assert datetime.fromisoformat(item["createdAt"]).utcoffset().total_seconds() == 0
    assert item["status"] == "pending"
    assert client.get("/messages").json() == {"messages": []}
    assert client.get("/messages/mine").json() == {"messages": [item]}
    with sqlite3.connect(settings.db_path) as db:
        assert db.execute("SELECT count(*) FROM messages").fetchone()[0] == 1


def test_optional_name_and_unicode(client):
    response = client.post("/messages", json={"message": "  你好，月城 🌙  "})
    assert response.status_code == 201
    assert response.json()["message"] == "你好，月城 🌙"
    assert response.json()["name"] == "A visitor"


@pytest.mark.parametrize("payload", [
    {"message": " "}, {"message": "x" * 501}, {"message": "ok", "name": "x" * 41},
    {"message": 42}, {"message": "ok", "name": None}, {}, [],
    {"message": "ok", "admin": True},
])
def test_invalid_inputs_are_concise_and_never_stored(client, payload):
    response = client.post("/messages", json=payload)
    assert response.status_code == 422
    assert response.json() == {"error": "Check the submitted fields and lengths."}
    assert client.get("/messages").json() == {"messages": []}


def test_trim_before_length_validation(client):
    response = client.post("/messages", json={"name": " " + "n" * 40 + " ", "message": " " + "m" * 500 + " "})
    assert response.status_code == 201


def test_honeypot_fake_acceptance_does_not_write(client):
    response = client.post("/messages", json={"message": "spam", "website": "https://bot.invalid"})
    assert response.status_code == 201
    assert set(response.json()) == {"id", "name", "message", "createdAt", "status"}
    assert client.get("/messages").json() == {"messages": []}


def test_restart_keeps_messages_and_limiter(settings):
    with TestClient(test_app(settings)) as first:
        authorize(first)
        for i in range(3):
            assert first.post("/messages", json={"message": str(i)}).status_code == 201
    with TestClient(test_app(settings)) as second:
        authorize(second)
        assert second.get("/messages").json()["messages"] == []
        with sqlite3.connect(settings.db_path) as db:
            assert db.execute("SELECT count(*) FROM messages").fetchone()[0] == 3
        assert second.post("/messages", json={"message": "fourth"}).status_code == 429


def test_rolling_peer_limit_and_expiration(settings):
    now = [datetime(2026, 10, 26, tzinfo=timezone.utc)]
    with TestClient(test_app(settings, clock=lambda: now[0])) as client:
        authorize(client)
        for _ in range(3):
            assert client.post("/messages", json={"message": "hi"}).status_code == 201
        blocked = client.post("/messages", json={"message": "hi"})
        assert blocked.status_code == 429
        assert int(blocked.headers["retry-after"]) >= 1
        now[0] = datetime(2026, 10, 26, 0, 10, tzinfo=timezone.utc)
        assert client.post("/messages", json={"message": "hi"}).status_code == 201


def test_proxy_header_ignored_unless_explicitly_enabled_and_loopback(settings):
    with TestClient(test_app(settings), client=("127.0.0.1", 5000)) as client:
        authorize(client)
        for i in range(3):
            authorize(client)
            assert client.post("/messages", json={"message": "hi"}, headers={"X-Portal-Client-IP": f"203.0.113.{i}"}).status_code == 201
        authorize(client)
        assert client.post("/messages", json={"message": "hi"}, headers={"X-Portal-Client-IP": "203.0.113.99"}).status_code == 429


def test_proxy_header_ignored_from_remote_peer(tmp_path):
    settings = Settings(db_path=tmp_path / "guestbook.sqlite3", trust_proxy_header=True)
    with TestClient(test_app(settings), client=("203.0.113.1", 5000)) as client:
        authorize(client)
        for i in range(3):
            authorize(client)
            assert client.post("/messages", json={"message": "hi"}, headers={"X-Portal-Client-IP": f"203.0.113.{i + 2}"}).status_code == 201
        authorize(client)
        assert client.post("/messages", json={"message": "hi"}, headers={"X-Portal-Client-IP": "203.0.113.99"}).status_code == 429


def test_daily_global_limit_and_newest_sixty(tmp_path):
    settings = Settings(db_path=tmp_path / "guestbook.sqlite3", trust_proxy_header=True)
    now = [datetime(2026, 10, 26, tzinfo=timezone.utc)]
    with TestClient(test_app(settings, clock=lambda: now[0]), client=("127.0.0.1", 5000)) as client:
        authorize(client)
        for i in range(200):
            authorize(client)
            response = client.post("/messages", json={"message": str(i)}, headers={"X-Portal-Client-IP": f"203.0.113.{i}"})
            assert response.status_code == 201
        blocked = client.post("/messages", json={"message": "201"}, headers={"X-Portal-Client-IP": "203.0.114.1"})
        assert blocked.status_code == 429
        with sqlite3.connect(settings.db_path) as db:
            db.execute("UPDATE messages SET status='approved'")
        items = client.get("/messages").json()["messages"]
        assert len(items) == 60
        assert [item["message"] for item in items] == [str(i) for i in range(199, 139, -1)]
        now[0] = datetime(2026, 10, 27, tzinfo=timezone.utc)
        assert client.post("/messages", json={"message": "next day"}).status_code == 201
    with sqlite3.connect(settings.db_path) as db:
        dump = "\n".join(db.iterdump())
        assert "203.0.113." not in dump
        assert "127.0.0.1" not in dump


@pytest.mark.parametrize("origin", ["https://wenyuecheng.cn", "https://wenyuecheng.github.io"])
def test_production_cors_preflight_and_post(client, origin):
    preflight = client.options("/messages", headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == origin
    response = client.post("/messages", json={"message": "hi"}, headers={"Origin": origin})
    assert response.status_code == 201
    assert response.headers["access-control-allow-origin"] == origin


@pytest.mark.parametrize("origin", ["null", "https://evil.invalid", "https://wenyuecheng.cn.evil.invalid", "http://localhost:4321", "http://localhost:3000"])
def test_unknown_origins_are_rejected(client, origin):
    response = client.post("/messages", json={"message": "hi"}, headers={"Origin": origin})
    assert response.status_code == 403
    assert "access-control-allow-origin" not in response.headers
    assert client.get("/messages").json() == {"messages": []}


def test_development_localhost_only_when_explicit(tmp_path):
    settings = Settings(db_path=tmp_path / "guestbook.sqlite3", development=True)
    with TestClient(test_app(settings)) as client:
        authorize(client)
        for origin in ("http://localhost:4321", "http://localhost:3000", "http://127.0.0.1:4321", "http://127.0.0.1:3000"):
            assert client.get("/messages", headers={"Origin": origin}).headers["access-control-allow-origin"] == origin


@pytest.mark.parametrize("content_type", ["text/plain", "application/x-www-form-urlencoded", "application/jsonp", ""])
def test_reject_inappropriate_content_type(client, content_type):
    response = client.post("/messages", content='{"message":"hi"}', headers={"Content-Type": content_type})
    assert response.status_code == 415


def test_bounded_body_and_malformed_json(client):
    assert client.post("/messages", content=b"x" * 8193, headers={"Content-Type": "application/json"}).status_code == 413
    assert client.post("/messages", content=(chunk for chunk in [b"x" * 4096] * 3), headers={"Content-Type": "application/json"}).status_code == 413
    response = client.post("/messages", content="{", headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    assert "input" not in response.text


def test_salt_is_persistent_private_and_not_public(client, settings):
    assert client.post("/messages", json={"message": "hi"}).status_code == 201
    salt_path = settings.db_path.with_suffix(".salt")
    assert len(salt_path.read_bytes()) >= 32
    assert salt_path.stat().st_mode & 0o077 == 0
    assert settings.db_path.stat().st_mode & 0o077 == 0
    assert client.get("/messages").headers["cache-control"] == "no-store"


def test_concurrent_posts_cannot_race_peer_limit(client, settings):
    tokens = []
    for _ in range(12):
        authorize(client)
        tokens.append(client.headers['Authorization'])

    def post(index):
        return client.post("/messages", json={"message": "concurrent"}, headers={'Authorization': tokens[index]}).status_code

    with ThreadPoolExecutor(max_workers=12) as pool:
        statuses = list(pool.map(post, range(12)))
    assert statuses.count(201) == 3
    assert statuses.count(429) == 9
    with sqlite3.connect(settings.db_path) as db:
        assert db.execute("SELECT count(*) FROM messages").fetchone()[0] == 3
    assert client.get("/messages").json() == {"messages": []}


def test_storage_errors_do_not_expose_database_details(client, settings):
    with sqlite3.connect(settings.db_path) as db:
        db.execute("DROP TABLE messages")
    for endpoint in ("/health", "/messages"):
        response = client.get(endpoint)
        assert response.status_code == 503
        assert response.json() == {"error": "Guestbook is temporarily unavailable."}


def test_environment_salt_does_not_require_generated_salt_file(tmp_path):
    settings = Settings(db_path=tmp_path / "db.sqlite3", hmac_salt="s" * 32)
    for _ in range(2):
        with TestClient(test_app(settings)) as client:
            authorize(client)
            assert client.post("/messages", json={"message": "hi"}).status_code == 201
    assert not settings.db_path.with_suffix(".salt").exists()
    with TestClient(test_app(settings)) as client:
        authorize(client)
        assert client.post("/messages", json={"message": "third"}).status_code == 201
        assert client.post("/messages", json={"message": "fourth"}).status_code == 429


def test_invalid_proxy_value_falls_back_and_generic_forwarded_headers_are_ignored(tmp_path):
    settings = Settings(db_path=tmp_path / "db.sqlite3", trust_proxy_header=True)
    with TestClient(test_app(settings), client=("127.0.0.1", 5000)) as client:
        authorize(client)
        for i in range(4):
            authorize(client)
            response = client.post("/messages", json={"message": "hi"}, headers={
                "X-Portal-Client-IP": "invalid-ip",
                "X-Forwarded-For": f"203.0.113.{i}",
                "Forwarded": f"for=203.0.113.{i}",
            })
            assert response.status_code == (201 if i < 3 else 429)
