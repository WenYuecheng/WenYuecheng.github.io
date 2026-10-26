# Portfolio accounts and guestbook

Independent FastAPI + SQLite service. The static portfolio uses the absolute
browser API base `https://wenyuecheng.cn/api/portal`; local preview uses
`http://127.0.0.1:8093`. No model, weather, chat, or original-application APIs are
used. The existing apps and domains stay independent.

Registration verifies **mailbox ownership**, not student status. Any valid ASCII
address at an institutional `.edu` or `.edu.xx` domain (including faculty and
subdomains) is accepted. The exact server-configured `PORTAL_ADMIN_EMAIL` is the
only non-educational exception. Its value is intentionally absent from committed
defaults. Normalized email addresses are private to the account and administrator.

## API contract

All POST requests require JSON. Errors are `{"error":"concise message"}`; 429
also returns `Retry-After` seconds. Authentication is `Authorization: Bearer TOKEN`.
All responses use `Cache-Control: no-store`. No cookies or browser credentials
are needed; CORS allows the Authorization header.

| Method | Internal path | Request / response |
| --- | --- | --- |
| GET | `/health` | `{status:"UP"}` after a database read |
| GET | `/auth/config` | `{registration:"edu",deliveryMode:"local"\|"smtp",devMailbox:boolean}` |
| POST | `/auth/request-code` | `{email}` → `{challengeId,expiresIn:600,resendAfter:60,deliveryMode}` |
| POST | `/auth/verify` | `{challengeId,code,nickname?}` → `{token,expiresAt,user:{id,nickname,email,role}}` |
| GET | `/auth/me` | Bearer → `{user,expiresAt}` |
| POST | `/auth/logout` | Bearer and `{}` → 204; revokes current token |
| GET | `/messages` | `{messages:[{id,name,message,createdAt}]}`; approved only, newest 60 |
| POST | `/messages` | Bearer and `{message,website?}` → 201 `{id,name,message,createdAt,status:"pending"}` |
| GET | `/messages/mine` | Bearer → newest 60 own messages, each including status |
| GET | `/admin/messages?status=pending` | Admin bearer → newest 100 matching messages, with status/email/reviewedAt when present; status can also be approved/rejected |
| POST | `/admin/messages/{id}/review` | Admin bearer and `{decision:"approved"\|"rejected"}` → updated admin message |
| GET | `/projects/{slug}/links/{key}` | Bearer → `{url}` from fixed HTTPS server mapping; unknown key 404 |
| GET | `/dev/mailbox?email=...` | Explicit local development only → `{messages:[{email,code,createdAt}]}` |

The protected project link keys are `weyra/github`, `weyra/architecture`,
`weyra/evidence`, `solaceai/demo`, and `solaceai/legacy`. This protects disclosure
through this API; the linked destinations retain their own access policies.

Names/messages are trimmed; nicknames max 40 characters, message 1–500.
New users default to `A visitor`; subsequent login preserves their nickname.
An optional legacy POST `name` is validated but the authenticated nickname is
authoritative. `website` is a honeypot: an authenticated filled request gets a
fake pending 201 object without a write. All content remains plain text; clients
must use normal framework text escaping, never HTML insertion. Emails/statuses
are never included in public message responses.

## Local preview (no real email)

From the repository root:

```sh
uv venv services/guestbook/.venv --python 3.12
uv pip install --python services/guestbook/.venv/bin/python -r services/guestbook/requirements-dev.txt
```

Start in `services/guestbook`, explicitly selecting the local file outbox:

```sh
PORTAL_ENV=development \
PORTAL_MAIL_MODE=file \
PORTAL_DEV_MAILBOX=1 \
PORTAL_DB_PATH=./data/guestbook.sqlite3 \
PORTAL_OUTBOX_PATH=./data/outbox.json \
PORTAL_TRUST_LOCAL_PROXY=0 \
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8093 --no-proxy-headers --no-access-log
```

Set `PORTAL_ADMIN_EMAIL` separately in the local shell to exercise moderation
with the intended admin mailbox. No admin role is granted by a browser field.
Use `/auth/request-code`, then `/dev/mailbox?email=...`, and finally `/auth/verify`.
Only the explicit mailbox endpoint/file exposes the local test code; normal
auth responses do not. The local outbox is owner-only (0600), locked, limited to
100 messages, pruned after ten minutes, and never used in production.

The helper requires development mode, file mail, no trusted proxy, an immediate
loopback peer, `Host: localhost` or `127.0.0.1` (optional port), and a permitted
localhost Origin if one is present. Incompatible settings fail startup; the
route is absent otherwise. File mail itself also requires explicit development,
a configured outbox path, and no trusted proxy. Default configuration is closed:
SMTP without required host/from returns 503 and invalidates the challenge.

Development CORS adds only localhost/127.0.0.1 on ports 3000 and 4321.
Production origins remain exactly `https://wenyuecheng.cn` and
`https://wenyuecheng.github.io`; unknown/`null` origins fail. No Origin is supported
for health checks and command-line clients. CORS complements server authorization.

## Persistence and limits

Six-digit codes use cryptographic randomness. Only an HMAC bound to challenge,
normalized email, and code is stored in SQLite. Each challenge expires after ten
minutes, supersedes the previous challenge, is single-use, and allows five
verification attempts. Atomic SQLite transactions serialize verify/consume/user
creation/session creation. Issuance limits: 60-second email cooldown, 3/email/hour,
10/peer/hour, 100/day globally. Verification limits: 20/peer/ten minutes,
10/email/ten minutes, plus 5/challenge. Unknown challenges still count against
peer limits. SMTP failure invalidates the challenge and retains rate usage.
SMTP uses certificate-verified STARTTLS or implicit TLS and an eight-second timeout.

Sessions are opaque random 256-bit tokens, stored only as HMAC hashes, expire
at eight hours, and are individually revoked by logout. The role is calculated
from persisted user email and current server configuration on every request.
Messages require a verified session, are pending initially, and are limited to
3/user/ten minutes, 3/peer/ten minutes, and 200/day globally. Public reads return
only approved records. Reviewing records atomically records actor, time, previous
status, and next status, including unpublishing/reapproving. Existing legacy
messages are retained and migrate to pending; their unknown email appears as
an empty string in the administrator response.

All requests retain the 8 KiB streamed body cap, strict field validation, exact
CORS checks, generic errors, parameterized SQL, and HMAC-only peer identifiers.
`X-Portal-Client-IP` is honored only with `PORTAL_TRUST_LOCAL_PROXY=1` and an
immediate loopback peer. Generic Forwarded/X-Forwarded-For are ignored. Caddy
must overwrite the dedicated header using its transport peer. No access logging
is enabled in the supplied Uvicorn command. Application code never logs OTPs,
tokens, or mail content. Preserve the stable HMAC salt across restarts.

## Local checks

```sh
services/guestbook/.venv/bin/python -m pytest services/guestbook/tests -q -W error
docker compose -f deploy/guestbook/compose.yaml config --quiet
docker build -t yuecheng-guestbook:test services/guestbook
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges -i yuecheng-guestbook:test python < services/guestbook/tests/container_smoke.py
services/guestbook/.venv/bin/python services/guestbook/tests/namespace_smoke.py
```

The container smoke uses only disposable local file email and tests account
verification, moderation, persistent session/rate state, and container controls.
The namespace smoke uses disposable containers with networking disabled; seeded
test-only users exercise production route exclusion and loopback proxy handling.
Neither smoke sends email or contacts the live Caddy/application containers.

## Production configuration (deployment requires separate approval)

The Compose file retains its existing Caddy shared network namespace,
`127.0.0.1:8093` binding, persistent volume, UID/GID 10001, read-only root,
capability drop, no-new-privileges, resource caps, and no published host port.
The existing Caddy fragment is unchanged. Nothing is deployed by local checks.

Configure via private environment, never committed defaults:

| Environment | Meaning |
| --- | --- |
| `PORTAL_ADMIN_EMAIL` | Exact administrator mailbox; empty means no admin |
| `PORTAL_MAIL_MODE` | Production `smtp`; local preview `file` |
| `PORTAL_SMTP_HOST` / `PORTAL_SMTP_PORT` | SMTP endpoint; port defaults to 587 |
| `PORTAL_SMTP_SECURITY` | `starttls` (default) or `ssl`; no plaintext option |
| `PORTAL_SMTP_FROM` | Valid sender email address |
| `PORTAL_SMTP_USER` / `PORTAL_SMTP_PASSWORD` | Optional provider credentials |
| `PORTAL_DEV_MAILBOX` | Production explicitly `0`; preview explicitly `1` |
| `PORTAL_OUTBOX_PATH` | Required only for local file mail |
| `PORTAL_DB_PATH` | SQLite file; container `/data/guestbook.sqlite3` |
| `PORTAL_HMAC_SALT` | Optional stable secret, at least 32 UTF-8 bytes |
| `PORTAL_CADDY_CONTAINER` | Existing namespace anchor override |

Production mail must be tested separately with the approved provider/address.
Empty SMTP configuration intentionally refuses code delivery. SMTP delivery is
inside the write transaction to prevent a challenge becoming valid before a
failed delivery; a slow provider may briefly serialize other database writes.
Limits bound email abuse but are not a substitute for provider quota monitoring.

Without an explicit HMAC environment secret, a random 32-byte salt is generated
once alongside the database as an owner-only `.salt` file. Back up the complete
volume (database, WAL, and salt), or use SQLite online backup and preserve the
salt separately. Keep the named volume when recreating containers. Changing the
salt invalidates sessions and pending code hashes and resets peer identities.
The database contains private email addresses and moderation history; backups
need the same access controls. Routine maintenance/retention for user and audit
records remains an operator policy, while expired sessions/challenges/outbox and
rate events are pruned during requests.
