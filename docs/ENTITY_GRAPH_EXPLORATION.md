# Entity Graph Memory — Exploration

Notes from a research pass triggered by reviewing Hermes Agent's eight memory providers (Honcho, OpenViking, Mem0, Hindsight, Holographic, RetainDB, ByteRover, Supermemory). Captures the most relevant ideas and what it would take to adopt them on top of our current Supabase schema.

## Survey of Hermes memory providers

Eight external providers, only one active at a time. Each injects context into the system prompt, prefetches before each turn, syncs after responses, and adds tools.

| Provider | Storage | Notable idea |
|---|---|---|
| Honcho | cloud / self-host | two-layer context (session summary + peer card) + dialectic reasoning |
| OpenViking | self-host | filesystem hierarchy + tiered reading |
| Mem0 | cloud | hands-off automatic extraction (cleanest SDK) |
| **Hindsight** | cloud / local PG | **knowledge graph with entity relationships + cross-memory synthesis** |
| Holographic | local SQLite | HRR algebra, compositional queries (academic) |
| RetainDB | cloud, $20/mo | profile + semantic search |
| **ByteRover** | local / cloud | **pre-compression extraction — saves insights before context window compresses** |
| Supermemory | cloud | context fencing — strips recalled memories from captured turns |

### Most relevant takeaways

- **Hindsight's knowledge-graph model** is the best conceptual fit for project work: people, decisions, risks, action items, milestones — and edges between them.
- **ByteRover's pre-compression hook** is a pattern worth adopting independently of any backend choice.
- **Mem0** is the only provider clean enough to actually plug in as a dependency if we wanted to skip building extraction ourselves.
- The other five are either category-misfits (filesystem-tree, HRR algebra) or thin wrappers around semantic search we already have.

## Current state of our schema

Already in place (Supabase `public` schema):

- `profiles`, `projects`, `project_members`, `project_settings`, `project_invites`
- `chats` + `messages` (with `citations` jsonb)
- `source_materials` + typed details:
  - `source_meeting_details` — extracts `decisions`, `action_items`, `risks`, `open_questions`, `participants` as JSONB
  - `source_email_details` — extracts `key_decisions`, `requested_actions`
  - `source_file_details` — file metadata
- `source_chunks` with `vector` embeddings (pgvector)
- `canonical_docs` (the wiki) + `pending_wiki_edits`
- `librarian_runs` — background extraction agent runs
- `activity_events` — temporal timeline

### The gap

Entities like decisions, people, action items, and risks are **trapped inside JSONB blobs on individual source records**. There's no first-class, deduplicated, project-wide view. Today the agent can answer "what was decided in this meeting?" by reading one source. It cannot easily answer "what decisions has Maria owned across all meetings?" or "what risks are linked to the data-migration workstream?" without scanning every JSONB blob.

The wiki (`canonical_docs`) compensates for this in prose form, but prose doesn't support structured queries (status rollups, ownership lookups, dependency walks).

## Proposed schema additions

Three new tables, additive and reversible. Nothing existing changes shape.

### 1. `project_entities` — typed nodes

```sql
create type entity_kind as enum (
  'person', 'organization', 'decision', 'action_item',
  'risk', 'open_question', 'milestone', 'workstream',
  'deliverable', 'system', 'topic'
);

create table project_entities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind entity_kind not null,
  label text not null,
  aliases text[] default '{}',
  status text,
  attributes jsonb default '{}',
  embedding vector(1536),
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  superseded_by uuid references project_entities(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 2. `entity_edges` — typed relationships

```sql
create type edge_kind as enum (
  'owns', 'attends', 'decides', 'blocks',
  'depends_on', 'mentions', 'supersedes', 'part_of'
);

create table entity_edges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  src_id uuid not null references project_entities(id) on delete cascade,
  dst_id uuid not null references project_entities(id) on delete cascade,
  kind edge_kind not null,
  attributes jsonb default '{}',
  created_at timestamptz default now(),
  unique (src_id, dst_id, kind)
);
```

### 3. `entity_mentions` — provenance / citations

```sql
create type mention_source_kind as enum (
  'source_material', 'source_chunk', 'canonical_doc', 'message'
);

create table entity_mentions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references project_entities(id) on delete cascade,
  source_kind mention_source_kind not null,
  source_id uuid not null,
  snippet text,
  char_start int,
  char_end int,
  confidence numeric,
  created_at timestamptz default now()
);
```

(Polymorphic FK follows the same pattern already used by `activity_events.target_type/target_id`.)

## How it plugs into existing flow

1. **Librarian extraction** — when `librarian_runs.trigger_type = 'source_ingested'` runs, after producing the existing JSONB extractions, upsert each into `project_entities` with semantic dedup (cosine similarity > threshold against existing entities of same kind), and write `entity_mentions` pointing at the source. The JSONB stays as raw extraction; the entity table is the deduped project-wide view.
2. **Chat citations** — `messages.citations` can reference `entity_id` alongside `source_chunk_id`.
3. **Wiki ↔ entities** — when `canonical_docs` reference an entity, write a `mentions` edge. Bidirectional links emerge.
4. **Pre-compression hook** (ByteRover idea) — before a long chat hits the context limit, run a lightweight extraction pass on the conversation tail and upsert entities/edges. New server route, no schema change.

## Migration order

1. Create the three tables (no behavior change).
2. Backfill from existing `source_meeting_details.*` and `source_email_details.*` JSONB → entities + mentions. Pure script, no risk to live data.
3. Update `librarian_runs` extraction to write entities going forward.
4. Add one query helper (`getProjectGraph(projectId, kindFilter?)`) and surface it in one place — e.g. a "Project Pulse" panel — to validate the model.
5. Later: agent tools (`search_entities`, `get_entity_context`, `link_entities`) so the chat agent can reason over the graph directly.

Steps 1–2 are reversible and additive; nothing breaks if the model turns out to be wrong.

---

## Is it worth doing?

Honest take, given the current state of the product (agent + read tools + structured wiki + typed source extractions).

### What we get

- **Cross-source structured queries.** "All open action items owned by Maria across meetings and emails" becomes a single SQL query instead of a JSONB scan or an LLM read pass over many sources.
- **Deduplication.** The same decision mentioned in three meetings becomes one entity with three mentions, not three near-duplicate JSONB rows the agent has to reconcile in-prompt.
- **Cheaper, more grounded answers.** Status rollups, ownership lookups, dependency walks become deterministic queries — not LLM scans. Lower token cost, less hallucination surface, faster.
- **Trustworthy citations by construction.** Every entity claim has a `entity_mentions` row pointing at a source. The trust requirement from the product principles becomes a schema invariant rather than a prompt-engineering wish.
- **A second "view" on the project** complementing the wiki: prose-for-humans + graph-for-queries. They reinforce each other.

### What it costs

- **Three new tables, two new enums, one polymorphic FK convention.** Modest.
- **Real complexity is in the extraction pipeline, not the schema.** Entity dedup is the hard part — alias resolution ("Maria" / "M. Garcia" / "maria@…"), status updates ("decision X was reversed"), supersession. Mistakes here pollute the graph, and a polluted graph is worse than no graph because users will trust query results.
- **Two sources of truth risk.** JSONB on source records *and* entities table. Need a clear rule: JSONB is raw per-source extraction (immutable), entities are the deduped project view (mutable). If they drift, debugging gets painful.
- **UI work to actually surface it.** Schema alone produces no user value. Needs at least one consumer (Project Pulse panel, an agent tool, citation chips that link to entities) before the cost is repaid.
- **Ongoing maintenance.** Every new source type or extraction field needs a mapping into the graph. Each new `entity_kind` or `edge_kind` is a small design decision.

### When the current setup is enough

The existing structure — agent with read tools over typed source records and a well-curated wiki — is genuinely strong for:
- single-source questions ("what did we decide in last Thursday's meeting?")
- prose answers where the wiki already has the synthesized view
- small projects where scanning a few sources at agent-time is cheap

If users mostly ask those kinds of questions, the graph is over-engineering. The wiki + read tools already deliver the "shared project brain" feel.

### When the graph starts to pay back

It pays back when:
- projects grow past ~20–30 source materials and JSONB scanning gets slow / lossy
- users start asking **rollup and cross-source questions** ("all open risks", "everything Maria owns", "what's blocking the data migration")
- we want **structured UI surfaces** (a real action-items board, an ownership matrix, a risk register) — these need typed queryable data, not prose
- we want the agent to **propose updates to the wiki** based on graph deltas ("3 new action items since last sync")

### Recommendation

**Don't build the full thing now.** It's premature relative to where the product is. But the design is sound and the migration order makes it cheap to defer.

A pragmatic middle path:

1. **Adopt the pre-compression extraction hook now** (ByteRover idea) — it's a small, isolated improvement that helps long chats regardless of any graph work.
2. **Wait for the trigger.** Build the entity tables when we hit one of: (a) a concrete UI surface that needs structured rollup data (action board, risk register), (b) a user complaint about the agent missing cross-source context, or (c) projects routinely exceeding ~20 source materials.
3. **When the trigger hits, do steps 1–2 of the migration only** (create tables + backfill). That gives us the queryable layer without committing to the full extraction-pipeline rewrite or new agent tools until we've seen the data.

Net: the graph is the right long-term shape for a "project brain," but the wiki + typed sources are doing enough today that the marginal return on building it now is low. Park the design, ship something cheaper first, revisit when scale or a UI surface forces the question.
