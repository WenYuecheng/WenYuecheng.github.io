# Eugene · A little universe

An original bilingual anime personal website with role-aware content, local artwork, optional background music and a moderated wall.

The exported website contains only the public persona. Everyone sees Eugene and the same public fox avatar. The former personal portrait is withdrawn from the API, and old identity/biography fields cannot override the welcome. Verified members and the owner receive their permitted academic details, project copy, external destinations and contact fields from the independent authenticated API, provisioned separately outside this repository and the static root.

## Development

Use Node.js 24 and pnpm. Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, and `pnpm preview`. The preview is on port 4321. Set `NEXT_PUBLIC_GUESTBOOK_API` only when building against a different API.

The static export supports GitHub Pages and the primary host. See `services/guestbook/README.md` for the separately deployed backend and private content contract. Never put actual private content in source, fixtures, CI artifacts or `public/`.

## Access

Anonymous readers can visit Home, Reading, Updates, Wall and Contact. Education email verification creates a website account. Member and owner fields are filtered on the server for every request. Project application accounts are independent. Remaining project/emblem images require authorization and are not public file URLs.

Background music respects browser autoplay restrictions and can be enabled during the opening. Theme, motion and language controls remain available. Website artwork is original or accompanied by retained third-party notices. Music distribution rights and applicable hosting requirements must be checked separately.

## Reading and updates

`data/reading.ts` contains the public paper titles, verified publication dates (year only when the exact date is unknown), bilingual notes and official external links. The home shows three recent additions; Reading offers the full catalog, search, topic filters and pagination. `addedAt` records the original file modification time for ordering and is not a claimed reading date. PDF bytes stay outside the repository and static export. The rerunnable `scripts/archive-reading-papers.py` checks the prepared source inventory and checksums; it defaults to a dry run. Local originals and their archive manifest live in Downloads/已上架论文.

Updates are public, with three on the home and ten per page. The existing administrator page provides plain-text publish/edit/delete controls; Chinese is required and English is optional. Only the server-authorized owner can mutate records. Updates use the existing SQLite database and its backup process. The new routes and bilingual admin forms require the accompanying backend update before release.

See [artwork provenance and asset policy](docs/garden-artwork.md) and [local acceptance handoff](docs/reading-garden-handoff.md). This upgrade is held for owner review before synchronizing either public host.

## Checks

`pnpm check` validates types. `pnpm test` covers content and interaction state. Browser checks live in `tests/e2e/`. The build validates opening bootstrap scripts and rejects private files in the export. Backend tests exercise permissions, OTP, moderation, pagination and private asset boundaries.

Old revisions may contain formerly public information. This release does not rewrite Git history or change existing domains/account identifiers.
