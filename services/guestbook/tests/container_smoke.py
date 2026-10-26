"""Run through stdin inside the production image; uses only Python's stdlib."""

import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:8093"
COMMAND = [
    "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8093",
    "--workers", "1", "--no-proxy-headers", "--no-access-log", "--limit-concurrency", "32",
]


def request(path, payload=None):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=body, headers={"Content-Type": "application/json"})
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
    for i in range(3):
        status, item = request("/messages", {"name": "  月城  ", "message": f"Hello {i}"})
        assert status == 201 and item["name"] == "月城"
finally:
    process.terminate()
    process.wait(timeout=5)

process = start()
try:
    status, payload = request("/messages")
    assert status == 200 and len(payload["messages"]) == 3
    assert request("/messages", {"message": "fourth"})[0] == 429
    assert Path("/data/guestbook.salt").stat().st_mode & 0o077 == 0
    print("Container smoke passed: UID 10001, read-only app, writable volume, loopback HTTP, persistence and rate limit.")
finally:
    process.terminate()
    process.wait(timeout=5)
