# Vercel AI SDK Ideas

## Current usage

- The app currently uses the Vercel AI SDK in a focused way:
  - `useChat` on the client
  - `DefaultChatTransport` for the chat request
  - `streamText` on the server
  - server-side `tool()` definitions for files and sources
- Supabase auth, prompt assembly, file versioning, and project data access are custom app code, which is appropriate.

## Gaps worth revisiting

### 1. Multi-step tool loops

- The current chat route uses `streamText`, but it does not explicitly enable stronger multi-step tool execution.
- For this product, flows like `search_sources -> read_source -> answer` and `read_file -> edit_file -> summarize` would benefit from a fuller loop.

### 2. Conversation persistence

- The schema already includes `conversations` and `messages`, but the current app flow does not appear to persist chat history through those tables.
- The AI SDK has a clean message persistence pattern that would map well to the existing schema.

### 3. Citations and streamed source context

- The product plan mentions citations, but the current chat UI does not stream or render source parts yet.
- AI SDK UI message streaming could be used to surface file/source references more cleanly.

### 4. Semantic retrieval

- The database schema already supports embeddings and vector search via `source_chunks.embedding` and `match_source_chunks(...)`.
- The current app still uses keyword `textSearch(...)`.
- AI SDK embedding helpers could support a better retrieval layer.

### 5. Safer file edits

- `edit_file` currently executes immediately.
- AI SDK tool approval patterns could add an approval step before agent writes.

### 6. Message validation and metadata

- The server currently accepts UI messages in a very loose way.
- `validateUIMessages` would make tool-calling chat more robust.
- Message metadata could later expose model, token, or timing details in a structured way.

## Priority

### Necessary soon

- multi-step tool execution
- chat persistence
- semantic retrieval
- citations/source streaming
- edit approval

### Helpful later

- resumable streams
- message metadata
- `ToolLoopAgent`
- AI Gateway/provider routing
- structured outputs for ingestion and extraction flows