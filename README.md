# XiaohengOS — portfolio with Monty

React/Vite portfolio plus a Python/FastAPI portfolio agent. The visitor-facing identity is **Monty**; the front-end module lives at `frontend/src/features/monty/`.

## What is shipped

- Semantic RAG over approved portfolio material and the GitHub allowlist `huxiaoheng44/xiaoheng-web-v3` at its current default-branch snapshot.
- A trusted Guide Planner: one registered `guideTo` target per turn, local off-screen direction hints, and visitor-controlled clicks and scrolling.
- Activity-safe SSE and Activity panel, DND, sleep/doze/wake visuals, and reduced-motion support.
- No browser-control capability: Monty never clicks, scrolls, navigates, opens windows, changes tabs, or types for a visitor.

## Privacy

Only a session-only semantic summary is sent: page/panel state, registered target IDs, semantic hover/dwell, explicit clicks, visibility, locale, DND and idle/proactive state. It never includes coordinates, mouse paths, DOM text, selectors, input text, prompt, hidden reasoning, token usage, or credentials.

## Run, index, and demo

Frontend (one terminal):

```powershell
cd frontend
npm ci
npm run dev
```

Backend (another terminal):

```powershell
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
python run.py index # current allowlisted source snapshot only
python run.py dev
```

GitHub refresh depends on API/network rate limits. DeepSeek requires local `backend/.env`; indexing is manual and never reads Git history or `.git` metadata.

1. Ask Monty to guide you to an AI project.
2. Wait for it to point at Projects; click and scroll only yourself.
3. Open the Activity gear to inspect safe state, actions, tools and sources.
4. Use Escape, End guide or DND to demonstrate safe control.

`artifacts/` is ignored. It contains regenerable build output, browser-test captures, test logs and temporary processing files; none are product assets.

## Verify

```powershell
cd frontend
npm run test
npm run build
cd ../backend
python run.py test
```

[Frontend details](frontend/README.md) · [Backend details](backend/README.md) · [Issue #1](https://github.com/huxiaoheng44/xiaoheng-web-v3/issues/1)

## Dependency layout

The frontend is an independent npm project: its manifest, lockfile, dependencies, and asset tooling live in `frontend/`. Run `npm ci` and npm scripts from `frontend/`. Run `python run.py dev|test|index|vectors|eval|smoke` from `backend/`. There is no root npm manifest, lockfile, or dependency directory. Shared `content/` remains at the root because both Vite and the Python backend read it.
