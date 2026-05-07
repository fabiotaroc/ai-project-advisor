# Wiki as Canonical Docs - Implementation Plan

**Goal:** Replace the emergent, librarian-curated wiki with five canonical docs plus user pins, fed by two reviewable write paths (chat memory cards + source-detail per-hunk diff panel).
**Proposal:** `flow/changes/wiki-canonical-docs/proposal.md`
**Delta specs:**
- `flow/changes/wiki-canonical-docs/specs/wiki.md`
- `flow/changes/wiki-canonical-docs/specs/librarian.md`
- `flow/changes/wiki-canonical-docs/specs/chat.md`

## Naming convention (locked)

Two unrelated concepts that previously collided in the codebase. Keep them separate everywhere — UI labels, route paths, function names, schema, comments.

- **Docs (canonical docs)** — what this change is about. Per-project markdown documents (`canonical_docs` table). Five seeded defaults (`project`, `decisions`, `people`, `work`, `glossary`) plus user-pinned customs. Surfaced under the **Wiki** feature.
- **Files (sources)** — uploaded artifacts (pdf/docx/pptx/xlsx/etc.) stored in Supabase Storage and linked from `source_materials`. Surfaced under the **Files** sidebar tab at `/project/[id]/sources`. **Out of scope** for this change.

Route mapping after this change:
- `/project/[id]/wiki` → canonical docs view (was `/files`, renamed in §2.2).
- `/project/[id]/sources` → files (sources) view (unchanged).

---

## Execution status (handoff)

**Branch:** `wiki-canonical-docs` (off `main`)

**Done:**
- Section 1.1 — `supabase/migrations/20260507_canonical_docs.sql` applied; 5 defaults backfilled for existing projects.
- Section 1.2 — `supabase/migrations/20260507_pending_wiki_edits.sql` applied.
- Section 2.1 — `src/lib/server/canonical-docs.ts` + types in `src/lib/types.ts` (`CanonicalDoc`, `CanonicalDocSlug`, `DEFAULT_CANONICAL_DOC_SLUGS`).
- Section 2.1 (extra) — REST API at `src/app/api/canonical-docs/route.ts` (GET list, POST pin) and `src/app/api/canonical-docs/[docId]/route.ts` (PATCH body, DELETE unpin).
- Section 2.2 — `src/components/wiki/wiki-panel.tsx` rewritten as canonical-docs view with pin-custom-doc dialog.
- Section 2.2 — route `/project/[id]/files` renamed to `/project/[id]/wiki`; sidebar key + inbound hrefs updated.
- Section 3.1 — librarian narrowed: removed `triggerWikiLint`, `triggerOnConversationEnded`, the `wiki_lint` and `conversation_ended` trigger branches in `runLibrarian`, and the `create_file/edit_file/rename_file/delete_file/trigger_wiki_lint` tools from advisor + librarian surfaces. Replaced with new read-only `list_canonical_docs` and `read_canonical_doc` advisor tools. `agent.ts` rewritten as a thin extractor orchestrator (no LLM tool loop). Chat-context system prompt rewritten to read canonical docs and acknowledge that chat-side wiki writes ship in §5.
- Section 3.2 — `src/lib/server/librarian/extract-pending-edits.ts` extracts append-only candidates per source (meeting / email / file / note) via `generateObject` and persists them as `pending_wiki_edits` rows. Confidence threshold for non-meeting sources = 0.7.
- Section 3.3 — librarian writes `librarian_pending_edits_extracted` activity events when it produces >0 edits. Activity panel + shared metadata updated; legacy `agent_file_*`, `wiki_lint`, `conversation_ended` events / icons / labels removed from the UI mapping. New event types `wiki_edit_accepted` and `wiki_edit_rejected` are now rendered (writers land in §4).
- Section 3 (collateral) — `LibrarianRun.trigger_type` narrowed to `"source_ingested"` only; `LibrarianRunRecord` dropped its `actions` field; supabase generated types regenerated to include `canonical_docs` + `pending_wiki_edits`.

**Next up:**
- Manual smoke: upload a meeting transcript and confirm `pending_wiki_edits` rows + activity event get written.
- Section 4 — source-detail review panel + diff viewer.

**Open decisions noted with prior session:**
- `canonical_docs.is_default <> is_pinned` check constraint added (stricter than spec; pending review).
- Used Postgres enums (`pending_wiki_edit_origin`, `pending_wiki_edit_status`) instead of text+check.
- Section 6 migration approach (synthetic `migration` source row) and Section 3.1 tool-removal scope still pending user lock-in before reaching them.

---

## 1. Schema foundation (Supabase)

### 1.1 Canonical docs table

**Files:**
- Create: `supabase/migrations/<ts>_canonical_docs.sql`

- [x] Define `canonical_docs` table: `id`, `project_id` (fk), `slug` (text), `title` (text), `body` (text, markdown), `is_default` (bool), `is_pinned` (bool), `created_at`, `updated_at`. Unique on (`project_id`, `slug`).
- [x] Add RLS policies mirroring `project_files` (project members read/write).
- [x] Seed function `seed_default_canonical_docs(project_id)` that inserts the five defaults (`project`, `decisions`, `people`, `work`, `glossary`) with empty bodies and `is_default = true`.
- [x] Trigger or hook in project creation flow to call the seed function for new projects.
- [x] Run: apply migration via Supabase MCP `apply_migration` → verify with `list_tables` and a SELECT on `canonical_docs` for an existing project. User confirmed schema migrations are applied.

### 1.2 Pending edits table

**Files:**
- Create: `supabase/migrations/<ts>_pending_wiki_edits.sql`

- [x] Define `pending_wiki_edits` table: `id`, `project_id`, `target_doc_id` (fk → canonical_docs), `source_material_id` (fk, nullable for chat-origin), `origin` (enum: `ingestion` | `chat`), `anchor` (jsonb: section heading, surrounding context), `inserted_text` (text), `deleted_text` (text, nullable), `reason` (text), `confidence` (numeric, nullable), `status` (enum: `pending` | `accepted` | `rejected`), `repositioned` (bool, default false), `fallback_applied` (bool, default false), `created_at`, `resolved_at`.
- [x] Index on (`project_id`, `status`), (`source_material_id`, `status`), (`target_doc_id`, `status`).
- [x] RLS policies: project members read/write.
- [x] Run migration → verify schema. User confirmed schema migrations are applied.

### 1.3 Backfill / removal of legacy wiki tables

**Files:**
- Create: `supabase/migrations/<ts>_legacy_wiki_cleanup.sql` (run AFTER migration 6.x)

- [x] After legacy consolidation runs (section 6), drop the `project_files` table OR repurpose it. User requested immediate drop; implemented in `supabase/migrations/20260507224616_drop_legacy_wiki_schema.sql`.
- [x] Legacy wiki cleanup finalized by dropping `project_file_versions` and `project_files`.

## 2. Canonical docs domain (server + UI)

### 2.1 Server data layer

**Files:**
- Create: `src/lib/server/canonical-docs.ts`
- Add types in `src/lib/types.ts`
- Create: `src/app/api/canonical-docs/route.ts` (GET list, POST pin) and `src/app/api/canonical-docs/[docId]/route.ts` (PATCH body, DELETE unpin)

- [x] Implement `listCanonicalDocs(projectId)`, `getCanonicalDoc(projectId, slug)`, `getCanonicalDocById(docId)`, `updateCanonicalDocBody(docId, body)`, `pinCustomDoc(projectId, slug, title)`, `unpinCustomDoc(docId)`. Rejects unpin on `is_default = true` (also enforced by RLS + DB trigger).
- [x] Types `CanonicalDoc`, `CanonicalDocSlug`, `DEFAULT_CANONICAL_DOC_SLUGS`.
- [ ] Tests deferred — repo has no test runner wired into npm scripts. Default-unpin guard has three layers (TS validation, RLS policy, DB trigger); will verify via manual smoke. Revisit if a runner gets wired up.

### 2.2 Wiki view UI

**Files:**
- Modify: `src/components/wiki/wiki-panel.tsx` (rewritten as canonical-docs view)
- Modify: `src/components/layout/sidebar.tsx` (sidebar key `files` → `wiki`)
- Renamed: `src/app/(app)/project/[projectId]/files/` → `wiki/`; same for the workspace re-export
- Updated inbound hrefs in `chat-panel.tsx`, `activity-panel.tsx`, `overview-panel.tsx`
- Removed: legacy `src/components/wiki/overview-panel.tsx` read from `project_files`; cleaned up in §7.

- [x] Two-column wiki view: left lists "Canonical" defaults + "Pinned" customs; right is a markdown textarea editor with Save (explicit, dirty-tracked).
- [x] "Pin custom" dialog with auto-derived slug + uniqueness check.
- [x] Custom docs unpinnable via trash icon; defaults locked.
- [x] Wiki reachable as a dedicated tab in project nav (`/wiki`); not the default landing route. (Spec said the wiki MUST be reachable via dedicated nav — clarified during execution.)
- [ ] Smoke check (manual): load `/project/<id>/wiki`, see five default docs, pin a custom doc, edit body, refresh → persists.

## 3. Librarian: narrow scope, extract pending edits

### 3.1 Remove wiki-linting and free-form wiki writes

- [x] Removed `triggerWikiLint()` + `wiki_lint` trigger branch in librarian.
- [x] Removed `triggerOnConversationEnded()` + `conversation_ended` trigger branch (depended on the now-removed file tools; clarified during execution).
- [x] Removed `trigger_wiki_lint` and the four `*_file` tools from `agent-tools.ts`. Caller removed from `chat-client.ts` (`triggerWikiLint`, `triggerConversationMemory`).
- [x] Replaced advisor's read-only project_file tools (`list_files`, `read_file`) with `list_canonical_docs` and `read_canonical_doc` since the wiki layer is canonical docs now.
- [x] Removed `wiki_lint` and `conversation_ended` from `TRIGGER_META`; removed `agent_file_*` event labels in `activity-shared.tsx`. Activity panel `subjectHrefFor` / `eventHrefFor` updated to map only the live event types.
- [x] Advisor `system` prompt rewritten in `chat-context.ts` to drop file-tool docs + wiki-lint instructions; lists canonical docs in the prompt header.

### 3.2 Pending-edit extraction on source ingestion

- [x] `src/lib/server/librarian/extract-pending-edits.ts` calls `generateObject` against `gpt-5.4` with a Zod schema that returns candidates `{ target_doc_slug, anchor_heading, anchor_before, anchor_after, inserted_text, reason, confidence }`.
- [x] Filters: empty inserted text rejected; unknown slugs rejected; non-meeting sources require confidence ≥ 0.7.
- [x] Anchor stored as JSONB `{ heading?, before?, after? }`. `inserted_text` capped at 800 chars.
- [x] Append-only — schema CHECK + extractor never sets `deleted_text` for ingestion-origin rows.
- [x] `triggers.ts` source_ingested path passes excerpt (8000 char cap) + source type into the extractor; agent.ts wraps it with run accounting.
- [ ] Unit test for stub meeting → deferred (no test runner wired); will smoke-check by uploading a real transcript.

### 3.3 Activity logging for extraction

- [x] On successful run with > 0 edits, librarian inserts `librarian_pending_edits_extracted` activity event with `metadata.counts_by_doc_slug` and `metadata.total`.
- [x] `wiki_edit_accepted` / `wiki_edit_rejected` event types are now rendered by `eventMeta` (writers land in §4.3).
- [x] `librarian_run_failed` still written on extractor errors.

## 4. Source-detail review panel + diff viewer

### 4.1 API: list + resolve pending edits

**Files:**
- Create: `src/app/api/sources/[sourceId]/pending-edits/route.ts` (GET)
- Create: `src/app/api/wiki/pending-edits/[editId]/route.ts` (POST `accept` / `reject`)
- Create: `src/app/api/sources/[sourceId]/pending-edits/bulk/route.ts` (POST bulk accept/reject)
- Create: `src/lib/server/wiki-edits.ts`
- Create: `supabase/migrations/20260507220537_resolve_pending_wiki_edit.sql` (transactional accept/reject RPC)

- [x] `listPendingEditsForSource(sourceId)` returns rows grouped by target doc.
- [x] `acceptPendingEdit(editId)`:
  1. Fetch target doc body + edit row.
  2. Resolve anchor: try exact heading match → semantic/best-effort match → fallback to append at end of relevant section, then end of doc. Set `repositioned` / `fallback_applied` flags.
  3. Apply insertion atomically inside a transaction, append source citation reference, update edit `status = 'accepted'`, write activity event.
- [x] `rejectPendingEdit(editId)`: set `status = 'rejected'`, write activity event, no doc mutation.
- [x] `bulkResolveEditsForSource(sourceId, action)`: iterate over `pending` edits and call accept/reject per row; return per-edit results so partial failures surface to the UI. Note: single-edit resolution is transactional via RPC; bulk preserves per-edit partial failure semantics.
- [ ] Tests: accept an edit whose anchor still matches → doc updated, edit accepted. Accept an edit whose anchor was renamed → repositioned, `repositioned = true`. Accept an edit whose section was deleted → fallback to doc end, `fallback_applied = true`. Reject an edit → no doc change. → deferred; no test runner is wired in npm scripts.
- [x] Verification: `npx tsc --noEmit` passed after clearing stale `.next` generated validator files; targeted eslint on the new Section 4.1 files passed. Full `npm run lint` is blocked by pre-existing React Compiler lint errors in `activity-panel.tsx` and `chat-panel.tsx`.

### 4.2 Review panel UI

**Files:**
- Modify: `src/components/sources/sources-panel.tsx`
- Create: `src/components/sources/proposed-changes-panel.tsx`
- Create: `src/components/sources/proposed-edit-card.tsx`

- [x] Add a right-side "Proposed changes" panel to the source detail view that fetches pending edits for the selected source.
- [x] Group edits by target canonical doc with a count badge; render each as a card showing reason + short preview of the inserted text.
- [x] Provide "Accept all" and "Reject all" controls scoped to the source.
- [x] Resolved (accepted/rejected) edits remain visible in a collapsed "Resolved" group below pending ones.
- [x] Verification: `npx tsc --noEmit` passed; targeted eslint on `sources-panel.tsx`, `proposed-changes-panel.tsx`, and `proposed-edit-card.tsx` passed.

### 4.3 Click-to-jump-to-hunk diff viewer

**Files:**
- Create: `src/components/wiki/canonical-doc-diff-viewer.tsx`
- Create (if needed): `src/components/wiki/inline-diff-hunk.tsx`
- Modify: `src/components/sources/sources-panel.tsx`
- Modify: `src/app/globals.css` (flash animation)

- [x] Clicking a pending edit card slides in the target canonical doc viewer.
- [x] Render the doc with all of its pending edits inline simultaneously: insertions tinted (green), deletions struck through; each hunk has Accept / Reject buttons adjacent.
- [x] Auto-scroll + flash the hunk that was clicked (replicate Mike's `docx-edit-flash` pattern with our token system).
- [x] If the hunk was repositioned or fell back, show a small badge ("repositioned to <heading>" / "appended at end of doc") on that hunk before accept.
- [x] Closing the viewer returns focus to the proposed-changes panel; counts update live as edits resolve.
- [ ] Smoke check: ingest a stubbed meeting → open the meeting page → see the proposed-changes panel → click an edit → wiki doc slides in with inline diff → accept → doc updates and edit moves to resolved. → deferred until seeded/ingested pending edits are available locally.
- [x] Verification: `npx tsc --noEmit` passed; targeted eslint on changed source/wiki UI files passed.

## 5. Chat memory-card proposal flow

### 5.1 Server: emit chat-origin pending edit

**Files:**
- Modify: `src/lib/server/agent-tools.ts` (advisor tool surface)
- Modify: `src/app/api/chat/route.ts`

- [x] Replace any direct wiki-write tools on the advisor with a single `propose_wiki_update(target_doc_slug, content, reason)` tool.
- [x] The tool inserts a `pending_wiki_edits` row with `origin = 'chat'`, `confidence = null`, `anchor` populated when the agent specifies a target section.
- [x] The tool returns the new edit's id so the streaming chat response can attach it to the rendered message.
- [x] Verification: `npx tsc --noEmit` passed; targeted eslint on server/chat files passed.

### 5.2 Chat UI: memory card

**Files:**
- Modify: `src/components/chat/chat-panel.tsx`
- Create: `src/components/chat/wiki-proposal-card.tsx`

- [x] When a chat message includes a `propose_wiki_update` tool result, render the memory-card per the design system pattern: dashed accent border on AI surface, mono "Memory · proposed update" header, Draft pill, body referencing target doc + quoted change.
- [x] Actions: **Save to memory** (POST `/api/wiki/pending-edits/<id>` accept), **Edit draft** (inline editor that PATCHes the pending row's `inserted_text`), **Discard** (POST reject).
- [x] After resolution, collapse to a one-line summary ("Saved to decisions" / "Discarded").
- [x] States: `draft` | `editing` | `saved` | `discarded` reflected in the card UI.
- [ ] Smoke check: ask agent to record a decision → memory card appears → edit draft → save → wiki view shows the entry. → deferred until local auth/project data is available for an end-to-end chat run.
- [x] Verification: `npx tsc --noEmit` passed; targeted eslint on changed server/chat files passed. Full `npm run lint` is still blocked by pre-existing `activity-panel.tsx` React Compiler lint.

### 5.3 Edit-draft endpoint

**Files:**
- Create: `src/app/api/wiki/pending-edits/[editId]/draft/route.ts` (PATCH)

- [x] PATCH updates `inserted_text` (and optionally `target_doc_id` if user redirects to a different doc) only while `status = 'pending'` and `origin = 'chat'`.
- [x] Reject PATCH on ingestion-origin edits (those are reviewed in the source panel, not edited inline in chat).
- [ ] Test: PATCH a chat-origin pending edit → updated. PATCH an ingestion-origin edit → 400. → deferred; no test runner is wired in npm scripts.

## 6. One-shot legacy migration

### 6.1 Migration script

**Files:**
- Superseded/removed: `src/lib/server/librarian/migrate-legacy-wiki.ts`
- Superseded/removed: `src/app/api/projects/[projectId]/migrate-wiki/route.ts`
- Create: `supabase/migrations/20260507222619_source_material_migration_type.sql`

- [x] Read all rows from the legacy `project_files` table for the project. Superseded by direct schema drop at user request.
- [x] For each, classify into one of the five canonical docs based on file path/title heuristics + LLM classification when ambiguous. Superseded by direct schema drop at user request.
- [x] Emit one `pending_wiki_edits` row per legacy entry with `origin = 'ingestion'`, `source_material_id` bound to the synthetic migration source, `reason = 'Legacy wiki migration'`. Superseded by direct schema drop at user request.
- [x] Entries that the classifier rejects (low confidence, off-topic) are dropped silently and counted in the response. Superseded by direct schema drop at user request.
- [x] User reviews via the source-detail review panel? — no source for these. Either:
  - (a) Add a dedicated "Legacy migration" surface that uses the same diff viewer.
  - (b) Bind the migration to a synthetic source row of type `migration`. ← simpler, recommend.
- [x] Pick (b): create a synthetic `source_materials` row with `type = 'migration'` so the existing review panel works unchanged. Superseded by direct schema drop at user request.
- [x] After all edits are accepted or rejected, drop legacy `project_files` rows for the project. Superseded by direct schema drop at user request.
- [x] Verification: `npx tsc --noEmit` passed; targeted eslint on migration route/script and source-type helpers passed.

### 6.2 Drop legacy wiki schema

**Files:**
- Create: `supabase/migrations/20260507224616_drop_legacy_wiki_schema.sql`

- [x] Drop `project_file_versions`, `project_files`, and related indices/policies via `cascade`. User explicitly requested dropping the legacy schema now.

## 7. Cleanup pass

### 7.1 Remove dead UI / docs

**Files:** any remaining references found via grep

- [x] `grep -ri "trigger_wiki_lint\|wiki_lint\|project_files\|create_file\|edit_file" src/` → triage each hit.
  - Removed legacy project-file seed path for new projects (`src/lib/server/project-setup.ts`).
  - Removed legacy free-form wiki APIs/components/routes (`src/app/api/files/**`, `src/lib/server/project-files.ts`, old overview/glossary/files components).
  - Updated search to query `canonical_docs` instead of `project_files`.
  - No `project_files` refs remain in `src` except historical plan text.
- [ ] Remove `TODO.md` entries that this change satisfies (optional, user's call).
- [ ] Update `flow/specs/` after merge phase (handled by skill in step 4-merge).
- [x] Verification: `npx tsc --noEmit` passed; targeted eslint on cleanup files passed.

### 7.2 Smoke + regression

- [ ] Create a fresh project → 5 canonical docs seeded, wiki tab hidden by default.
- [ ] Upload a meeting transcript → review panel populates → accept all → docs updated with citations.
- [ ] Ask advisor "add this decision to decisions" → memory card → save → doc updated.
- [ ] Ask advisor a contextual question that should read the canonical docs → response cites them.
- [ ] Activity feed shows extraction + accept/reject events with sensible copy.
- [x] Run: `bun typecheck` (or project's TS check) → expect PASS. Used `npx tsc --noEmit` → PASS.
- [x] Run: `bun lint` → expect PASS. Used `npm run lint` → PASS.

## 8. Open before execute

- [x] Confirm migration strategy (6.1) — synthetic `migration` source row is simplest; implemented.
- [x] Confirm naming — kept `canonical_docs` and `pending_wiki_edits` table names.
- [x] Confirm wiki view hiding policy — link in project nav but not the default landing.
- [x] Confirm we keep markdown editor as today's plain textarea or upgrade to a richer editor in this change — kept markdown textarea.
