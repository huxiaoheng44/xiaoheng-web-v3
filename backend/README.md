# Ghost Agent backend

Run commands from the repository root. Python 3.12 is tested.

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
# Edit backend/.env locally: provider key and GHOST_MODEL.
backend/.venv/Scripts/python -m backend.app.knowledge.store
backend/.venv/Scripts/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

On macOS/Linux use `backend/.venv/bin/python`. Start the frontend with `npm run dev` in another terminal.
The Vite development proxy forwards `/api` to port 8000. No API key is required for
local animation or mocked tests. An unconfigured backend returns an explicit error;
there is no pretend/model-free answer fallback.

## Layers

- `app/schemas/contracts.py`: bounded, validated API contracts and action allowlists.
- `app/api/routes.py`: HTTP/SSE, session auth, cancellation and result/approval routing.
- `app/services/sessions.py`: in-memory, per-visitor state, TTL, duplicate-request and usage limits.
- `app/agent/graph.py`: LangGraph decision/tool cycle and bounded UI tool batches.
- `app/providers/chat.py`: OpenAI/DeepSeek SDK transport and parameter adaptation.
- `app/core/config.py`: backend-only environment configuration.
- `main.py`: thin ASGI entrypoint.
- `app/knowledge/store.py`: allowlisted public source ingestion and SQLite FTS5 retrieval.

Only the backend receives model credentials. The adapter uses streaming Chat
Completions tool calls. OpenAI uses `store=False`; DeepSeek uses its documented `max_tokens` and `thinking` options instead of unsupported OpenAI-only flags.
Use a model available to your account in `GHOST_MODEL`; no model name is silently assumed.

For DeepSeek set `GHOST_PROVIDER=deepseek`, `GHOST_BASE_URL=https://api.deepseek.com`,
`GHOST_MODEL=deepseek-flash` and `DEEPSEEK_API_KEY` in `backend/.env`.
`GHOST_THINKING=disabled` is the low-latency default; enable it explicitly if wanted.
The adapter retains DeepSeek reasoning protocol state server-side for tool continuations,
never in SSE messages. Provider parameters are tested separately.
A global `OPENAI_API_KEY` is never implicitly sent to DeepSeek. The old variable name
is accepted for DeepSeek only if explicitly present in this project's `.env` file.
The original key value is preserved when renaming it to `DEEPSEEK_API_KEY`.

## Knowledge

`content/profile.json` is the reviewed public resume; four paired `content/projects/` Markdown
files are allowlisted. `knowledge/*.md` is opt-in using `public: true` frontmatter.
Supplementary material is available to ALL visitors, not a private vault. Do not add
confidential information. Rebuild the index and restart after content changes.
Chinese segmentation uses jieba; title-weighted SQLite FTS5 searches return up to six
sections and the agent can read/search again. No vector service or embedding key is needed.

## API

`POST /api/session` returns an opaque bearer token. Keep it in browser memory only.
All other endpoints require `Authorization: Bearer <token>`.

- `POST /api/chat`: requestId, message, pageContext, companion, quiet, optional behavior.
- `POST /api/observe`: same body; without companion consent, returns silent done.
- `POST /api/runs/{id}/resume`: unique requestId, pending actionId, approved OR status,
  optional detail, and a fresh pageContext. Resume only after consuming the preceding stream.
- `POST /api/runs/{id}/cancel`: cancels pending actions/model generation.
- `DELETE /api/session`: removes application-side visitor state.
- `GET /api/health`: configuration status, never key contents.

SSE data objects: run, delta, status, source, approval, action, done, error. Actions must
be acknowledged; emitting an action never means it succeeded. The UI never evaluates
model scripts, URLs, or arbitrary selectors. Action IDs are idempotency boundaries.
Navigation from an unsolicited suggestion requires approval; explicit navigation
requests can execute directly. Each round allows at most six model decisions and
twelve UI actions. Model timeout: 30s, total stream invocation: 40s. The browser's
local actions are bounded; server action acknowledgement expires after 15s (approval: 5min).

## Privacy and deployment

Refresh creates fresh frontend state. Sessions idle out after 30 minutes and expire
absolutely after 2 hours; application memory is swept once a minute. No conversation or
pointer payload logging, external tracing, persistent visitor database or accounts.
Service-provider retention remains subject to its policies; no client setting is a
promise of zero provider retention. SQLite contains public knowledge only.

Deploy one Uvicorn worker/instance for this version (sessions and graph checkpoints are
in memory). Restarting loses active sessions gracefully; horizontal scaling needs a
shared expiring store before adding workers. Configure `GHOST_ALLOWED_ORIGINS` to exact
frontend origins, HTTPS, and a reverse proxy with a 64KiB body limit and per-IP rate
limits. The app also checks origin, body size, per-session rate and global model calls.
Do not trust spoofable forwarded-IP headers without configuring the trusted proxy.
Vite static hosting needs `/api` routing or public `VITE_GHOST_API_URL` set at build time.
Only this public URL belongs in frontend env; never `VITE_OPENAI_API_KEY`.

## Tests

```powershell
backend/.venv/Scripts/python -m pytest backend/tests -q
npm test
node frontend/scripts/check-agent.mjs
```

The browser test uses a local backend for session creation and mocks model-facing streams
including the offline error state, even if a real Key is configured. It never spends model credits. For a configured
backend use the optional `python -m backend.smoke` command; this explicitly makes one
paid model request through the local API and does not print credentials.

Known operational limit: knowledge accuracy must be reviewed with real queries after
choosing the actual model; mock tests verify control flow, not model factuality.
