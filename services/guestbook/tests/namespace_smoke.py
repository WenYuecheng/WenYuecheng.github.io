"""Check deployment config, then exercise Caddy-style shared-container loopback."""

import argparse
import json
import os
import secrets
import subprocess
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMPOSE = ROOT / "deploy/guestbook/compose.yaml"
DEFAULT_ANCHOR = "solaceai-light-caddy-1"


def compose_config(anchor=None):
    env = os.environ.copy()
    env.pop("PORTAL_CADDY_CONTAINER", None)
    if anchor:
        env["PORTAL_CADDY_CONTAINER"] = anchor
    output = subprocess.check_output(
        ["docker", "compose", "-f", str(COMPOSE), "config", "--format", "json"],
        env=env, text=True,
    )
    service = json.loads(output)["services"]["guestbook"]
    assert service["network_mode"] == f"container:{anchor or DEFAULT_ANCHOR}", service["network_mode"]
    assert not service.get("ports"), "Guestbook must not publish a host port."
    assert service["read_only"] is True
    assert service["environment"]["PORTAL_TRUST_LOCAL_PROXY"] == "1"
    assert "ALL" in service["cap_drop"]
    return service


PROBE = r'''
import json
import time
import urllib.error
import urllib.request

def request(path, payload=None, token=FIRST_TOKEN, peer="203.0.113.1", origin="https://wenyuecheng.cn"):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request("http://127.0.0.1:8093" + path, data=body, headers={
        "Authorization": "Bearer " + token, "Content-Type": "application/json", "Origin": origin, "X-Portal-Client-IP": peer,
    })
    try:
        response = urllib.request.urlopen(req, timeout=2)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, json.load(response), response.headers

for attempt in range(100):
    try:
        assert request("/health")[:2] == (200, {"status": "UP"})
        break
    except (OSError, AssertionError):
        if attempt == 99:
            raise
        time.sleep(0.1)
assert request("/messages", {"message": "anonymous"}, token="")[0] == 401
assert request("/projects/weyra/links/github", token="")[0] == 401
assert request("/dev/mailbox?email=a@school.edu")[0] == 404
for i in range(3):
    status, payload, headers = request("/messages", {"message": "anchor " + str(i)})
    assert status == 201
    assert headers["Access-Control-Allow-Origin"] == "https://wenyuecheng.cn"
assert request("/messages", {"message": "blocked"})[0] == 429
# The explicit local-proxy header must separate peers over shared loopback.
assert request("/messages", {"message": "other peer"}, peer="203.0.113.2", token=SECOND_TOKEN)[0] == 201
assert request("/messages", {"message": "bad origin"}, origin="https://invalid.example")[0] == 403
status, payload, _headers = request("/messages")
assert status == 200 and payload["messages"] == []
print("Shared-namespace smoke passed: anchor reaches loopback API; production mailbox exclusion, authorization, pending privacy, CORS, proxy peer separation and rate limits work.")
'''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config-only", action="store_true")
    parser.add_argument("--image", default="yuecheng-guestbook:test")
    args = parser.parse_args()
    suffix = uuid.uuid4().hex[:12]
    anchor = f"guestbook-smoke-anchor-{suffix}"
    guestbook = f"guestbook-smoke-api-{suffix}"
    compose_config()
    service = compose_config(anchor)
    print("Compose checks passed: default/overridden Caddy namespace, no published port, read-only root and explicit proxy trust.", flush=True)
    if args.config_only:
        return
    try:
        subprocess.run([
            "docker", "run", "--detach", "--rm", "--name", anchor,
            "--network", "none", "--read-only", "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges", args.image,
            "python", "-c", "import time; time.sleep(120)",
        ], check=True, stdout=subprocess.DEVNULL)
        subprocess.run([
            "docker", "run", "--detach", "--rm", "--name", guestbook,
            "--network", service["network_mode"], "--read-only", "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges", "--env", "PORTAL_TRUST_LOCAL_PROXY=1",
            args.image,
        ], check=True, stdout=subprocess.DEVNULL)
        anchor_id = subprocess.check_output(["docker", "inspect", "--format", "{{.Id}}", anchor], text=True).strip()
        inspection = json.loads(subprocess.check_output(["docker", "inspect", guestbook], text=True))[0]
        assert inspection["HostConfig"]["NetworkMode"] == f"container:{anchor_id}", inspection["HostConfig"]["NetworkMode"]
        assert not inspection["HostConfig"]["PortBindings"]
        first_token, second_token = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        seed = """
import time, urllib.request
for attempt in range(100):
    try:
        urllib.request.urlopen('http://127.0.0.1:8093/health', timeout=2).close()
        break
    except OSError:
        time.sleep(0.1)
from app import Settings, initialize, connect, digest
settings = Settings.from_env()
salt = initialize(settings)
with connect(settings.db_path) as db:
    for i, token in enumerate(TOKENS):
        uid = 'smoke-' + str(i)
        db.execute('INSERT INTO users VALUES (?,?,?)', (uid, uid + '@school.edu', 'Smoke'))
        db.execute('INSERT INTO sessions VALUES (?,?,?)', (digest(salt, 'session', token), uid, time.time() + 28800))
""".replace('TOKENS', repr((first_token, second_token)))
        subprocess.run(["docker", "exec", "-i", guestbook, "python", "-"], input=seed, text=True, check=True)
        probe = 'FIRST_TOKEN = ' + repr(first_token) + '\nSECOND_TOKEN = ' + repr(second_token) + '\n' + PROBE
        subprocess.run(["docker", "exec", "-i", anchor, "python", "-"], input=probe, text=True, check=True)
    except Exception:
        subprocess.run(["docker", "logs", guestbook], check=False)
        raise
    finally:
        for name in (guestbook, anchor):
            subprocess.run(["docker", "rm", "--force", name], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == "__main__":
    main()
