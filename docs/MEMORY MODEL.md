This file is inspiration for our app's memory model.

### Memory Layer (Foundation)

project_files table (supabase):

### Hooks (Context Persistence)

Three lifecycle hooks in the app:

- **SessionStart** (`session-start-context.py`): Reads SOUL.md + USER.md + MEMORY.md + recent daily logs → injects into conversation context
- **PreCompact** (`pre-compact-flush.py`): Before auto-compaction, reads JSONL transcript → extracts key decisions/facts → appends to daily log
- **SessionEnd** (`session-end-flush.py`): On session end, saves conversation context to daily log

### Memory Search (Hybrid RAG)

Pipeline: Markdown files → chunking (~400 tokens, overlapping) → FastEmbed ONNX (all-MiniLM-L6-v2, 384-dim) → index → hybrid merge (0.7 vector + 0.3 keyword)

- **SQLite**: sqlite-vec for vectors, FTS5 for keywords
- **Postgres**: pgvector for vectors, tsvector+GIN for keywords
- Key files: `db.py` (abstraction), `embeddings.py`, `memory_index.py`, `memory_search.py`
- Incremental: only changed files re-indexed