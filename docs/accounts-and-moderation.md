# Accounts and the reviewed message wall

Portfolio pages and project details are public. Following the personal GitHub profile or project repository/demo links and submitting notes require a verified education-email account. Email verification establishes mailbox ownership, not student enrollment; faculty accounts are accepted too. The server permits `.edu` and `.edu.<country>` addresses, and the exact owner address configured with `PORTAL_ADMIN_EMAIL`.

The first successful six-digit email verification creates an account with the chosen public nickname. Existing accounts sign in using the same mailbox. Codes expire after ten minutes, are one-use, and are throttled. Sessions expire after eight hours and are revoked by sign-out. The static frontend uses a bearer session held in memory and sessionStorage; tokens never go in URLs or persistent localStorage. The primary domain and GitHub Pages each keep their own browser-origin session. Public notes contain no account email.

Every submitted note starts **pending**. The author can view their own pending, published and rejected notes. The owner signs in with the server-configured administrator mailbox. Nickname is optional and never grants privileges. Without an explicit safe return route, owner verification opens `/admin/` or `/zh/admin/` automatically. Resending clears the previous code input; only the newest email code is valid. Approving makes a note public; rejecting or unpublishing removes it from the public API. Review actions are audited server-side. Old guestbook notes migrate to pending without deletion. The wall refreshes approved notes periodically and offers a manual refresh button.

Project link targets are held in the server allowlist, and authenticated requests resolve only known project/link keys. The portfolio gate does not change access rules of the public GitHub repositories or original application domains.

## Local preview

The private development API is bound to `127.0.0.1:8093`. At the owner’s request, the active local preview now sends real verification emails through the existing QQ SMTP configuration. Its private launcher reads the original local service configuration at startup without copying credentials into this repository. Development mailbox access is disabled. Optional file-mail mode remains available for isolated automated tests, with an explicitly enabled loopback-only helper; incompatible trusted-proxy/development combinations fail startup.

See `services/guestbook/README.md` for exact environment variables. Keep the database, salt, outbox and administrator address outside committed public configuration. The local export uses `NEXT_PUBLIC_GUESTBOOK_API=http://127.0.0.1:8093`; rebuild without that override before any approved publication.

## Production preparation

Configure `PORTAL_ADMIN_EMAIL` privately and set `PORTAL_MAIL_MODE=smtp`. SMTP host, port, sender, username and authorization secret are server-only `PORTAL_SMTP_*` variables; use verified SSL or STARTTLS. The owner’s existing QQ SMTP configuration has been verified in the local preview: the provider accepted an administrator verification email. This confirms SMTP acceptance, while the recipient still needs to confirm inbox delivery. Production configuration remains pending publication approval. Do not enable the development mailbox or copy the local outbox into production.

All three publications remain paused until the owner explicitly confirms the local result. Preserve the existing Caddy application routes and named database volume; API authorization is enforced independently of frontend controls.

Personal GitHub entry points (portrait, contact card and footer) resolve through authenticated `/profile/links/github`, with an exact server-side destination. The public GitHub profile itself remains publicly accessible at its original URL. Public footer copy omits template credits; attribution remains in the project provenance and retained licensed sources.
