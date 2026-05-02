# Knowledge model (brainstorm + target architecture)

**Status:** Working doc  
**Last grounded:** 2026-04-26 (Supabase project `ai-project-advisor`, ref `faqtckftiusdgyghwcar`)

This document ties a **consulting-friendly mental model** to what the app already stores, using the **live seeded project** in Supabase as ground truth.

---

## 1. Ground truth from the current Supabase project

Queries were run against production data for the app’s Supabase project. At the time of writing there is **one** app project row:


| Field         | Value                                  |
| ------------- | -------------------------------------- |
| Project name  | Leadabeelity                           |
| `projects.id` | `6f8422d9-6929-4f5a-bff4-4d33512cf38d` |


### 1.1 Wiki layer (`project_files`)

**34** non-deleted wiki files for that project.

**By `visibility` × `created_by_agent`:**


| visibility | created_by_agent | count |
| ---------- | ---------------- | ----- |
| internal   | false            | 1     |
| internal   | true             | 6     |
| surfaced   | false            | 1     |
| surfaced   | true             | 26    |


**Interpretation:** almost everything the user sees under “surfaced” was **agent-authored**; only `**PROJECT.md`** is surfaced and not agent-flagged. That matches the intuition that the UI can feel noisy unless **pinning, sections, and defaults** are enforced.

**Observed path taxonomy (already emerging in data):**


| Area            | Role                       | Example paths                                            |
| --------------- | -------------------------- | -------------------------------------------------------- |
| Core (root)     | Engagement narrative       | `PROJECT.md`, `WORK.md`, `PRODUCT.md`, `decisions.md`    |
| `analyses/`     | Dated / thematic syntheses | `analyses/2026-04-23-prd-v0-synthesis.md`, …             |
| `stakeholders/` | One file per entity        | `stakeholders/<slug>.md`                                 |
| `topics/`       | Cross-cutting threads      | `topics/integration.md`, `topics/product-strategy.md`, … |
| `memory/`       | Daily / session scratch    | `memory/2026-04-26.md`, …                                |
| Ops / librarian | Internal index + log       | `index.md`, `log.md`                                     |


**Pinning:** in this dataset **every** `pinned` value is **false**. The product design (Overview, pinned cards) expects some files to be pinned; without backfill or agent rules, the “important files” story is underpowered in the DB even when content exists.

**Visibility drift vs seed defaults:** `glossary.md` is `**internal`** in live data, while `src/lib/server/project-setup.ts` seeds it as **surfaced** and pinned. That is a concrete example of **defaults + agent edits** diverging from the **intended UX**—good candidate for **locked core files** or **re-seed / migration** policy.

**Stakeholder naming:** multiple files can represent overlapping people or orgs (e.g. short vs full slug). The taxonomy should include **merge / canonical slug** rules to avoid parallel truths.

**Topics hygiene:** `topics/` in this project mixes **engagement** themes (e.g. integration, product strategy) with **personal** threads (e.g. nutrition, workout). For a consulting product, consider `**topics/` = engagement only** and a separate optional namespace (e.g. `personal/` or internal-only) so RAG and Overview stay client-safe and on-brand.

### 1.2 Evidence layer (`source_materials` + `source_chunks`)

All ingested sources for this project are `**ready`**:


| type     | count |
| -------- | ----- |
| meeting  | 17    |
| document | 4     |
| email    | 2     |
| note     | 1     |


**713** rows in `source_chunks` for this project (vector retrieval footprint).

**Interpretation:** the engagement is **meeting-heavy**, which fits the PRD’s consulting / handover use case. Wiki pages should **summarize and link** this evidence; retrieval supplies **implicit** “edges” from claims to chunks.

---

## 2. Mental model: graph — yes, but bipartite

Thinking in graphs is **correct** for product and UX narratives:

- **Evidence nodes** = sources (immutable after upload, chunked, searchable). Primary relation: **supports / grounded_in** (often implicit via RAG).
- **Synthesis nodes** = wiki files (editable by human + agent). Primary relations: **about**, **summarizes**, **decides**, **relates_to** (often explicit in prose, headings, or future wikilinks).

You do **not** need a graph database on day one. A **virtual filesystem** (`project_files.path`) plus **metadata** (`pinned`, `visibility`, `is_source_of_truth`, optional future `related_paths` or frontmatter) can implement the same **mental** graph for users and agents.

---

## 3. Target architecture (layers)

### 3.1 Two layers (unchanged from V1)


| Layer         | Storage                                      | Mutability                                                      | Primary consumer             |
| ------------- | -------------------------------------------- | --------------------------------------------------------------- | ---------------------------- |
| **Evidence**  | `source_materials`, Storage, `source_chunks` | Upload + ingest; treat as immutable truth of “what we received” | Search, citations, librarian |
| **Synthesis** | `project_files`                              | Editable; versioned                                             | Humans, advisor, overview    |


### 3.2 Preset folder contract (recommended)

Allow **only** these **top-level namespaces** (plus documented exceptions). Agents may create **any path under** them, not new roots.


| Prefix              | Purpose                                                                          | Default `visibility` | Pin policy                        |
| ------------------- | -------------------------------------------------------------------------------- | -------------------- | --------------------------------- |
| **Root core files** | `PROJECT.md`, `WORK.md`, `decisions.md`, `glossary.md`                           | `surfaced`           | Pin core set for Overview         |
| `analyses/`         | Memos, PRD synthesis, option papers                                              | `surfaced`           | Pin only flagship analyses        |
| `stakeholders/`     | People / orgs                                                                    | `surfaced`           | Optional pin for key client roles |
| `topics/`           | Engagement cross-threads only                                                    | `surfaced`           | Prefer **fewer, longer** files    |
| `memory/`           | Daily logs, raw session notes                                                    | `internal`           | Never pin                         |
| `index.md`          | **Map of Content (MOC)** — curated links and short blurbs pointing into the wiki | `internal`           | Never pin                         |
| `log.md`            | Librarian activity log (append-only)                                             | `internal`           | Never pin                         |


**Optional:** `personal/` or `private/` (always `internal`) if the agent must capture non-engagement context without polluting `topics/`.

**Forbidden or discouraged:** ad hoc new top-level files like `note-2026-04-26.md` — redirect to `memory/` or append to an existing `topics/*` / `analyses/*` file.

### 3.3 Visibility and Overview

- `**surfaced`:** visible in default wiki navigation and eligible for “recent” surfaces.
- `**internal`:** agent/human can open, but hidden from default client-facing trees (per product rules in `getDefaultFileVisibility` and UI filters).
- `**pinned`:** drives **Project Overview** cards; must be **explicitly** set for the small core set (seed + migration + agent policy).

### 3.4 Graph-like links (evolution)

**Now:** implicit graph via RAG + markdown links.  
**Next:** optional `[[wikilinks]]` or YAML frontmatter `related: [paths]` on `project_files` for deterministic navigation and “backlinks” in the UI.  
**Later:** typed edges table only if queries need to span thousands of nodes with analytics.

---

## 4. Consulting-team fit (from PRD)

For **consulting / delivery** teams, the preset above maps to recurring artifacts:

- **Stakeholder map** → `stakeholders/*`
- **What we believe / decided** → `decisions.md` + `PRODUCT.md`
- **What we’re doing now** → `WORK.md`
- **Engagement narrative** → `PROJECT.md`
- **Deep dives** → `analyses/*`
- **Cross-workstream themes** → `topics/*` (engagement-scoped)
- **Raw intake** → sources (meetings, emails, docs), not duplicated as dozens of wiki clones

The **user’s job** is not to browse every file; it is to trust **Overview + chat**. The taxonomy exists to **constrain agent sprawl** and make **navigation predictable**.

---

## 5. Gaps observed in live data vs target

1. `**pinned` is unused** in the seeded project — Overview cannot shine until core files are pinned (data fix + agent instructions).
2. **Surfaced surface is agent-dominated** — tighten defaults so new agent files under `memory/` / librarian paths stay `internal`; require explicit promotion for new `surfaced` paths outside allowlist.
3. `**glossary.md` visibility** drifted from seed — decide whether glossary is **core** (surfaced + pinned) or **internal**; enforce with `locked` or librarian rules.
4. `**topics/` scope creep** — enforce “engagement only” or split namespaces.
5. **Stakeholder deduplication** — naming conventions and merge guidance for near-duplicate slugs.

---

## 6. Implementation touchpoints (codebase)

- **Seeds / defaults:** `src/lib/server/project-setup.ts` — core file templates and initial `pinned` / `visibility`.
- **Path → visibility defaults:** `getDefaultFileVisibility()` in `src/lib/server/project-files.ts`.
- **Types:** `ProjectFile` in `src/lib/types.ts` (`pinned`, `visibility`, `is_source_of_truth`, `locked`, `created_by_agent`).
- **Overview UI:** `src/components/wiki/overview-panel.tsx` — consumes `pinned` and `visibility`.
- **Evidence:** `source_materials`, `source_chunks` — ingestion and RAG; not the wiki graph, but **ground** synthesis.

---

## 7. Suggested next steps (product + engineering)

1. **Migration or one-off SQL** to set `pinned = true` for the core set (`PROJECT.md`, `WORK.md`, `PRODUCT.md`, `decisions.md`, `glossary.md` if surfaced) on existing projects.
2. **Stricter `getDefaultFileVisibility`** (or allowlist) for **new** paths so agent-created files default **internal** unless under approved prefixes.
3. **Agent / librarian prompt** rules: prefer **append** to existing `topics/`* and `stakeholders/`*; require new top-level paths to be justified in `index.md`.
4. **Optional:** UI sections that mirror the table in §3.2 so users see **Core / Analyses / Stakeholders / Topics** instead of a flat list.

---

## 8. Related docs

- `docs/PRD.md` — users, jobs-to-be-done, consulting fit  
- `docs/V1 PLAN.md` — `project_files` vs `source_materials`, tool model  
- `docs/MEMORY MODEL.md` — older harness-oriented notes (SQLite / hooks); **synthesis in this repo is Supabase `project_files` + sources**  
- `docs/TODO.md` — wiki division, librarian visibility, naming (“Artifacts”)