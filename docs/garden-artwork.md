# Garden correspondence — artwork

Six original environment illustrations generated with the built-in imagegen tool for this personal website on 2026-10-29. No API key or external music/image feed is used by the site.

The prompt shared a hand-painted anime background style, cream/dusty-pink/lavender/sage palette by day and indigo/mauve/amber by night; architecture and flowers frame a calmer center for text. No people, lettering, logos or watermarks.

| Scene | Prompt subject |
| --- | --- |
| profile-day | Covered garden veranda in warm morning light, flowering vines, distant hills and painted wood |
| profile-night | Moonlit garden veranda, indigo sky, lanterns and sparse fireflies |
| reading-day | Sunlit timber-window study, bookshelves, wooden desk, notebook and tea |
| reading-night | Warm lamplit study beside a moonlit flower garden |
| updates-day | Small garden post office at dusk, brass letter slots, envelopes, flowering vines |
| updates-night | Garden post office on a starry night, warm lanterns and indigo garden |

Original PNGs remain in `artwork/originals/scenes/` locally, outside the static export and ignored by Git. `manifest.json` maps each master to the two shipped assets. Desktop files are 1664×936 WebP; mobile variants use a 780×1100 crop. The six scenes have twelve WebP outputs totaling about 2.4 MB; only the current route, theme and viewport image is needed. Theme changes select the other scene. A static background remains when motion is disabled.

The existing first-paint opening and its original soundtrack are retained. The routing/particle framework continues to derive from XinghuisamaBlogs under the attribution and license in THIRD_PARTY_NOTICES.md. This extension adapts its BackgroundSlider crossfade concept, DailyBriefing reading-card layout and MomentList chronological text layout; it does not copy the original author's posts, paper notes, accounts or private settings.

## Owner-directed material and illustration revision

The owner rejected the first preview's opaque panels and sparse typography. `app/correspondence.css` now supplies a more translucent paper surface (roughly 72% base color, with local blur), an open editorial title area, serif paper titles and handwritten marginal notes. Search controls sit directly in the scene rather than inside another panel. Text color and surface contrast are verified separately; the illustrations remain visible through the content.

`components/SceneOrnaments.tsx` contains original inline SVG foreground drawings for the three new scenes: botanical branches, stars, butterflies, paper birds, book ribbons and postal forms. Journal emblems, bookmarks and cancellation marks are likewise original code-native SVG. They add no image requests, scripts or services. CSS rotates/scales/translates separate properties so the drawings retain their authored SVG placement. Motion-off and reduced-motion settings stop these added animations, and mobile omits the lower foreground drawing.

## Remaining route themes — 2026-10-29

Projects (including both detail routes) now use `projects-day/night`; the wall, login and owner page use `wall-day/night`; Contact uses `contact-day/night`. All share a continuous illustration through the page and footer. Fixed header images and the legacy contact body background were removed. Project cover images remain in the authenticated project cards.

The project pair reuses the original hero paintings. Wall day reuses the original sunset greenhouse; Contact day reuses the original seaside mailbox garden. Two new night edits were made with the built-in imagegen tool, preserving the original composition while changing light, sky and reflections. Original outputs are saved as `artwork/originals/scenes/wall-night.png` and `contact-night.png`; [the prompt set](../artwork/originals/scenes/route-night-prompts.json) records both requests. No API key or new image service is used by the website.

The six additional scene states have desktop/mobile WebPs in `public/images/scenes/`; mobile crops retain the greenhouse at the left or mailbox at the right. The complete twelve-state set has twenty-four WebPs totaling about5MB on disk. Requests load only the active route/theme/viewport; saved night preferences do not fetch day art first. PNG masters stay out of the export.
