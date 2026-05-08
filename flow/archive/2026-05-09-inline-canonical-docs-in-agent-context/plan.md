# Inline canonical docs in agent context - Implementation Plan

**Goal:** Load full canonical doc bodies into advisor and pending-edit extraction context so agent behavior is grounded in existing project knowledge.
**Proposal:** `flow/changes/inline-canonical-docs-in-agent-context/proposal.md`
**Delta spec(s):**
- `flow/changes/inline-canonical-docs-in-agent-context/specs/chat.md`
- `flow/changes/inline-canonical-docs-in-agent-context/specs/librarian.md`

---

## 1. Shared Canonical Doc Rendering

### 1.1 Add a shared prompt formatter

**Files:**
- Create: `src/lib/server/prompts/canonical-docs.ts`

- [x] Add a server-only formatter that accepts canonical doc rows with slug, title, body, `is_default`, and `is_pinned`.
- [x] Sort docs defaults-first, then pinned customs, alphabetically by slug within each group.
- [x] Render each doc with slug, title, default/pinned status, and full markdown body in a delimited block.
- [x] Preserve empty bodies explicitly without truncating or compressing content.

## 2. Advisor Chat Context

### 2.1 Inline full canonical docs in initial advisor context

**Files:**
- Modify: `src/lib/server/chat-context.ts`

- [x] Select canonical doc `body` alongside slug, title, and default/pinned metadata.
- [x] Replace the existing slug/title inventory with the shared full-body canonical doc formatter.
- [x] Ensure the canonical-doc prompt section communicates that docs are already loaded into the advisor context.
- [x] Keep project metadata, settings, current-user context, source citation prompt, and non-wiki source behavior unchanged.

### 2.2 Remove redundant advisor canonical-doc tools

**Files:**
- Modify: `src/lib/server/agent-tools.ts`
- Modify: `src/lib/server/prompts/chat-agent.ts`

- [x] Remove `list_canonical_docs` and `read_canonical_doc` from the advisor tool surface.
- [x] Remove tool implementations if they become unused.
- [x] Update advisor identity/tool prompt text so it no longer tells the agent to call canonical-doc read/list tools.
- [x] Preserve `search_sources`, `read_source`, `propose_wiki_update`, and `record_suggestion` behavior.

### 2.3 Remove stale UI status labels for removed tools

**Files:**
- Modify: `src/components/chat/chat-panel.tsx`

- [x] Remove UI labels and derived running text for `list_canonical_docs` and `read_canonical_doc` tool calls if they are now unreachable.
- [x] Preserve display behavior for remaining tools.

## 3. Librarian Pending-Edit Extraction

### 3.1 Use full canonical docs in extraction context

**Files:**
- Modify: `src/lib/server/librarian/extract-pending-edits.ts`
- Modify: `src/lib/server/prompts/librarian-pending-edits.ts`

- [x] Replace the heading-only catalog construction with the shared full-body canonical doc formatter.
- [x] Keep all project canonical docs in scope, including pinned customs.
- [x] Update extraction prompt wording from heading previews to full doc bodies and require anchors to use headings that appear in the shown body.
- [x] Preserve append-only behavior, source citation requirements, confidence thresholds, filtering, persistence, and counts.

## 4. Verification

### 4.1 Static and behavior checks

**Files:**
- Modify as needed based on implementation feedback.

- [x] Run: `npm run lint` → expect PASS or only pre-existing unrelated warnings.
- [x] Run: `npm run build` → expect PASS.
- [x] Inspect generated advisor system prompt path enough to confirm canonical doc bodies are included and canonical-doc read/list tools are not exposed.
- [x] Inspect pending-edit extraction prompt path enough to confirm full canonical doc bodies, not heading previews, are passed to the model.
