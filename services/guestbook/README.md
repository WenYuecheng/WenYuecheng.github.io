# Guestbook

Independent FastAPI + SQLite service for the portfolio. Both the primary site
and GitHub Pages use the absolute browser base URL
`https://wenyuecheng.cn/api/portal`. There are no external service calls,
model calls, API keys, weather endpoints, or chat endpoints.

| Method | Internal path | Response |
| --- | --- | --- |
| GET | `/health` | `{"status":"UP"}` after a database read |
| GET | `/messages` | `{"messages":[{"id","name","message","createdAt"}]}`; newest 60 |
| POST | `/messages` | JSON `{ "name": "optional", "message": "required", "website": "" }`; 201 saved object |

Names and messages are trimmed before validation. Blank or omitted names become
`Anonymous`; names are at most 40 characters and messages 1–500 characters.
Timestamps are UTC ISO strings. Content remains plain text, including any HTML
characters; the browser must insert it with `textContent` or normal framework
text escaping, never `innerHTML`. A populated `website` honeypot returns a fake
201 object and saves nothing.

POST requires `application/json` and accepts at most 8 KiB, including streamed
bodies. Validation errors return a concise `error` string. Rate limits are three
saved posts per peer in a rolling ten minutes, plus 200 saved posts across all
peers per UTC calendar day. HTTP 429 includes `Retry-After` seconds. Atomic
SQLite transactions prevent concurrent writes from bypassing the limits.

Exact production origins: `https://wenyuecheng.cn` and
`https://wenyuecheng.github.io`. Unknown or `null` origins are rejected. Requests
without an Origin header are supported for health checks and command-line
clients. CORS is a browser boundary; the persistent rate limiter also applies to
non-browser clients.

## Local checks

Run from the repository root:

```sh
uv venv services/guestbook/.venv --python 3.12
uv pip install --python services/guestbook/.venv/bin/python -r services/guestbook/requirements-dev.txt
services/guestbook/.venv/bin/python -m pytest services/guestbook/tests -q -W error
docker compose -f deploy/guestbook/compose.yaml config --quiet
docker build -t yuecheng-guestbook:test services/guestbook
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges -i yuecheng-guestbook:test python < services/guestbook/tests/container_smoke.py
services/guestbook/.venv/bin/python services/guestbook/tests/namespace_smoke.py
```

For development, run from `services/guestbook`:

```sh
PORTAL_ENV=development PORTAL_DB_PATH=./data/guestbook.sqlite3 .venv/bin/uvicorn app:app --host 127.0.0.1 --port 8093 --no-proxy-headers --no-access-log
```

Development explicitly adds `http://localhost:4321`, `http://localhost:3000`, and
their `127.0.0.1` equivalents to the exact CORS allowlist. Proxy trust remains
disabled unless explicitly enabled.

## Linux server deployment

The supplied Compose file joins the network namespace of the existing Docker
Caddy container, `solaceai-light-caddy-1`. Uvicorn binds **127.0.0.1:8093 inside
that shared namespace**, so Caddy can reach it over loopback without publishing
a host port or changing Caddy's Docker networking. Set `PORTAL_CADDY_CONTAINER`
to override the container name. Caddy must terminate TLS and overwrite
`X-Portal-Client-IP` using the actual transport peer. The service honors this header only when
`PORTAL_TRUST_LOCAL_PROXY=1` **and** its immediate peer is loopback. Generic
`Forwarded` and `X-Forwarded-For` headers are never trusted. If placing a CDN
before Caddy, review the client-address strategy first: this configuration
intentionally counts the CDN transport peer.

Run from the repository root on the Linux server:

```sh
docker compose -f deploy/guestbook/compose.yaml up -d --build
docker compose -f deploy/guestbook/compose.yaml exec -T guestbook python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8093/health', timeout=3).read().decode())"
```

The Caddy container must already be running. If it is **recreated**, recreate
guestbook too so it joins the replacement container's network namespace:

```sh
docker compose -f deploy/guestbook/compose.yaml up -d --force-recreate guestbook
```

A normal restart of the same Caddy container does not require this operation.
Keep the named guestbook data volume; never add `--volumes` to a teardown when
preserving messages. This integration does not require changing or restarting
Caddy's existing application containers.

Import `deploy/guestbook/Caddyfile.fragment` inside the existing
`wenyuecheng.cn` site block, before the static-site fallback. Validate and reload
the existing Caddy configuration through the server's established procedure.
`handle_path` strips `/api/portal`, so `/api/portal/messages` reaches `/messages`.
See [Caddy path handling](https://caddyserver.com/docs/caddyfile/directives/handle_path)
and [upstream header overrides](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

The container runs as UID/GID 10001, drops capabilities, has a read-only root
filesystem, and writes only its named `/data` volume and temporary directory.
Back up the entire volume, including `guestbook.salt`, or use SQLite's online
backup interface for the database and separately save the salt. Keep that
volume when recreating the container: messages and limiter events survive
restarts. Host `curl http://127.0.0.1:8093` cannot reach this private namespace;
use the container health check above, a request from Caddy's namespace, or the
public HTTPS API after routing is configured. The disposable namespace smoke
check runs an anchor with networking disabled and a guestbook sharing its
loopback; it requires no live Caddy or server access.

`PORTAL_HMAC_SALT` may supply an optional stable secret of at least 32 UTF-8
bytes. Otherwise a random 32-byte salt is created once beside the database
with owner-only permissions. Only HMAC-SHA256 peer keys are stored; raw IP
addresses are never saved in SQLite. Rate-event history is pruned on writes
after its daily/ten-minute windows expire. Uvicorn access logging is disabled.
Review any separately enabled Caddy access-log policy to match this privacy
choice. Changing the salt resets peer identities, so preserve it across deploys.

Publication must wait for the owner's explicit confirmation of the local preview.
