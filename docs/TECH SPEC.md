# AI Project Advisor - v1 Technical Specification

## What This Is

A web app where non-technical users chat with an AI project advisor that maintains persistent, structured memory about their project. The user sees a SaaS app with chat, files, and sources. Under the hood, each project has a virtual filesystem of Markdown documents backed by Supabase, and the agent reads and writes those files with the same minimal tool set it would use in Codex or Cursor.

## The Core Translation Problem

In the current harness (leadabeelity), the agent runs in Codex/Cursor and directly edits `.md` files on disk. It uses a minimal, generic tool set: read file, edit file, create file, list files. Those same tools work on any file — `PROJECT.md`, `WORK.md`, `memory/2026-04-08.md`, or a custom `reporting.md` the user created.

The web app should preserve that model exactly. Each project has a virtual filesystem of Markdown documents stored as rows in a single `project_files` table. The agent gets the same generic file tools. Users can create their own files for whatever their project needs.


| Harness                              | Web app equivalent                                 |
| ------------------------------------ | -------------------------------------------------- |
| `AGENTS.md`                          | System prompt + `project_settings` row             |
| `USER.md`                            | `users` + `project_members` rows                   |
| `PROJECT.md`                         | `project_files` row, path = `PROJECT.md`           |
| `PRODUCT.md`                         | `project_files` row, path = `PRODUCT.md`           |
| `WORK.md`                            | `project_files` row, path = `WORK.md`              |
| `memory/2026-04-08.md`               | `project_files` row, path = `memory/2026-04-08.md` |
| `documents/`, `emails/`, `meetings/` | `source_materials` + Supabase Storage              |
| Any user-created file                | `project_files` row, user-chosen path              |


The distinction: **project files** are Markdown documents the agent and user read/write (the project's working memory). **Source materials** are uploaded binary files (PDFs, DOCX, .eml) that go through the ingestion pipeline.

## Knowledge Layers

The project knowledge base has three distinct layers with different ownership:

**Raw sources** — uploaded files in Supabase Storage (`source_materials`). Immutable once ingested. The agent reads but never modifies them.

**Wiki (project files)** — the agent-maintained synthesis layer. Markdown files in `project_files` that the agent creates and updates as it processes sources and handles conversations. This is the compiled, cross-referenced knowledge base — not a RAG index, but a persistent, compounding artifact. The agent is the primary author of this layer; users can also create and edit files here.

**Project settings (instruction layer)** — structured configuration that tells the agent how to operate on this project. The user owns and evolves this layer. This is *not* a single text blob — it is a set of structured fields stored in the `project_settings` table, surfaced as a proper settings UI.

The agent is expected to proactively create new wiki pages as part of its normal operation — during ingestion, during chat when a synthesis is worth preserving, or when an entity accumulates enough references to warrant its own page. This is the default behavior; the user controls how much autonomy the agent has via project settings, not whether it can create files at all.

This separation matters for user trust. Users configure settings, the agent maintains the wiki, users upload the sources. In the UI, agent-created files should be visually distinguished from user-created ones.

### What Project Settings Cover

These are things the agent genuinely cannot know or infer — only the user can provide them.

**Interaction style**

- Tone of voice — formal (client-facing) vs. internal/conversational
- Output verbosity — concise summaries vs. detailed breakdowns
- Default format — prose, bullets, tables, structured sections
- Proactivity — should the agent suggest changes unprompted, or only respond when asked?
- Language / locale

**Project identity and relationships**

- Who is the client, who is the team — "Samsung is our client, we are the agency" cannot be inferred from a transcript where both sides are talking
- Organizational hierarchy — who approves decisions, who is a stakeholder vs. a decision-maker
- Sensitive topics — people to treat carefully, competitors never to name in outputs, politically loaded subjects
- Source trust levels — a signed-off brief carries more weight than a casual Slack message

**Terminology (glossary)**

- Project-specific shorthand and jargon — what "WBS", "the hub", "validation" mean on this specific project
- Branded terminology — always say "the engagement" not "the project", say "deliverable" not "output"
- What counts as a decision vs. a discussion point
- What counts as a blocker vs. a risk

**Agent permissions**

- Auto-write vs. propose — should the agent update `decisions.md` automatically after ingesting a meeting, or surface a proposal for review first?
- Entity page creation — should the agent silently create `stakeholders/samsung-design-team.md`, or ask?
- Locked files — files the agent can read but never edit
- Ingestion behavior — auto-synthesize everything, or wait for the user to trigger wiki updates?

### Implementation

Project settings are stored as structured columns in a `project_settings` table (one row per project), not as a markdown file. The backend serializes relevant settings into the system prompt on each chat turn. The frontend renders them as a proper settings panel with dropdowns, toggles, and structured fields — not a text editor.

The glossary is a special case: it is stored as a `project_files` row (`glossary.md`) so the agent can read and update it with the same file tools, but the frontend renders it as an editable table UI, not a raw markdown file.

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


That's it. Five tools. The agent uses `edit_file` for everything — updating `PROJECT.md`, appending to `memory/2026-04-08.md`, creating a new `reporting.md`, filing a synthesized answer as a new wiki page. There are no domain-specific write tools. Decisions, tasks, and follow-ups are just content inside whichever file the agent or user decides to put them in, exactly like the harness.

All writes save directly. A new `project_file_versions` row is created on every edit, providing version history as an undo safety net.

### Wiki Lint Operation

Periodically (or on user request), the agent performs a health check on the project wiki using the same five tools above:

- **Stale content** — files that reference dates, deadlines, or statuses that are now outdated
- **Contradictions** — conflicting claims across files (e.g. a decision in `decisions.md` contradicted by a newer meeting summary)
- **Orphan pages** — files with no inbound references from other project files
- **Missing entity pages** — people, clients, or systems that appear frequently across sources but lack their own page
- **Index gaps** — files present in `project_files` but missing from `index.md`

This is a workflow, not a separate tool. The agent reads `index.md`, traverses relevant files, and produces a lint report — then either proposes fixes or makes them directly depending on project settings.

### Context Assembly (Replaces Session Bootstrap)

In the harness, every session starts by reading 6 files. In the web app, the backend assembles equivalent context on every chat turn:

```
system_prompt = [
  project_settings.*,                    // ≈ AGENTS.md — structured tone, permissions, context
  read_file("glossary.md"),              // project terminology injected into every turn
  user.profile + member.role,            // ≈ USER.md
  read_file("PROJECT.md"),               // ≈ PROJECT.md
  read_file("WORK.md"),                  // ≈ WORK.md
  latest memory/* files,                 // ≈ memory/*.md
  read_file("index.md"),                 // catalog of all wiki pages with summaries
]
```

This is assembled fresh per request. No session state to lose. The agent reads `index.md` to understand what wiki pages exist and what each contains, then calls `read_file` for whichever files are relevant to the current conversation — rather than loading all file paths and reading blindly.

`index.md` replaces the raw file path list in context. It is more useful than a bare path list because it carries one-line summaries per file, organized by category, so the agent can navigate efficiently as the project grows to 20+ files.

## Data Model

### Supabase Postgres

Confirmed implementation target for the initial build: Supabase project `faqtckftiusdgyghwcar`.

```
auth.users
  managed by Supabase Auth

profiles
  id, email, name, avatar_url, created_at

projects
  id, owner_id, name, created_at

project_settings
  project_id (PK, FK projects),
  tone (formal|conversational|neutral),
  verbosity (concise|standard|detailed),
  default_format (prose|bullets|tables|structured),
  proactivity (reactive|suggestive|proactive),
  language,
  auto_synthesize_on_ingest (boolean),
  auto_create_entity_pages (boolean),
  created_at, updated_at

project_members
  project_id, user_id, role

project_files
  id, project_id, path, content, created_by_agent,
  pinned, visibility (surfaced|internal), locked, is_source_of_truth,
  updated_by, updated_at, created_at

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
index.md              — agent-maintained catalog: one-line summary per file, organized by category (internal)
glossary.md           — project terminology and shorthand; agent maintains, user edits via table UI (pinned)
PROJECT.md            — project facts, scope, people, risks (pinned, source of truth)
WORK.md               — current focus, next steps, blockers (pinned)
PRODUCT.md            — product thinking, decisions, trade-offs (pinned)
decisions.md          — agent-maintained log of decisions extracted from sources and conversations (pinned)
memory/2026-04-08.md  — session notes written by the agent after each conversation (internal)
stakeholders/         — agent-created entity pages, one per key person, client, or team
reporting.md          — user-created, specific to this project
```

Default files (`index.md`, `glossary.md`, `PROJECT.md`, `WORK.md`, `PRODUCT.md`, `decisions.md`) are created when a project is set up. Users and the agent can create new files at any time.

**File display metadata.** Each file carries user-configurable display properties:

- **Pinned** — shown prominently in the project overview. The most important artifacts: glossary, project brief, decisions, current workboard.
- **Source of truth** — visually marked as authoritative. The agent treats edits to these files as high-stakes and may prompt for confirmation before overwriting content.
- **Visibility** — `surfaced` (appears in the main file list) or `internal` (accessible but hidden from the default view). Files like `index.md` and `memory/`* are internal — they are the agent's working infrastructure, not the user's primary reading surface.
- **Locked** — the agent can read but cannot edit. The user owns this file entirely.

**Agent-created vs. user-created files.** The `created_by_agent` flag tracks origin. The UI uses this alongside visibility to present a curated view rather than a flat file list.

**Glossary.** Stored as `glossary.md` so the agent reads and updates it with `edit_file`, but the frontend renders it as an editable table (term + definition rows), not a raw markdown editor. The agent adds terms it encounters during ingestion and chat; the user corrects, removes, or adds terms through the table UI. The glossary should be one of the most prominent artifacts in the project — it affects every response the agent gives.

**Entity pages.** The agent creates dedicated pages for recurring entities — a stakeholder who appears in many sources, a key concept or business rule — when those entities accumulate enough context to warrant their own page. These live under a logical prefix (e.g. `stakeholders/`) and are cross-referenced from other pages.

### Supabase Storage

- Private `sources` bucket
- Private `exports` bucket
- `sources/{project_id}/{source_material_id}/original.`* — raw uploaded file
- `sources/{project_id}/{source_material_id}/attachments/`* — extracted attachments
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
- Add a shared trigger to keep `updated_at` current on mutable tables such as `profiles`, `projects`, `project_settings`, `project_files`, `source_materials`, and any future editable metadata tables.
- Add unique constraints on membership tables to prevent duplicate rows, for example `(project_id, user_id)`.
- Add unique constraints where path or version identity matters, especially `(project_id, path)` on `project_files` and `(project_file_id, version)` on `project_file_versions`.
- Add foreign keys with clear delete behavior. Use cascading deletes for strictly dependent records like `project_file_versions`, `messages`, and `source_chunks`; use restrictive behavior where deleting a parent would be unsafe.
- Add indexes for expected high-volume access paths, especially foreign keys, `project_files(project_id, path)`, `messages(conversation_id, created_at)`, `activity_events(project_id, created_at)`, and `source_materials(project_id, created_at)`.
- Keep the schema normalized enough for future v2/v3 features. Do not collapse memberships, conversations, files, versions, sources, and activity into JSON blobs just because v1 is smaller.
- Use `jsonb` only for flexible metadata fields such as `source_materials.metadata`, `source_chunks.metadata`, `messages.tool_calls`, and `messages.citations`, with the core relational structure kept in first-class columns.
- Plan for future partitioning or archive strategies by keeping large append-heavy tables (`messages`, `activity_events`, `project_file_versions`, `source_chunks`) narrow, indexed by project-scoped access paths, and free of avoidable duplication.

## Frontend

### Stack

Next.js + TypeScript + Tailwind. Standard SaaS layout.

### Design Principle: Artifacts, Not Files

The user should interact with **artifacts** — glossary, project brief, current decisions, stakeholder profiles — not with a filesystem. The wiki is the agent's domain. The user sees a curated surface of the most important project artifacts, with the rest accessible but deprioritized.

Pinned files appear as cards in the project overview. Internal files (index, memory entries, plumbing) are accessible through a secondary "All files" view but don't clutter the main experience. The glossary renders as an editable table, not a markdown editor. The goal: a non-technical user should never feel like they are managing a codebase.

### Layout

```
┌─────────────────────────────────────────────────┐
│  App header                                     │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │  Main content area                   │
│          │                                      │
│ Projects │  - Chat (default view)               │
│ Wiki     │  - Project overview (pinned artifacts│
│ Sources  │  - Artifact viewer/editor            │
│ Search   │  - All files (includes internal)     │
│ Activity │  - Source detail                     │
│ Settings │  - Project settings                  │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

### Key Views

**Chat** — main interaction surface. Messages stream via the Vercel AI SDK `useChat` hook. Citations render as clickable references that open the source or artifact view. When the agent edits files, an inline note shows what changed.

**Project overview** — dashboard of pinned artifacts rendered as cards. Shows `PROJECT.md`, `WORK.md`, `PRODUCT.md`, `decisions.md`, and `glossary.md` by default. Each card shows a summary or preview. Users can pin/unpin files from this view. Files marked as source of truth show a visual indicator.

**Wiki** — two tiers:

- **Surfaced artifacts** (default view) — only files with `visibility = surfaced`. Presented as a clean list of project artifacts with last-updated timestamps and authorship (agent vs. user).
- **All files** (toggle or tab) — includes internal files like `index.md`, `memory/`*, cross-reference plumbing. For advanced users who want to see the full wiki.

Agent-created files show a subtle visual distinction (e.g. a small icon or label) so the user understands which artifacts they wrote and which the agent synthesized. Locked files show a lock indicator. Source-of-truth files show an authority badge.

**Glossary** — a dedicated table view of `glossary.md`. Term on the left, definition on the right. Users can add, edit, or remove rows directly. The agent also updates this file during ingestion and chat. This should be reachable in two clicks from anywhere in the project.

**Sources** — browsable list of uploaded materials, grouped by type (documents, emails, meetings). Each item shows title, upload date, processing status, summary, and metadata.

**Search** — unified search across project files and ingested source material. Queries both `project_files` content (text match) and `source_chunks` (vector search). Results link to the matching artifact or source.

**Activity** — chronological feed of project events: uploads, chat sessions, file edits, source ingestion completions.

**Project settings** — structured settings UI, not a text editor. Four sections:

1. **Interaction style** — tone, verbosity, default format, proactivity, language. Dropdowns and toggles.
2. **Project context** — client name, team name, project phase, key roles with names. Structured fields like a CRM record.
3. **Agent permissions** — auto-synthesize on ingest, auto-create entity pages, which files are locked. Toggles and per-file controls.
4. **Output templates** — recurring deliverable formats, client-facing vs. internal tone rules. Text fields for template descriptions.

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
8. When the agent produces a synthesis worth preserving — a risk summary, a cross-source decision log, an answer that required reasoning across multiple files — it calls `edit_file` to save that output as a new project file. Chat answers that compound knowledge should not disappear into conversation history; they should be filed into the wiki.

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
4. Wiki synthesis pass — the agent actively compiles the source into the project wiki:
  - writes or updates entity pages for people, teams, or topics mentioned
  - appends extracted decisions to `decisions.md`
  - notes any contradictions with existing project files
  - updates `index.md` to reflect any new or changed pages
  - appends a session note to `memory/` with what was ingested and what changed

This synthesis pass is not optional — it is the primary output of ingestion alongside the embeddings. RAG retrieval handles point lookups at query time; the wiki handles accumulated, cross-referenced understanding over time.

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
8. Wiki synthesis: write or update entity pages, append to `decisions.md`, flag contradictions with existing project files, update `index.md`, and write a memory entry recording what was ingested and what changed

## Auth And Multi-Tenancy

- Supabase Auth for login (email/password + OAuth)
- Use `auth.users` for authentication and `profiles` for application user data
- Create a profile row automatically when a new auth user is created
- Row-level security on all tables scoped to project ownership or project membership
- Project-level roles: owner, editor, viewer
- All retrieval and agent tool calls filtered by project scope
- Storage access for `sources` and `exports` must also be protected by project-aware policies, not just table RLS
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

**Architecture**

- How large can the assembled system prompt get before we need smarter context selection? `index.md` and the glossary are always loaded; the ceiling will depend on project size.
- What is the right chunking strategy for mixed-format project materials?
- How do we handle concurrent file edits from multiple users plus the agent?
- How do we handle `index.md` consistency? The agent maintains it, but if it drifts out of sync with `project_files`, context assembly degrades. Should the backend validate it on each request?

**Agent behavior**

- When should we introduce a review step for agent writes? (intentionally deferred from v1)
- What triggers a wiki lint pass — scheduled (e.g. weekly), user-requested, or agent-initiated after a threshold of new ingestions?
- When should the agent proactively suggest filing a chat answer as a project file, versus always doing it silently, versus never doing it without explicit user request?
- At what point does the wiki synthesis pass during ingestion require a user-facing preview before writing? Automatic writes may be fine for additive changes; contradictions or overwrites to existing content probably need review.

**UX and settings**

- Should new projects come with a fixed set of default files, or let the user pick a template?
- What is the right default for agent permissions? Fully automatic synthesis is more useful but may feel surprising to new users. A guided onboarding that explains what the agent will do could mitigate this.
- How should the glossary table UI handle conflicts? The agent adds a term during ingestion while the user is editing the same glossary in the table view.
- Should source-of-truth files require explicit confirmation before the agent can overwrite content, even in v1?
- How granular should the project context fields be? Structured fields (client name, team name, project phase) are clean but rigid. A hybrid of structured fields plus a freeform "additional context" textarea may be more practical.

## Implementation TODO

Current state: auth, project portfolio, chat with streaming + 5 agent tools, file list/editor, sources list (no upload wired), FTS search, activity feed, and invites are built. Database has the v1 core tables but not the new wiki/settings columns. No ingestion pipeline, no vector search in app code, no wiki-specific features.

### Database / Schema

- [x] Create `project_settings` table (one row per project): `tone`, `verbosity`, `default_format`, `proactivity`, `language`, `auto_synthesize_on_ingest`, `auto_create_entity_pages`, `created_at`, `updated_at`
- [x] Add FK from `project_settings.project_id` to `projects.id` (cascade delete), create row on project creation
- [x] Add columns to `project_files`: `created_by_agent boolean default false`, `pinned boolean default false`, `visibility text default 'surfaced'` (check: surfaced|internal), `locked boolean default false`, `is_source_of_truth boolean default false`
- [x] Migrate existing `projects.agent_instructions` data into `project_settings` rows (backfill), then drop the `agent_instructions` column from `projects`
- [x] Add `project_settings` to `updated_at` trigger
- [x] Add RLS policies for `project_settings` (same access pattern as `projects`)
- [x] Create Supabase Storage buckets: `sources` (private), `exports` (private) with project-aware access policies

### Backend — Context Assembly

- [x] Rewrite `assembleProjectSystemPrompt` to load from `project_settings` instead of `projects.agent_instructions`
- [x] Load `glossary.md` content into the system prompt on every turn
- [x] Load `index.md` content into the system prompt instead of the raw file path list
- [x] Serialize `project_settings` fields (tone, verbosity, proactivity, etc.) into prompt instructions
- [x] Include project context fields (client name, team name, etc.) from settings in the prompt

### Backend — Agent Tools

- [x] Update `edit_file` tool to set `created_by_agent = true` when the agent creates a new file
- [x] Update `edit_file` tool to respect `locked` flag — reject writes to locked files
- [x] Update `edit_file` tool to update `index.md` after creating or significantly modifying a file
- [x] Update `list_files` tool to include file display metadata (`pinned`, `visibility`, `locked`, `is_source_of_truth`) in results
- [x] Replace FTS in `search_sources` tool with vector search using `match_source_chunks` (the DB function already exists but is unused)

### Backend — Ingestion Pipeline

- [x] Wire source upload flow end-to-end: UI → signed URL → Storage upload → `source_materials` row → processing job
- [x] Implement text extraction: PDF (e.g. `pdf-parse`), DOCX (e.g. `mammoth`), `.eml` (header parsing, HTML body cleaning, attachment extraction), Markdown/plain text (direct)
- [x] Implement chunking (fixed-size with overlap or semantic)
- [x] Implement embedding generation (OpenAI `text-embedding-3-small`) and store in `source_chunks.embedding`
- [x] Implement LLM summary generation per source
- [x] Implement wiki synthesis pass after chunking/embedding:
  - [x] Write or update entity pages for people/teams/topics mentioned
  - [x] Append extracted decisions to `decisions.md`
  - [x] Flag contradictions with existing project files (store as notes in memory or surface to user)
  - [x] Update `index.md` with new/changed pages
  - [x] Write memory entry (`memory/{date}.md`) recording what was ingested and what changed
- [x] Update `source_materials.status` through lifecycle: `processing` → `ready` / `failed`

### Backend — Default Files

- [x] On project creation, seed default `project_files` rows: `index.md`, `glossary.md`, `PROJECT.md`, `WORK.md`, `PRODUCT.md`, `decisions.md` — with starter content and correct display metadata (pinned, visibility, source_of_truth)
- [x] Set `created_by_agent = false` for default files (they are system-created, not agent-created)

### Backend — Wiki Lint

- [x] Implement wiki lint as a callable workflow (not a separate tool — the agent uses `list_files`, `read_file`, `edit_file`):
  - [x] Detect stale content (outdated dates, deadlines, statuses)
  - [x] Detect contradictions across files
  - [x] Detect orphan pages (no inbound references)
  - [x] Detect missing entity pages (frequently mentioned but no dedicated page)
  - [x] Detect `index.md` gaps
- [x] Decide trigger mechanism: user-invoked chat command, scheduled, or agent-suggested after N ingestions

### Backend — Search

- [x] Add vector search path to `/api/search` using embeddings + `match_source_chunks`
- [x] Merge FTS results (project files) with vector results (source chunks) in unified response

### Frontend — Project Settings

- [x] Create `/project/[projectId]/settings` route
- [x] Build settings form with four sections:
  - [x] Interaction style: tone, verbosity, default format, proactivity, language (dropdowns/toggles)
  - [x] Project context: client name, team name, project phase, key roles (structured fields)
  - [x] Agent permissions: auto-synthesize on ingest, auto-create entity pages, locked file controls (toggles)
  - [x] Output templates: recurring deliverable formats, client vs. internal tone (text fields)
- [x] Add "Settings" entry to sidebar navigation
- [x] Wire form saves to `project_settings` table via new API route (`/api/projects/[projectId]/settings`)

### Frontend — Wiki / Files Overhaul

- [x] Rename sidebar entry from "Files" to "Wiki"
- [x] Implement two-tier view: "Surfaced artifacts" (default, `visibility = surfaced`) and "All files" (toggle/tab, includes internal)
- [x] Add visual indicators on file cards: pinned badge, source-of-truth badge, locked icon, agent-created icon
- [x] Add per-file controls: pin/unpin, set visibility, lock/unlock, mark as source of truth
- [x] Build project overview route (`/project/[projectId]/overview` or make it the default): dashboard of pinned artifact cards with summaries

### Frontend — Glossary

- [x] Build glossary table view component: term column + definition column, editable inline
- [x] Wire reads and saves to `glossary.md` via `/api/files` (parse markdown table ↔ structured table rows)
- [x] Add "Glossary" as a prominent entry in sidebar or as a pinned card in project overview
- [x] Ensure glossary is reachable in two clicks from any project view

### Frontend — Sources Upload

- [x] Wire `SourceUploadZone` to actually submit files: signed URL → Storage upload → `POST /api/sources`
- [x] Show processing status per source (processing → ready → failed)
- [x] Show source summary and metadata once ingestion completes

### Frontend — Chat Improvements

- [x] Show inline notifications when the agent creates or edits wiki files during chat (currently partially implemented)
- [x] When the agent files a chat synthesis as a new wiki page, show a link to the new artifact in the chat
- [x] Multi-conversation support: conversation list in sidebar, ability to start new conversations

### Frontend — Types

- [x] Add `ProjectSettings` type to `types.ts`
- [x] Extend `ProjectFile` type with `created_by_agent`, `pinned`, `visibility`, `locked`, `is_source_of_truth`
- [x] Add `GlossaryEntry` type (`term`, `definition`)

### Infrastructure

- [x] Wire `src/proxy.ts` into a root `middleware.ts` — session refresh and route protection currently only works via server-side `getSessionUser()` calls, not Edge middleware
- [x] Generate TypeScript types from Supabase schema (use `supabase gen types` or the MCP `generate_typescript_types` tool) to replace hand-written types

