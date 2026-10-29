# Reading garden implementation

Goal: Upgrade the bilingual anime portfolio's typography, materials and scenes; add all downloaded read papers as public external links and simple owner-only editable public updates. Local preview only until explicit owner publication confirmation.

Architecture: Keep Next static export, React/Framer Motion and existing FastAPI/SQLite portal. Reuse XinghuisamaBlogs 8633e983 visual, DailyBriefing and MomentList interaction patterns with retained attribution. No new service or paid model API calls.

## Binding constraints
- Preserve quotations, existing identities/three roles, project link policy, every-refresh opening video and original audio.
- Six new original scenes: profile garden corridor day/night, reading study day/night, updates post office dusk/night. Optimized desktop/mobile WebP, originals outside public.
- All PDFs directly in Downloads are read-paper candidates; validate paper metadata/official links, short bilingual factual sentence, do not publish PDF bytes. Move originals into Downloads/已上架论文 with SHA256 manifest only once records are prepared, collision-safe and recoverable. Future unfiled PDFs stay distinguishable.
- Public papers: static data; home three recent, reading page all with lightweight filtering/paging if useful.
- Public updates: newest first, page size 10, home 3. Owner edits text (Chinese required, English optional/fallback), publish/edit/delete confirmation. Existing admin authentication and SQLite. Anonymous read, admin writes, no comments/likes/uploads.
- No git push, server mutations or production publication. Maintain working local frontend+backend preview.

## Tasks
- [x] 1. Inventory and archive all papers; data/reading.ts exports Paper and papers. Fields id,title,year,paperDate,addedAt,tags,summary:{zh,en},url. Use actual dates if verifiable; no invented dates. Source files and checksum mapping in Downloads/已上架论文/上架清单.json, human README. Script must be rerunnable without duplicate moves. Tests verify catalog/source parity, HTTPS official destinations, no local PDF URLs.
- [x] 2. Generate and optimize all six scenes; apply visual/material/typography theme and layered responsive scenery. Root owns styles, Shell, homepage and route wiring.
- [x] 3. Updates backend: GET /updates?page=1&pageSize=10&locale=zh|en -> {updates:[{id,body,createdAt,updatedAt}],page,pageSize,total,totalPages}. POST /admin/updates {bodyZh,bodyEn?} -> record with both source fields; GET /admin/updates same pagination includes source fields; PATCH /admin/updates/{id}; DELETE same ->204. bodyZh 1..1500 chars, bodyEn 0..3000. Existing 8KiB body cap; admin dependencies; JSON guard extends PATCH/DELETE safely; DB table site_updates. Preserve creation date on edit. Seed initial paper-organization update locally after real import. Test red then green for auth, CRUD, pagination, plain text, locale fallback, persistent restart and existing content privacy.
- [x] 4. Frontend: components/Journal.tsx exports ReadingPage, UpdatesPage, JournalHome, UpdatesAdmin. Reading consumes data/reading.ts. Updates consumes endpoints above through useAuth().api without authentication for public GET. Admin source fields and errors, explicit delete confirmation. Root connects new EN/ZH /reading/ and /updates/ static routes, header/footer/home and admin management section. Frontend agent owns Journal.tsx and feature-specific browser tests only, no shared styles/routes.
- [x] 5. Whole-change independent review, fix material findings, typecheck/unit/backend/build/browser and local real API checks. Local preview uses API 127.0.0.1:8093. Snapshot initial local DB first; no real emails required for tests. Document final state, keep public deployment held.
