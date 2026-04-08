# AI Project Advisor - v1 Technical Specification

## What This Is

A web app where non-technical users chat with an AI project advisor that maintains persistent, structured memory about their project. The user sees a SaaS workspace with chat, files, and sources. Under the hood, each project has a virtual filesystem of Markdown documents backed by Supabase, and the agent reads and writes those files with the same minimal tool set it would use in Codex or Cursor.

## The Core Translation Problem

In the current harness (leadabeelity), the agent runs in Codex/Cursor and directly edits `.md` files on disk. It uses a minimal, generic tool set: read file, edit file, create file, list files. Those same tools work on any file — `PROJECT.md`, `WORK.md`, `memory/2026-04-08.md`, or a custom `reporting.md` the user created.

The web app should preserve that model exactly. Each project has a virtual filesystem of Markdown documents stored as rows in a single `project_files` table. The agent gets the same generic file tools. Users can create their own files for whatever their project needs.


| Harness                              | Web app equivalent                                 |
| ------------------------------------ | -------------------------------------------------- |
| `AGENTS.md`                          | System prompt + `projects.agent_instructions`      |
| `USER.md`                            | `users` + `project_members` rows                   |
| `PROJECT.md`                         | `project_files` row, path = `PROJECT.md`           |
| `PRODUCT.md`                         | `project_files` row, path = `PRODUCT.md`           |
| `WORK.md`                            | `project_files` row, path = `WORK.md`              |
| `memory/2026-04-08.md`               | `project_files` row, path = `memory/2026-04-08.md` |
| `documents/`, `emails/`, `meetings/` | `source_materials` + Supabase Storage              |
| Any user-created file                | `project_files` row, user-chosen path              |


The distinction: **project files** are Markdown documents the agent and user read/write (the workspace). **Source materials** are uploaded binary files (PDFs, DOCX, .eml) that go through the ingestion pipeline.

## How The Agent Works

### Agent Runtime

The agent is an LLM invoked server-side via the Vercel AI SDK. Each chat turn:

1. Backend assembles a system prompt from project state (replaces reading `AGENTS.md` + `USER.md` + `PROJECT.md` etc.)
2. Backend retrieves relevant source chunks via vector search
3. LLM receives the system prompt, retrieved context, conversation history, and a set of tools
4. LLM responds, optionally calling tools to read or write project data
5. Write operations save directly to the database

### Agent Tools

The tool set is intentionally minimal and generic, mirroring Codex/Cursor's approach. The same tools work regardless of what files exist in the project.


| Tool             | What it does                                         |
| ---------------- | ---------------------------------------------------- |
| `list_files`     | List all project files (paths and titles)            |
| `read_file`      | Read the content of a project file by path           |
| `edit_file`      | Create or update a project file by path              |
| `search_sources` | Vector search across ingested source material chunks |
| `read_source`    | Read full content of an ingested source material     |


That's it. Five tools. The agent uses `edit_file` for everything — updating `PROJECT.md`, appending to `memory/2026-04-08.md`, creating a new `reporting.md`. There are no domain-specific write tools. Decisions, tasks, and follow-ups are just content inside whichever file the agent or user decides to put them in, exactly like the harness.

All writes save directly. A new `project_file_versions` row is created on every edit, providing version history as an undo safety net.

### Context Assembly (Replaces Session Bootstrap)

In the harness, every session starts by reading 6 files. In the web app, the backend assembles equivalent context on every chat turn:

```
system_prompt = [
  project.agent_instructions,           // ≈ AGENTS.md
  user.profile + member.role,            // ≈ USER.md
  read_file("PROJECT.md"),               // ≈ PROJECT.md
  read_file("WORK.md"),                  // ≈ WORK.md
  latest memory/* files,                 // ≈ memory/*.md
  list of all project file paths,        // so the agent knows what exists
]
```

This is assembled fresh per request. No session state to lose. The agent can then call `read_file` for any other file it needs during the conversation.

## Data Model

### Supabase Postgres

Confirmed implementation target for the initial build: Supabase project `faqtckftiusdgyghwcar`.

```
auth.users
  managed by Supabase Auth

profiles
  id, email, name, avatar_url, created_at

workspaces
  id, name, owner_id, created_at

workspace_members
  workspace_id, user_id, role

projects
  id, workspace_id, name, agent_instructions, created_at

project_members
  project_id, user_id, role

project_files
  id, project_id, path, content, updated_by, updated_at, created_at

project_file_versions
  id, project_file_id, content, version, edited_by, created_at

conversations
  id, project_id, user_id, title, created_at

messages
  id, conversation_id, role, content, tool_calls, citations, created_at

source_materials
  id, project_id, type (document|email|meeting|note),
  title, raw_storage_path, parsed_content,
  summary, metadata, status (processing|ready|failed),
  uploaded_by, created_at

source_chunks
  id, source_material_id, content, embedding, chunk_index, metadata

activity_events
  id, project_id, event_type, summary, actor_id, target_type, target_id, created_at
```

Use `auth.users` for identity and a `public.profiles` table for app-level user data. `profiles.id` should be a 1:1 foreign key to `auth.users.id`, so auth remains managed by Supabase while the app keeps its own profile metadata and joins cleanly against membership and activity tables.

`project_files` is the core table. It replaces separate artifacts, decisions, tasks, and memory tables. A project might contain:

```
PROJECT.md          — project facts, scope, people, risks
WORK.md             — current focus, next steps, blockers
PRODUCT.md          — product thinking, decisions, trade-offs
memory/2026-04-08.md — today's session notes
reporting.md        — user-created, specific to this project
decisions.md        — user-created, if they want a dedicated decisions log
```

Default files are created when a project is set up. Users and the agent can create new files at any time.

### Supabase Storage

- Private `sources` bucket
- Private `exports` bucket
- `sources/{project_id}/{source_material_id}/original.*` — raw uploaded file
- `sources/{project_id}/{source_material_id}/attachments/*` — extracted attachments
- `exports/{project_id}/*` — generated exports

### Supabase Vector Search

- `source_chunks.embedding` should use `vector(1536)` for compatibility with `text-embedding-3-small`
- `source_chunks.embedding` should have a pgvector index for similarity search
- queried during chat to retrieve relevant source context

### Schema Rules For v1 And Beyond

These are implementation constraints, not optional suggestions. Another agent should treat them as the default architecture for v1.

- All schema changes should be applied through Supabase migrations, not ad hoc SQL edits in production.
- Use `gen_random_uuid()` primary keys unless a table has a strong reason to use another key shape.
- Add `created_at default now()` to all app tables and `updated_at default now()` to mutable tables.
- Add a shared trigger to keep `updated_at` current on mutable tables such as `profiles`, `workspaces`, `projects`, `project_files`, `source_materials`, and any future editable metadata tables.
- Add unique constraints on membership tables to prevent duplicate rows, for example `(workspace_id, user_id)` and `(project_id, user_id)`.
- Add unique constraints where path or version identity matters, especially `(project_id, path)` on `project_files` and `(project_file_id, version)` on `project_file_versions`.
- Add foreign keys with clear delete behavior. Use cascading deletes for strictly dependent records like `project_file_versions`, `messages`, and `source_chunks`; use restrictive behavior where deleting a parent would be unsafe.
- Add indexes for expected high-volume access paths, especially foreign keys, `project_files(project_id, path)`, `messages(conversation_id, created_at)`, `activity_events(project_id, created_at)`, and `source_materials(project_id, created_at)`.
- Keep the schema normalized enough for future v2/v3 features. Do not collapse memberships, conversations, files, versions, sources, and activity into JSON blobs just because v1 is smaller.
- Use `jsonb` only for flexible metadata fields such as `source_materials.metadata`, `source_chunks.metadata`, `messages.tool_calls`, and `messages.citations`, with the core relational structure kept in first-class columns.
- Plan for future partitioning or archive strategies by keeping large append-heavy tables (`messages`, `activity_events`, `project_file_versions`, `source_chunks`) narrow, indexed by project-scoped access paths, and free of avoidable duplication.

## Frontend

### Stack

Next.js + TypeScript + Tailwind. Standard SaaS layout.

### Layout

```
┌─────────────────────────────────────────────────┐
│  Workspace switcher / header                    │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │  Main content area                   │
│          │                                      │
│ Projects │  - Chat (default view)               │
│ Files    │  - File viewer/editor                │
│ Sources  │  - Source detail                     │
│ Search   │                                      │
│ Activity │                                      │
│ Settings │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

### Key Views

**Chat** — main interaction surface. Messages stream via the Vercel AI SDK `useChat` hook. Citations render as clickable references that open the source or file view. When the agent edits files, an inline note shows what changed.

**Files** — browsable list of all project Markdown files. Each file is viewable and editable. Users can create new files. The agent also creates and edits files during chat. Version history is available per file.

**Sources** — browsable list of uploaded materials, grouped by type (documents, emails, meetings). Each item shows title, upload date, processing status, summary, and metadata.

**Search** — unified search across project files and ingested source material. Queries both `project_files` content (text match) and `source_chunks` (vector search). Results link to the matching file or source.

**Activity** — chronological feed of project events: uploads, chat sessions, file edits, source ingestion completions.

## Backend

### Stack

Next.js API routes + Vercel AI SDK + Supabase client. No separate backend service for v1.

### Core Flows

**Chat flow:**

1. Client sends message via `useChat`
2. API route loads project context (system prompt assembly)
3. API route queries `source_chunks` for relevant retrieval context
4. Calls LLM with tools via Vercel AI SDK `streamText`
5. LLM streams response, optionally calling tools
6. Tool results are executed server-side against Supabase
7. Response streams back to client with citations

**Ingestion flow:**

1. Client uploads file to Supabase Storage via signed URL
2. `source_materials` row created with status = `processing`
3. Background job (Supabase Edge Function or similar) picks up the job:
  - extracts text and metadata
  - normalizes content (especially for emails and HTML)
  - generates summary via LLM
  - chunks content and generates embeddings
  - writes `source_chunks` rows
  - updates status to `ready`
4. Optionally, a second pass updates project files (e.g. appends to `WORK.md` or `memory/*.md`) based on extracted content

**Agent write flow:**

1. Agent calls `edit_file` with a path and new content
2. Backend creates a `project_file_versions` row (preserving history), then upserts `project_files`
3. An `activity_events` row is logged
4. Client shows an inline confirmation of what changed

## Ingestion Pipeline

### Supported Input Types (v1)


| Input              | Processing                                                                            |
| ------------------ | ------------------------------------------------------------------------------------- |
| PDF                | Text extraction, chunking, summary                                                    |
| DOCX               | Text extraction, chunking, summary                                                    |
| Markdown           | Direct parse, chunking, summary                                                       |
| Plain text         | Direct parse, chunking, summary                                                       |
| `.eml` / email     | Parse headers, clean body (strip HTML), extract attachments, thread grouping, summary |
| Meeting transcript | Parse, chunking, summary, decision/task extraction                                    |


### Processing Steps

1. Store raw original in Supabase Storage
2. Extract text and metadata (server-side, Edge Function)
3. Clean and normalize (especially email HTML)
4. Generate summary via LLM
5. Chunk content (fixed-size with overlap, or semantic)
6. Generate embeddings per chunk (OpenAI or similar)
7. Store chunks + embeddings in `source_chunks`
8. Optionally update project files with extracted facts, decisions, and follow-ups

## Auth And Multi-Tenancy

- Supabase Auth for login (email/password + OAuth)
- Use `auth.users` for authentication and `profiles` for application user data
- Create a profile row automatically when a new auth user is created
- Row-level security on all tables scoped to workspace membership
- Project-level roles: owner, editor, viewer
- All retrieval and agent tool calls filtered by project scope
- Storage access for `sources` and `exports` must also be protected by project/workspace-aware policies, not just table RLS
- Prefer policy logic that resolves access through membership tables so v2/v3 permission changes can extend the model without a schema rewrite

## Intentionally Deferred

- **Review flow for agent writes** — the PRD envisions a propose-review-confirm cycle for durable updates. For v1, the agent writes directly. Version history on project files provides an undo safety net. Review can be layered on later without changing the data model.

## Out Of Scope For v1

- Autonomous background agent runs (agent only acts during chat)
- Real-time multiplayer editing
- External integrations beyond file upload
- Mobile app
- Custom agent instructions per user (single project-level config)
- Git-based versioning

## Open Technical Questions

- How large can the assembled system prompt get before we need smarter context selection?
- Should the ingestion pipeline update project files automatically, or only when the user asks in chat?
- What is the right chunking strategy for mixed-format project materials?
- How do we handle concurrent file edits from multiple users plus the agent?
- When should we introduce a review step for agent writes? (intentionally deferred from v1)
- Should new projects come with a fixed set of default files, or let the user pick a template?

