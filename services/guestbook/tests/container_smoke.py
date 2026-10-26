"""Run through stdin inside the production image; uses only Python's stdlib."""

import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

os.environ.update({
    "PORTAL_ENV": "development", "PORTAL_MAIL_MODE": "file", "PORTAL_DEV_MAILBOX": "1",
    "PORTAL_OUTBOX_PATH": "/data/outbox.json", "PORTAL_TRUST_LOCAL_PROXY": "0",
    "PORTAL_ADMIN_EMAIL": "smoke@school.edu",
})
TOKEN = ""
BASE = "http://127.0.0.1:8093"
COMMAND = [
    "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8093",
    "--workers", "1", "--no-proxy-headers", "--no-access-log", "--limit-concurrency", "32",
]


def request(path, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=body, headers={"Content-Type": "application/json", "Authorization": "Bearer " + TOKEN})
    try:
        response = urllib.request.urlopen(req, timeout=3)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.load(response)


def start():
    process = subprocess.Popen(COMMAND)
    for _ in range(60):
        try:
            assert request("/health") == (200, {"status": "UP"})
            return process
        except (OSError, AssertionError):
            if process.poll() is not None:
                raise RuntimeError("Server exited before startup.")
            time.sleep(0.05)
    process.terminate()
    process.wait(timeout=5)
    raise RuntimeError("Server did not become healthy.")


assert os.getuid() == 10001
assert os.access("/data", os.W_OK)
try:
    Path("/app/should-not-write").write_text("test")
except OSError:
    pass
else:
    raise AssertionError("Application root is writable.")

process = start()
try:
    assert request("/messages", {"message": "anonymous"})[0] == 401
    assert request("/projects/weyra/links/github")[0] == 401
    status, challenge = request("/auth/request-code", {"email": "smoke@school.edu"})
    assert status == 200
    code = request("/dev/mailbox?email=smoke@school.edu")[1]["messages"][-1]["code"]
    status, auth = request("/auth/verify", {"challengeId": challenge["challengeId"], "code": code, "nickname": "月城"})
    assert status == 200
    TOKEN = auth["token"]
    assert request("/projects/weyra/links/github")[0] == 200
    for i in range(3):
        status, item = request("/messages", {"name": "  月城  ", "message": f"Hello {i}"})
        assert status == 201 and item["name"] == "月城" and item["status"] == "pending"
        assert len(request("/messages")[1]["messages"]) == i
        assert request("/admin/messages/" + item["id"] + "/review", {"decision": "approved"})[0] == 200
finally:
    process.terminate()
    process.wait(timeout=5)

process = start()
try:
    status, payload = request("/messages")
    assert status == 200 and len(payload["messages"]) == 3
    assert request("/messages", {"message": "fourth"})[0] == 429
    assert Path("/data/guestbook.salt").stat().st_mode & 0o077 == 0
    print("Container smoke passed: UID 10001, read-only app, writable volume, loopback HTTP, authentication, moderation, persistence and rate limit.")
finally:
    process.terminate()
    process.wait(timeout=5)
