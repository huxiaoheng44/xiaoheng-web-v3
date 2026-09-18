# Asset provenance and regeneration

Generated using the built-in ImageGen tool, then processed by `scripts/prepare-assets.mjs` into nine grayscale values and binary alpha using nearest-neighbor sampling. Originals are retained in this folder; runtime assets are in `public/assets/`.

| Asset | Runtime grid | Purpose |
| --- | --- | --- |
| monitor.png | 192 × 192 | Horizontally centered monitor, independent screen overlay |
| keyboard.png | 160 × 53 | Independently positioned keyboard |
| mouse.png | 36 × 36 | Independently positioned mouse |
| mug.png | 40 × 40 | Independently positioned water mug |
| ghost-sprites.png | 192 × 192 | 4 × 4 sheet, each frame 48 × 48 |

Ghost rows: idle, move, look, point. Four frames per row; idle includes a blink. `src/GhostOverlay.tsx` maps local behavior to these rows. Sprite generation can vary frame silhouettes slightly; originals permit further art direction without changing the interaction code.

## Prompt set

Monitor: SINGLE ISOLATED OBJECT ASSET: front-facing old CRT computer monitor only, transparent background, NO OTHER OBJECTS. Big chunky pixel art, deliberately extremely low resolution appearance: imagine drawn on a 160 by 128 pixel canvas then enlarged 8x NEAREST NEIGHBOR. Every pixel cluster visibly large and square, NO fine texture NO grain NO smooth gradients NO antialiasing. Only 6 grayscale colors. Thick charcoal gray CRT bezel with blocky light gray patches, front-on symmetrical straight rectangular screen pure solid black, screen has no reflections no UI no writing. Tiny power button bottom right bezel, minimal foot integrated at base. Object fills 90% of canvas centered. Exact rectangular screen opening occupying x=14% to 86%, y=14% to 78% of total canvas. Retro DOS adventure game inventory sprite. Transparent alpha outside monitor. No keyboard, mouse, plants, desk or cables. 1024x1024.

Keyboard: SINGLE ISOLATED OBJECT ASSET on genuine transparent background: one vintage gray mechanical computer keyboard, front view with slight top-down perspective, long horizontal body with black chunky keycaps and a numpad on right. Big coarse square pixel art drawn as if on a 160x48 pixel grid and enlarged nearest neighbor, each pixel BIG, no tiny detail, no fine grain, no smooth shading, only 6 grayscale values. Simplified keycaps no legible letters. Object centered fills 90% width. NO other objects, no monitor, no mouse, no desk, no background, no drop shadow outside object. Production game sprite consistent with chunky grayscale 1990s CRT monitor. Wide landscape image.

Mouse: SINGLE ISOLATED OBJECT game sprite: one vintage gray two-button computer mouse, slight top-down front three-quarter view, no cable. Genuine transparent alpha background. VERY COARSE chunky monochrome pixel art like 32x40 logical pixels enlarged nearest neighbor. Huge obvious square pixels, only black and 5 gray shades, no grain, no antialiasing, no smooth lighting. Mouse fills center 70% of square canvas. No other objects, no text, no floor, no cast shadow outside silhouette. Match old pixel adventure game aesthetic.

Mug: SINGLE ISOLATED OBJECT game sprite: one plain gray ceramic water mug with handle on RIGHT, front-facing slightly seeing oval opening on top. Genuine transparent background alpha. EXTREMELY CHUNKY monochrome pixel art, draw like 40x48 logical pixel grid enlarged nearest-neighbor with big visible square pixels. Only 6 grayscale colors, simple angular shading, NO grain or fine details or gradients or antialiasing. No steam, no text, no logo, no coaster, no other objects, no desk, no shadow outside object. Object centered fills 80% square canvas. Retro DOS point-and-click inventory sprite.

Ghost: Production pixel-art sprite sheet, TRUE transparent background, 1024x1024 square. EXACTLY 4 columns and 4 rows in a perfectly regular grid of 256x256 cells, 16 separate sprites. Same ORIGINAL cute white ghost in each cell, centered at same size and baseline, each ghost fits inside center 160x160 of its cell with generous transparent padding. Design: tiny rounded white bedsheet-like ghost, square black eyes with white highlight, short wavy tail, subtle gray pixel shading, no mouth except small expression. Chunky low-resolution 1-bit/4-tone monochrome pixel art with hard edges, NO smooth rendering. Row 1 four idle frames with tiny tail changes, third frame eyes closed blinking. Row 2 four move frames leaning RIGHT with tail trailing left. Row 3 four look frames looking LEFT and curious. Row 4 four point frames short arm pointing LEFT. All same silhouette volume, same camera, consistent alignment. NO labels, NO grid lines, NO shadows outside sprite, NO text, NO background or checkerboard. Transparent production sprite sheet.
