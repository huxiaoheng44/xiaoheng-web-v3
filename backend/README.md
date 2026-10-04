# CRT.AGENT backend

FastAPI provides session-scoped SSE, public semantic RAG and a trusted Guide Planner that emits one validated `guideTo` target or an explicit finish. The client stays authoritative for target availability and all page actions.

`npm run backend:index` refreshes the public project pages in `content/html/en/` and `content/html/zh/`, plus the current default-branch snapshot of allowlisted `huxiaoheng44/xiaoheng-web-v3`. Each project page contributes an overview chunk and one chunk per `h2`; navigation pages and binary attachments are excluded. GitHub indexing excludes `.git`/history, secrets, `.env`, dependencies, virtual environments, build/cache/database output, locks/generated and binary/media files. Source chunks are untrusted retrieval data and GitHub evidence uses `/blob/<branch>/<path>` links.

Requests never contain coordinates, paths, DOM/selector text, input text, prompts, hidden reasoning or tokens. The backend cannot request navigation, scroll, click, input, window opening or tab changes. DND suppresses proactive messages only. Configure DeepSeek in `backend/.env`; production needs exact CORS, HTTPS/reverse proxy and GitHub API rate-limit handling.
