# Monty backend

Run the commands below from `backend/`. Start the API with `python run.py dev`; run tests with `python run.py test`. The launcher uses `backend/.venv` automatically.

## Local vector retrieval

Install `backend/requirements.txt` in `backend/.venv`, then run `python run.py vectors` to add vectors to an existing knowledge database without changing its source snapshot. If no database exists, this command builds the local public portfolio index. `python run.py index` refreshes local portfolio pages **and** the allowlisted GitHub snapshot and builds both keyword and vector indexes. A full rebuild is published atomically; failed embedding/download operations leave the previous database intact.

The CPU encoder is the quantized ONNX export of multilingual E5 small, loaded with FastEmbed, mean pooling, normalization, and the required `query:` / `passage:` prefixes. Its model revision and preprocessing format are pinned in code. Initial indexing downloads about 118 MB of model weights plus tokenizer files; later inference uses the persistent local cache. Queries are not sent to Hugging Face or an embedding API. The existing chat provider still receives retrieved evidence as before. No GPU, vector service, or extra API key is required.

Passages use overlapping token windows that fit the 512-token model limit. SQLite stores float32 vectors, source records, and model/corpus metadata. Exact cosine search is appropriate for this small corpus; BM25 and dense rankings are combined with reciprocal-rank fusion, bilingual duplicates are removed, and result diversity is limited to two chunks per source/project. Existing curated topic summaries remain useful for broad category requests. Semantic project descriptions also produce candidate choices before navigation; similarity scores are not confidence probabilities, and visitors still select the project.

Persist `backend/data/` (or configure `MONTY_EMBEDDING_CACHE` for model files) on the deployment host. Run indexing during deployment before restarting the backend. Do not point the current encoder at an arbitrary model: changing the encoder requires a matching implementation and reindex. Missing, stale, or incompatible vectors fall back to keyword evidence; embedding failures have a 30-second retry delay. `/api/health` exposes `retrieval.mode` and `retrieval.vectors`, so a fallback is observable. `pending` means the process has not performed its first retrieval yet.

Run `python run.py eval` after indexing. It checks eight real-model bilingual paraphrases using dense-only and hybrid top-three recall, plus two actual API suggestion flows, and writes `artifacts/retrieval-eval.json`. These hand-curated checks are a regression set, not a general retrieval-quality guarantee. Normal backend tests use deterministic injected encoders and make no model downloads.

Implementation references: [FastEmbed retrieval](https://qdrant.github.io/fastembed/qdrant/Retrieval_with_FastEmbed/), [E5 technical report](https://arxiv.org/abs/2402.05672), [ONNX model export](https://huggingface.co/Xenova/multilingual-e5-small/tree/761b726dd34fb83930e26aab4e9ac3899aa1fa78).

FastAPI provides session-scoped SSE, public semantic RAG and a trusted Guide Planner that emits one validated `guideTo` target or an explicit finish. The client stays authoritative for target availability and all page actions.

`python run.py index` refreshes the public project pages in `content/html/en/` and `content/html/zh/`, plus the current default-branch snapshot of allowlisted `huxiaoheng44/xiaoheng-web-v3`. Each project page contributes an overview chunk and one chunk per `h2`; navigation pages and binary attachments are excluded. GitHub indexing excludes `.git`/history, secrets, `.env`, dependencies, virtual environments, build/cache/database output, locks/generated and binary/media files. Source chunks are untrusted retrieval data and GitHub evidence uses `/blob/<branch>/<path>` links.

Requests never contain coordinates, paths, DOM/selector text, input text, prompts, hidden reasoning or tokens. The backend cannot request navigation, scroll, click, input, window opening or tab changes. DND suppresses proactive messages only. Configure DeepSeek in `backend/.env`; production needs exact CORS, HTTPS/reverse proxy and GitHub API rate-limit handling.


Monty history is a client-side log of the current page session. Closing its desktop window preserves messages; refreshing or clearing the session removes them. It includes public sources, tool activity, and guide steps, never private model reasoning.

`MONTY_SESSION_OUTPUT_TOKENS` defaults to 300000 reply tokens per backend session (input tokens are excluded; generated reasoning tokens count as output). Each model call reserves up to `MONTY_MAX_TOKENS`, capped by the session balance. Provider-reported completion usage settles the reservation. If usage is absent or the stream is cancelled, the full reservation is conservatively charged and the UI marks the balance as approximate. Deterministic navigation consumes no model tokens. This is a local allowance, not the provider account balance. Existing IP request rates and global call limits still apply. Budgets are in memory per process, reset with session/process lifecycle, and do not establish a shared cross-worker or per-IP token pool.
