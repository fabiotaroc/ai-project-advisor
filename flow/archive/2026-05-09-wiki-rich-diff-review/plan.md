<!-- Approach lives in the delta specs; tasks trace to those requirements. -->

# Wiki Rich Diff Review - Implementation Plan

**Goal:** Deliver a unified wiki review drawer plus compact chat entry cards so proposed canonical memory changes are reviewable with context, evidence, and per-edit resolution before acceptance.
**Proposal:** `flow/changes/wiki-rich-diff-review/proposal.md`
**Delta spec(s):**
- `flow/changes/wiki-rich-diff-review/specs/wiki.md`
- `flow/changes/wiki-rich-diff-review/specs/chat.md`

---

## 0. Backend — patch-based edit model

### 0.1 Represent proposed changes as patches, not append-only inserts

**Files:**
- Modify: `src/lib/server/librarian/extract-pending-edits.ts`
- Modify: `src/lib/server/prompts/librarian-pending-edits.ts`
- Modify: `src/lib/server/agent-tools.ts`
- Modify: `src/lib/server/wiki-edits.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/supabase/database.types.ts`
- Create or modify: `supabase/migrations/...` only if live schema inspection confirms new columns are required

- [ ] Replace the append-only assumption with an edit model that can represent **Add**, **Update**, and **Remove** against a target canonical doc. The backend MUST be able to store the current text being replaced/removed and the proposed replacement, not only `inserted_text`.
- [ ] For source-ingestion proposals, ask the extraction step for enough anchor/replacement data to identify the specific doc span being changed. Preserve conservative behavior for destructive removals per the delta spec.
- [ ] For chat-origin proposals, update `propose_wiki_update` so it can create simple Add proposals now and leave a clear extension path for Update/Remove proposals without pretending all proposals are inserts.
- [ ] If a schema migration is needed, inspect the live Supabase project first, then add the smallest migration required for patch/hunk metadata.

- [ ] Run: `pnpm lint` → expect PASS
- [ ] Manually verify: a generated proposal can represent a replacement without losing the original text.

### 0.2 Apply patches safely and generate hunks from canonical doc context

**Files:**
- Modify: `src/lib/server/wiki-edits.ts`
- Modify: `src/components/wiki/canonical-doc-diff-viewer.tsx`
- Modify: `src/components/wiki/inline-diff-hunk.tsx`

- [ ] Replace `resolveInsertionLocation` as the only acceptance path with patch application logic that locates the intended doc span, verifies the current canonical doc still matches the expected base text, and then applies Add/Update/Remove behavior.
- [ ] Generate UI hunks from the canonical doc plus patch metadata: unchanged nearby context, deleted/base text, and inserted/replacement text. Do not rely on append location alone to create hunks.
- [ ] If the expected base span no longer matches, mark the proposal as stale/needs review and avoid silently applying it.

- [ ] Run: `pnpm lint` → expect PASS
- [ ] Manually verify: replacement patches create before/after hunks and acceptance changes only the intended doc span.

### 0.3 Preserve authorship and activity metadata

**Files:**
- Modify: `src/lib/server/wiki-edits.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/supabase/database.types.ts` only if generated types change after schema work
- Modify: `supabase/migrations/...` only if live schema inspection confirms missing audit fields

- [ ] Preserve the existing `created_by`, `resolved_by`, `created_at`, and `resolved_at` audit trail for every proposed wiki edit while changing the edit model from append-only to patch-based.
- [ ] Ensure accepted/rejected activity events include enough metadata to reopen the relevant review context: `edit_id`, target doc identity, source identity when present, action, actor, timestamp, and patch/edit type.
- [ ] Do **not** build a full per-line wiki blame view in this change; only keep the durable metadata needed for future blame/history features.

- [ ] Run: `pnpm lint` → expect PASS
- [ ] Manually verify: after accepting/rejecting a proposal, the edit row and activity event identify the proposer and resolver.

## 1. Wiki — unified drawer, diff, and source entry

### 1.1 Drawer shell and multi-document grouping

**Files:**
- Modify: `src/components/wiki/canonical-doc-diff-viewer.tsx`
- Modify: `src/app/globals.css` (only if new layout tokens or motion are required; prefer existing Sheet/surface tokens)

- [ ] Treat the review surface as the primary full-height right-side drawer (spacious layout, clear header, scrollable body) while staying on the current page.
- [ ] When pending edits span more than one target canonical document, show **grouped-by-doc** navigation inside the drawer so the user can scan and switch doc groups without closing it (per wiki delta *Grouped doc review*).
- [ ] Keep *click-to-jump* behavior: choosing an edit in the source sidebar opens the drawer and scrolls to that edit’s hunk in the active doc group (per wiki MODIFIED *Click-to-jump-to-hunk*).

- [ ] Run: `pnpm lint` → expect PASS  
- [ ] Manually verify on a source detail page with pending edits: open drawer, switch doc groups if multiple, select an edit from the list and confirm scroll-to-hunk.

### 1.2 Proposed-changes sidebar as compact launcher

**Files:**
- Modify: `src/components/sources/proposed-changes-panel.tsx`
- Modify: `src/components/sources/sources-panel.tsx` (only if wiring props or callbacks for the new summary + primary review action)

- [ ] Present the sidebar as a **compact summary and status** surface with a clear primary action to open the unified drawer; avoid making the sidebar the only place for detailed diff review (per wiki MODIFIED *Source-detail review panel*).
- [ ] Preserve **resolved** edits in a collapsed or secondary section that remains auditable without overwhelming pending work (per wiki ADDED *Resolved-state visibility*).

- [ ] Run: `pnpm lint` → expect PASS  
- [ ] Manually verify: pending count, review action, resolved section behavior.

### 1.3 Project-language edit types and contextual diff

**Files:**
- Modify: `src/components/wiki/inline-diff-hunk.tsx`
- Modify: `src/components/wiki/canonical-doc-diff-viewer.tsx` (if shared helpers for typing or block layout live better here)

- [ ] Label each hunk for users as **Add**, **Update**, or **Remove** based on `inserted_text` / `deleted_text` (and any future explicit type field if the backend adds one), avoiding Git-style jargon (wiki ADDED *Project-language edit types*).
- [ ] For **updates**, show before/after together; for **additions**, show placement in doc context; for **removals**, label the removal clearly and show the removed text prominently before acceptance.
- [ ] Continue to show nearby canonical doc context around hunks where the spec calls for contextual preview (wiki ADDED *Contextual diff preview*).

- [ ] Run: `pnpm lint` → expect PASS  
- [ ] Manually verify: sample Add-only, Update (insert+delete), and Remove-only proposals render with correct labels and emphasis.

### 1.4 Source evidence in the drawer

**Files:**
- Modify: `src/lib/types.ts` (only if extending `PendingWikiEdit` or a view-model type for evidence payloads)
- Modify: `src/lib/server/wiki-edits.ts` and/or pending-edits API route(s) under `src/app/api/`
- Modify: `src/components/wiki/canonical-doc-diff-viewer.tsx` (or a small child component beside it)

- [ ] For each selected pending edit, show **source grounding**: linked source artifact when `source_material_id` is present, plus reason and confidence fields already on the edit; excerpt/quote **when available** from existing data — do not invent storage (wiki ADDED *Source evidence panel*). For chat-origin rows with no source, show an explicit “Chat proposal” (or equivalent) grounding state.
- [ ] Reuse a single server query shape for listing/loading edits so the drawer does not N+1 fetch evidence.

- [ ] Run: `pnpm lint` → expect PASS  
- [ ] Manually verify: ingestion-sourced edit shows source identity; chat-origin edit shows non-misleading grounding.

### 1.5 Drift, stale anchor, and conflict surfacing

**Files:**
- Modify: `src/components/wiki/inline-diff-hunk.tsx` and/or `src/components/wiki/canonical-doc-diff-viewer.tsx`
- Modify: `src/lib/server/wiki-edits.ts` only if server-side detection is required beyond existing `repositioned` / `fallback_applied` flags

- [ ] Map existing and new placement metadata into **user-facing review states** (e.g. repositioned/lost anchor/stale proposal) before accept is offered, consistent with wiki ADDED *Conflict and drift states* and MODIFIED *Anchor drift handling* — silent apply is unacceptable.
- [ ] Where the canonical doc body no longer matches the proposal anchor, surface “needs attention” and block or gate accept until reconciled per product rules (coordinate with acceptance behavior).

- [ ] Run: `pnpm lint` → expect PASS  
- [ ] Manually verify with a fabricated or test doc: change wiki body after proposal creation and confirm warning state.

### 1.6 Bulk actions and API alignment

**Files:**
- Modify: `src/components/sources/proposed-changes-panel.tsx`
- Modify: `src/app/api/sources/[sourceId]/pending-edits/bulk/route.ts` (only if semantics must change)
- Modify: `src/lib/server/wiki-edits.ts` (only if bulk behavior must change)

- [ ] Offer bulk accept/reject for visible pending edits in the review drawer, including **Add**, **Update**, and **Remove**, after the user has opened the review context — wiki MODIFIED *Bulk accept and reject*.

- [ ] Run: `pnpm lint` → expect PASS  
- [ ] Manually verify bulk control visibility and behavior when a pending set mixes Add, Update, and Remove proposals.

### 1.7 Activity page integration for wiki diffs

**Files:**
- Modify: `src/components/activity/activity-panel.tsx`
- Modify: `src/components/activity/activity-shared.tsx` only if labels or icons need adjustment
- Modify: `src/lib/server/data.ts` only if activity payload normalization needs additional fields

- [ ] Keep `wiki_edit_accepted` and `wiki_edit_rejected` visible on the activity page with user-facing labels.
- [ ] Update activity links so wiki edit events open the relevant review context or target doc with enough URL state to focus the associated edit, rather than linking only to the generic wiki page.
- [ ] Show or preserve the actor and timestamp information needed for multi-user auditability.

- [ ] Run: `pnpm lint` → expect PASS
- [ ] Manually verify: accept/reject a wiki edit, then open Activity and navigate from the event back to the relevant wiki review context.

---

## 2. Chat — compact proposals and unified drawer entry

### 2.1 Load and open the unified drawer from chat

**Files:**
- Modify: `src/components/chat/chat-panel.tsx`
- Modify: `src/components/chat/wiki-proposal-card.tsx`
- Modify: `src/components/wiki/canonical-doc-diff-viewer.tsx` (or extract a thin wrapper shared by chat and sources)
- Modify: `src/lib/server/wiki-edits.ts` — add **`listPendingEditsForProjectDoc`** (or equivalent) so the drawer can load **all pending edits for a project + target doc** when `source_material_id` is null
- Create: `src/app/api/wiki/pending-edits/...` **or** extend an existing wiki route — **single** list endpoint keyed by project + `target_doc_id` (preferred) or by “seed edit id” resolved server-side with auth checks

- [ ] **MUST** allow opening the **same unified review drawer** from a wiki proposal card in chat with the relevant pending edit focused (chat ADDED *Open review from chat*). Implement by extending data loading beyond `GET /api/sources/:sourceId/pending-edits` so chat-bound proposals work when no source row exists.
- [ ] Passing **project ID** into `ChatPanel` (or deriving it from conversation scope) MUST be possible for fetching doc-scoped groups; thread this to the drawer opener.
- [ ] Remove the persistent chat right rail from the review path. The rich wiki review SHOULD open as a modal right-side drawer layered over the chat workspace, while memory-draft review lives in proposal cards plus the drawer rather than in a rail.

- [ ] Run: `pnpm lint` → expect PASS  
- [ ] Manually verify: from chat, tap Review on a proposal; drawer opens with correct doc and scrolled hunk; resolution refreshes sidebar/chat state paths as implemented.

### 2.1a Remove the chat right rail and keep citations inline

**Files:**
- Modify: `src/components/chat/chat-panel.tsx`

- [ ] Remove the persistent **Citations / Memory Drafts / Conversation Facts** right rail and its collapsed state from the chat layout.
- [ ] Move citation details to hover/focus popovers on the existing assistant-message citation pills, preserving keyboard access and click-through to the source detail page.
- [ ] Drop the conversation facts surface from chat for this flow; do not replace it unless a separate product need appears.

- [ ] Run: `pnpm lint` → expect PASS
- [ ] Manually verify: citation pill hover/focus shows source title/excerpt, click opens the source, and chat no longer reserves a right-side rail column.

### 2.2 Compact card UI and primary resolution path

**Files:**
- Modify: `src/components/chat/wiki-proposal-card.tsx`

- [ ] Cards **MUST** stay compact: target doc identity, edit type summary, short reason/status — **no large inline diff** (chat ADDED *Compact proposal summary*; REMOVED *Chat as primary diff surface*).
- [ ] Prefer **accept/save substantive changes from the drawer**; keep lightweight **discard** only if aligned with chat MODIFIED *Discard action*.

- [ ] Run: `pnpm lint` → expect PASS

### 2.3 Review status sync and partial resolution

**Files:**
- Modify: `src/components/chat/wiki-proposal-card.tsx`
- Modify: `src/components/chat/chat-panel.tsx` if message/tool output patching is needed after drawer closes

- [ ] Reflect **accepted/rejected/pending** on the chat card **after actions in the drawer** (polling, refetch on focus, or callback from parent) — chat ADDED *Chat review status sync*.
- [ ] When one card represents **multiple** related wiki edits (optional per chat MODIFIED *Proposal scope*), show **partially resolved** state until all related edits settle — chat ADDED *Partial-resolution status*.

- [ ] Run: `pnpm lint` → expect PASS  
- [ ] Manually verify accept in drawer updates card without full page reload.

### 2.4 Editing drafts from chat

**Files:**
- Modify: `src/components/chat/wiki-proposal-card.tsx`

- [ ] Allow **simple Add** drafts to remain editable in-chat where cheap; steer **rich Update/Remove** editing toward the drawer (chat MODIFIED *Edit draft action*).

- [ ] Run: `pnpm lint` → expect PASS

---

## 3. Final verification

### 3.1 Spec cross-check and build

- [ ] Walk the ADDED/MODIFIED bullets in **both** `specs/wiki.md` and `specs/chat.md` and confirm each has a covering task above; adjust tasks if gaps appear during implementation (*Update as you learn* per specflow).
- [ ] Run: `pnpm lint` && `pnpm build` → expect PASS

---

When this plan looks right, pause for review before entering **Execute** (implement tasks in order, updating the delta specs if discoveries force it).
