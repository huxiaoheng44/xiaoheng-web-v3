# CRT.AGENT frontend

`src/features/crt-agent/` owns the semantic target registry, safe SSE rendering, local guidance, DND and Activity panel. Only registered, in-scope targets with declared capabilities can render; `guideTo` can use an off-screen guideable target and the browser computes direction locally.

The client sends a session-only semantic summary, never coordinates, paths, DOM text, selectors, input text, prompts, reasoning or tokens. It cannot execute navigation, scrolling, clicks, input, window opening or tab changes.

Run `npm run dev`, `npm run test --workspace frontend`, `npm run test:browser`, and `npm run build --workspace frontend`. `npm run test:live-dnd` requires local DeepSeek configuration.