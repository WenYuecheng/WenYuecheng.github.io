# Eugene · A little universe

An original bilingual anime personal website with role-aware content, local artwork, optional background music and a moderated wall.

The exported website contains only the public persona. Verified members and the owner receive their respective content from the independent authenticated API. Real portraits, academic details, project copy, external destinations and private content configuration are provisioned separately outside this repository and the static root.

## Development

Use Node.js 24 and pnpm. Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, and `pnpm preview`. The preview is on port 4321. Set `NEXT_PUBLIC_GUESTBOOK_API` only when building against a different API.

The static export supports GitHub Pages and the primary host. See `services/guestbook/README.md` for the separately deployed backend and private content contract. Never put actual private content in source, fixtures, CI artifacts or `public/`.

## Access

Anonymous readers can visit Home, Wall and Contact. Education email verification creates a website account. Member and owner fields are filtered on the server for every request. Project application accounts are independent. Private images require authorization and are not public file URLs.

Background music respects browser autoplay restrictions and can be enabled during the opening. Theme, motion and language controls remain available. Website artwork is original or accompanied by retained third-party notices. Music distribution rights and applicable hosting requirements must be checked separately.

## Checks

`pnpm check` validates types. `pnpm test` covers content and interaction state. Browser checks live in `tests/e2e/`. The build validates opening bootstrap scripts and rejects private files in the export. Backend tests exercise permissions, OTP, moderation, pagination and private asset boundaries.

Old revisions may contain formerly public information. This release does not rewrite Git history or change existing domains/account identifiers.
