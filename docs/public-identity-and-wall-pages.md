# Public identity and message-wall pages

The owner requested a consistent public name on 2026-10-27: **Yuecheng Wen** in both languages. The given-name/family-name order is used throughout the page content, navigation wordmark, portrait alternative text, metadata, opening title, copyright, account display and verification email. The prepared GitHub profile README uses the same name. Existing owner sessions and older owner-authored messages are presented under this name without requiring registration again. Other visitors keep their own chosen nicknames.

The education section shows **8%** for class rank, with the former scholarship/competition panel and its content removed. The remaining education card occupies the available row. Public contact destinations and repository/account identifiers are unchanged.

## Public message pagination

The website requests `GET /messages?page=1&pageSize=12`. The response contains `messages`, `page`, `pageSize`, `total`, and `totalPages`. Public totals and pages count approved messages only. Message objects still expose only ID, nickname, content and creation time, never email or review details.

- Twelve messages per website page, newest first. Created-at ties use a stable row order.
- Previous/next buttons plus the current/total page count; no unbounded row of page buttons.
- Page size is bounded to 1–24, and the page input to 1–100000. SQL uses bound parameters.
- Count and list come from one read transaction. If moderation empties the current page, the server clamps it to the last available page. An empty wall is page 1 of 1.
- Refreshing keeps the current page. Failed fetches keep the last successful page and allow retry; delayed stale responses cannot replace a newer page.
- Long notes preserve line breaks and wrap long words. Notes longer than 180 characters or six lines initially show a six-line preview with an accessible “Read full note / Show less” button; the full content is preserved. The responsive grid becomes one column on small screens; the full-page animated scenery covers the full document height.
- The pre-pagination query without a `page` parameter retains its old newest-60 response for rollout compatibility. The website always uses explicit pagination, so older approved notes remain accessible.

Offset pages can shift when a new note is approved between visits; refresh updates the count and current page. No public messages are duplicated or fabricated by the client.

All changes are local pending the owner's publication approval. No GitHub or production server identity has been changed yet.
