# Personal server operation

Portfolio static root: `/opt/solaceai/edge/site` (Caddy bind mount `/srv`). Keep this directory itself in place. App configuration: `/opt/solaceai/edge/Caddyfile`. Separate portfolio service source/export: `/opt/yuecheng-portfolio`. Compose project: `yuecheng-portal`, file `deploy/guestbook/compose.yaml`. Guestbook volume: `yuecheng-portal_guestbook-data`.

Before rollout, copy the existing static root and Caddyfile to a dated release folder. Deploy with `scripts/sync-site.sh /opt/solaceai/edge/site`, which copies assets before HTML, removes obsolete HTML and preserves prior hashed assets and the bind-mounted inode. The export contains no credentials.

Add `deploy/guestbook/Caddyfile.fragment` inside the personal domain only, and cache `/_next/static/*` immutably. Validate Caddy configuration before reload. Keep the SolaceAI/MindBridge application block intact. The guestbook shares Caddy's network namespace, exposing only `127.0.0.1:8093` there. Recreate guestbook after a Caddy container replacement. A Caddy configuration reload requires neither container replacement nor guestbook recreation.

For guestbook backup, use SQLite's online backup interface and copy its persistent salt, or stop the guestbook briefly and archive the entire data volume. Never delete the volume when upgrading.

Rollback: synchronize a dated `site.before` back into the existing static directory (do not replace the directory), restore `Caddyfile.before`, validate and reload Caddy. Retain guestbook data independently. Check both application health URLs and both portfolio languages after every release. GitHub Pages is a separate deployment from the same Git commit/export.

Music is currently unconfigured. Add an authorized local MP3 and metadata to `data/site.ts`, then verify play/pause, browser-blocked autoplay, cross-page continuity and unavailable-file behavior using that track before publication.
