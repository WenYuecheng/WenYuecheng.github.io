# Yuecheng Wen · A curious little universe

An original bilingual anime portfolio focused on Agent systems, recursive self-improvement (RSI) and parameter-efficient fine-tuning (PEFT). Built with Next.js static export, original illustrations, a real portrait, and a small independent guestbook service.

- Personal site: https://wenyuecheng.cn/
- GitHub Pages mirror: https://wenyuecheng.github.io/
- Projects: [Weyra](https://github.com/WenYuecheng/Weyra) and [SolaceAI](https://solaceai.wenyuecheng.cn/)

## Develop and verify

Use Node.js 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm preview
```

The export is written to `out/`; preview runs on http://127.0.0.1:4321. The English entry is `/`, Chinese is `/zh/`. Project details and contact pages have matching bilingual routes. Browser checks cover desktop and mobile, both themes, motion preferences, language links, guestbook behavior, navigation and static rendering without JavaScript.

## Maintain content and artwork

Edit `data/site.ts` for both languages, education, public contact details, project evidence and links. The CUHK entry is an **admission to MSc in Computer Science for September 2027**, not current enrollment. Historical experimental results include their sample sizes and scope; they do not describe every capability of the lightweight public demo.

Website artwork is local: `public/images/generated/*.webp`; portrait: `public/images/portrait.webp`. Full masters are retained in `artwork/originals/`, and prompts in `docs/art-prompts.md`. Keep new background images optimized before publication. Attribution is in `THIRD_PARTY_NOTICES.md`.

## Background music

Current track: **ZXXXQ — Can’t Give Up**, selected from the owner’s local FLAC and encoded as a 192 kbps stereo MP3 (about 3.1 MB, 2:09). The original file is unchanged. Default player volume is 25%, configured in `music.volume`.

To replace it, add MP3 files to `public/music/` and configure `music.tracks` in `data/site.ts` with `title`, `artist`, `src` and `cover`. The shared player attempts autoplay when a track is configured, observes browser autoplay restrictions, remembers pause preference, and stays mounted during internal navigation. An empty track list shows an honest unconfigured state. Audio failure does not block navigation. No online music API, weather or online chat is used.

## Guestbook

See `services/guestbook/` and `deploy/guestbook/`. The API lives at `https://wenyuecheng.cn/api/portal`; both the personal domain and GitHub Pages mirror use it. It supports the two explicit site origins, validates and limits submissions, renders messages as text, and persists SQLite data in a Docker volume. Back up the volume and its salt file. The service shares the Caddy container's network namespace and listens only on loopback; recreate the guestbook container if Caddy itself is recreated.

## Publish

GitHub Actions exports `out/` to Pages on `main`. For the personal server, back up the site and Caddyfile, then copy assets before HTML into the existing `/opt/solaceai/edge/site` directory. Preserve that directory's inode because Caddy bind-mounts it. Remove obsolete HTML and retain prior hashed assets during rollout. Reload Caddy after validating its configuration. Leave the SolaceAI/MindBridge application routes unchanged and verify both application health endpoints after deployment.

For a fully local guestbook preview, start the service in development mode (see its README), then build with `NEXT_PUBLIC_GUESTBOOK_API=http://127.0.0.1:8093 pnpm build`. This export is for local review only. Before publication, rebuild without that override so both public sites use the primary HTTPS API. Local test notes remain in the local database and are not part of the static export.
