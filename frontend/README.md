# Frontend

Only browser-facing code lives here. `src/features/ghost` is the Ghost UI/controller,
not the LLM backend: it collects consented events, sends HTTP requests, renders chat,
and executes allowlisted UI actions. It never imports Python or reads backend/.env.

`src/content` renders reviewed data imported from `../content` at build time.
Images, PDF and video files are imported by Vite and emitted into the root `build/`.

Run `npm install` at the repository root, then root `npm run dev`, `npm run build`,
or `npm test`. Alternatively `npm run dev --workspace frontend`.

Local `/api` requests proxy to port 8000. For separate production hosting, set only
the public `VITE_GHOST_API_URL` in `frontend/.env`. Never put provider keys here.

Browser tests under `scripts/check-*.mjs` resolve the repository automatically and
save screenshots to root `test-results/`. They use mocks rather than paid model calls.
Asset-processing scripts resolve the frontend directory and preserve original art
under `art-source/`; runtime art is in `public/assets/`.
