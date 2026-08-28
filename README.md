# Runtime Observatory

Yuecheng Wen's bilingual academic portfolio, built as a static Astro site.

- Primary site: [wenyuecheng.cn](https://wenyuecheng.cn)
- GitHub Pages mirror: [wenyuecheng.github.io](https://wenyuecheng.github.io)

The primary site and the GitHub Pages mirror serve the same static experience. Canonical metadata continues to point to `wenyuecheng.cn`.

## Local workflow

```bash
pnpm install
pnpm dev
pnpm verify
```

Content is maintained in `src/data/content.ts`. English routes live at `/`; Chinese routes live under `/zh/`.

## Publish into the MindBridge release

```bash
pnpm deploy:site
```

The command builds and validates the site, atomically replaces `../mindbridge-py/deploy/site`, and retains the previous static directory at `../mindbridge-py/deploy/.site-previous` for rollback.

## GitHub Pages

Pushes to `main` run content tests, build the static site, and deploy `dist` through GitHub Actions. The Pages repository intentionally has no `CNAME` file so the mirror remains available at `wenyuecheng.github.io`.
