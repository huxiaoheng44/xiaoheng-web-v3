# XiaohengOS — portfolio with CRT.AGENT

React/Vite portfolio plus a Python/FastAPI portfolio agent. The visitor-facing identity is **CRT.AGENT**; the front-end module lives at `frontend/src/features/crt-agent/`.

## What is shipped

- Semantic RAG over approved portfolio material and the GitHub allowlist `huxiaoheng44/xiaoheng-web-v3` at its current default-branch snapshot.
- A trusted Guide Planner: one registered `guideTo` target per turn, local off-screen direction hints, and visitor-controlled clicks and scrolling.
- Activity-safe SSE and Activity panel, DND, sleep/doze/wake visuals, and reduced-motion support.
- No browser-control capability: CRT.AGENT never clicks, scrolls, navigates, opens windows, changes tabs, or types for a visitor.

## Privacy

Only a session-only semantic summary is sent: page/panel state, registered target IDs, semantic hover/dwell, explicit clicks, visibility, locale, DND and idle/proactive state. It never includes coordinates, mouse paths, DOM text, selectors, input text, prompt, hidden reasoning, token usage, or credentials.

## Run, index, and demo

```powershell
npm install
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
npm run backend:index # current allowlisted source snapshot only
npm run backend:dev
npm run dev
```

GitHub refresh depends on API/network rate limits. DeepSeek requires local `backend/.env`; indexing is manual and never reads Git history or `.git` metadata.

1. Ask CRT.AGENT to guide you to an AI project.
2. Wait for it to point at Projects; click and scroll only yourself.
3. Open the Activity gear to inspect safe state, actions, tools and sources.
4. Use Escape, End guide or DND to demonstrate safe control.

`artifacts/` is ignored. It contains regenerable build output, browser-test captures, test logs and temporary processing files; none are product assets.

## Verify

```powershell
npm run test:browser
npm run test --workspace frontend
npm run backend:test
npm run build --workspace frontend
git diff --check HEAD
```

[Frontend details](frontend/README.md) · [Backend details](backend/README.md) · [Issue #1](https://github.com/huxiaoheng44/xiaoheng-web-v3/issues/1)
