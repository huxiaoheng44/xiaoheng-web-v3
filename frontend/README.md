# Monty frontend

`src/features/monty/` owns the semantic target registry, safe SSE rendering, local guidance, DND and Activity panel. Only registered, in-scope targets with declared capabilities can render; `guideTo` can use an off-screen guideable target and the browser computes direction locally.

The client sends a session-only semantic summary, never coordinates, paths, DOM text, selectors, input text, prompts, reasoning or tokens. It cannot execute navigation, scrolling, clicks, input, window opening or tab changes.

From `frontend/`, run `npm ci`, then `npm run dev`, `npm run test`, `npm run test:browser`, or `npm run build`. Asset tools live in `frontend/tooling/`; `npm run assets:monty` packs the Monty atlas. `npm run test:live-dnd` requires local DeepSeek configuration.