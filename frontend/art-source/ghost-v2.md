# Ghost v2

Generated with built-in ImageGen using the user's small white arcade ghost as the visual reference. Source: `art-source/ghost-v2.png`. Runtime: `public/assets/ghost-sprites-v2.png`. Previous sheet is preserved.

Design prompt: create a 4x4 transparent sprite sheet of the reference-inspired compact white ghost, rounded stepped dome, two vertical black rectangular eyes, three-step short hem, tiny side protrusions, no pupils or mouth, no gray shading, chunky low-resolution square pixels. Rows: idle (including blink), move right, look left, point left. Keep scale and baseline consistent, no scene/text/grid/noise.

Cleanup prompt: preserve the exact 16 characters and their 4x4 registration; remove all scattered speckles, scratches and stray pixels; require clean transparent padding outside each flat-white silhouette and black eyes.

`scripts/prepare-ghost-v2.mjs` isolates each frame's largest connected alpha component, reduces it to black/white, and centers its silhouette in a 32px cell. Four rows and columns match existing behavior states. Runtime sheet: 128x128. Preview: `test-results/ghost-v2-preview.png`.
