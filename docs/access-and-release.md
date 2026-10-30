# Public and authenticated content

All visitor roles see the Eugene persona and the same fox avatar in both languages. The withdrawn private identity and biography cannot override the public welcome; the original portrait endpoint is disabled. Only the owner’s configured email grants administrator permissions; custom nicknames are not accepted. Each visitor mailbox receives a fixed, unique poetic name; the owner's displayed nickname is always Eugene.

Keep actual identity, academic data, original portrait, runtime screenshots, project details and external link destinations in the external readonly private content directory. The server projects a member allowlist and additional owner fields. Private responses are not cacheable, and browser state and image object URLs are discarded on logout, expiry, error or role changes.

The static host and Pages mirror use the same public artifact and authenticated API. Never upload the private directory into Pages or source control. Updating the public snapshot cannot revoke historical public copies or hide domain/account identifiers.

Website email registration remains open to eligible educational mailboxes. SolaceAI registration is closed independently; the website never provisions an application account. Keep existing live data on updates. Backups belong outside all web roots, under restricted access, and need deletion requests reapplied after restoration.

Before deploying, test every role, missing/expired credentials, direct routes and assets, logout/back navigation, both locales, and desktop/mobile. Verify content fields and private assets through authenticated probes without paid model calls. Inspect final public artifacts and remove stale public resources. Do not increase existing provider budgets.

The shared avatar uses the original glasses-wearing fox photograph obtained by the site owner from its creator at its original resolution. The former personal portrait is not served to any account. Browser autoplay restrictions can require a gesture. No unverified filing or licensing assertion is displayed.

Public contact surfaces expose only the configured Xiaohongshu profile. Mail addresses are supplied by the protected home response: members see the configured administrator mailbox, and the owner sees the private owner contact mailbox. Keep the latter in private content configuration. Anonymous HTML and scripts contain neither address.

Signed-in visitors can privately report an issue through the shared letter-style dialog. A transactional per-account ledger enforces three accepted submissions per Beijing calendar day, including delivery failures, across restarts and both website origins. Request identifiers deduplicate retries. The recipient is always the server-configured administrator; reports never appear on the public wall. Only delivery/quota metadata is stored by the application, and records older than thirty days are pruned when feedback is used.

Privacy agreement and copyright notice have separate bilingual routes. Before issuing a sign-in code and before verification, the server requires explicit acceptance of its current policy version. Each issued challenge has a matching consent record; pre-upgrade or stale-version challenges cannot create a session. Successful verification records the privacy/copyright version and timestamp against the account, without inventing consent for existing accounts or interrupting existing sessions. The registration checkbox is initially unchecked; declining leaves public browsing available.

The main site restores an unexpired session using a Secure, HttpOnly, SameSite=Lax host-only cookie; the Pages mirror retains tab-local token compatibility. Cookie-authenticated POSTs require a trusted Origin. Logout revokes the backend session, deletes the cookie and immediately hides private browser state, with a non-secret sign-out marker for network failure. Pending verification stores the request ID/email and expiry in sessionStorage, never the code. Ten minutes is the code lifetime, not the resend cooldown; server Retry-After controls rate-limit feedback.
