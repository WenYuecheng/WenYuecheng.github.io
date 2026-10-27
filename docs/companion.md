# Personal website companion

The owner approved the pink, front-facing anime character with both hands supporting her cheeks and a pale-blue pen balanced above her pouted upper lip on 2026-10-27. This replaces the original CSS cat. The character is based loosely on user-provided personal photographs; those photographs are not copied into the public site.

## Artwork

- Original selected PNG: `artwork/originals/companion/pink-front-pen.png`.
- Website derivative: `public/images/companion/pink-front-pen.webp`, 640 × 640, with alpha, about 110 KB.
- Created using the built-in image generation tool. No external image service or key is needed at runtime.
- Final editing instruction: preserve the approved brown wavy bob, pink flower clip, brown eyes, pink shirt, front-facing hands-on-cheeks pose, two-dimensional linework and transparent background; place the intact blue pen horizontally under the nose and above the closed pouted lips, balanced on the protruded upper lip, with neither lip wrapping around the pen. No other changes.

The site renders this at 128 px on desktop and 96 px on phones. It has a gentle two-pixel breathing movement; the site motion switch and reduced-motion preference disable it.

## Interaction

`components/Companion.tsx` lives in the shared layout, so its position and current conversation survive internal navigation and language switches. Mouse, pen and touch use pointer capture. Movement over seven pixels becomes a drag and suppresses speech for that release. The character stays inside the viewport and is reclamped on resize. No drag location or interaction history is stored or sent to a server.

Enter/Space speak; arrow keys move; Shift + arrow moves farther; Home restores the default corner; Escape dismisses the bubble. The speech bubble chooses the available space above or below, stays horizontally inside the viewport and can scroll when needed.

## Sayings

`data/companion-quotes.ts` contains all 111 numbered entries from the four user-supplied sheets, including the alternative wording supplied in entry 34. Chinese wording is retained with normalized punctuation; English puns are adapted for readability. Each entry has matching one- or two-part Chinese and English text.

Each saying has an explicit editorial beat boundary, never a runtime split on question marks or commas. Single-beat lines remain intact. Setups and punchlines occupy two clicks even when there is no question: for example, “我变心了。” → “今天的我比昨天更喜欢你了。” and “我一点也不想你，” → “一点半再想。” English follows the same beat count. The next click always reveals the pending punchline before random selection resumes. The bubble hint says “Tap again for the next line” so it also fits declarative sayings. A hidden or timed-out bubble does not discard a pending answer. Random draws exclude the previous entry; they do not follow a fixed cycle. These are static text nodes, never interpreted as HTML.

The source describes 111 sayings but contains several multi-person exchanges. These are represented as setup plus punchline while preserving their text, rather than making the visitor click for each speaker.

No publication is authorized by this update. The local preview remains the review surface.
