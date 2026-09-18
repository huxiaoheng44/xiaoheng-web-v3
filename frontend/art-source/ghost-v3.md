# Round ghost v3

Built-in ImageGen generation and cleanup, based on the user's requested arcade ghost style: broad semicircular dome, straight sides, vertical dark eyes, simple three-lobe wavy skirt, no arms or shoulders. Prior versions remain available.

Generation prompt: create exactly 4x4 transparent sprites, a friendly white classic arcade maze ghost inspired by the Pac-Man silhouette but slightly more refined. Body about 24x26 logical pixels, dome radius about 11px; no pointed cap, side nubs, mouth, pupils, outlines, noise or background. Rows are idle/blink, movement with slight hem changes, looking left, looking right. Keep scale and baseline consistent.

Cleanup prompt: preserve the 16 round dome ghosts, straight sides, vertical eyes and three-lobe skirt. Remove scattered white splatter, artifacts, stray pixels and top spikes. Require smooth stepped semicircular domes and completely clean transparent alpha around each sprite.

Final regeneration uses a flat opaque magenta (#FF00FF) background instead of generated alpha, retaining the same round 24x26 ghost design and 4x4 animation layout. The processing script chroma-keys magenta before extracting each silhouette; this avoids the transparency artifacts present in the discarded attempts.

Original: `art-source/ghost-v3.png`. Runtime: `public/assets/ghost-sprites-v3.png`. Frames: 32x32 with a centered 24x26 silhouette, normalized using `scripts/prepare-ghost-v3.mjs`. Preview: `test-results/ghost-v3-preview.png`.
