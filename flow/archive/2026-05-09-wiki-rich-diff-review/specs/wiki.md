# Delta Spec: Wiki Rich Diff Review

**Goal:** replace cramped pending-edit review surfaces with a unified, spacious wiki review drawer for source-grounded canonical doc changes.
**Domain:** `wiki`

## Design

The wiki review experience becomes a reusable, full-height right-side review drawer that can be opened from source detail pages, chat proposal cards, and later wiki documents. Source detail pages keep a lightweight proposed-changes summary in the sidebar, but detailed inspection happens in the drawer. The drawer uses project-language labels such as "Add", "Update", and "Remove" instead of exposing a Git workflow, while still showing enough before/after context to support trustworthy review. For the first UI iteration, insertions and replacements are first-class; deletions are represented as a higher-risk review state and MAY be deferred for ingestion-generated proposals until the product is ready to support destructive source-derived edits safely.

## ADDED

- **Unified review drawer** — MUST provide a spacious right-side review drawer for inspecting pending canonical wiki edits.
  - *Scenario:* Given a source has pending wiki edits, when the user chooses to review changes, then a full-height review drawer opens without navigating away from the source detail page.

- **Review entry summary** — MUST allow source detail pages to show a compact proposed-changes summary that opens the unified review drawer.
  - *Scenario:* Given a meeting produced five proposed wiki edits, when the user views the meeting detail page, then the sidebar summarizes the number and target docs and offers a clear review action instead of requiring review inside cramped cards.

- **Grouped doc review** — MUST group pending edits by target canonical document inside the review drawer.
  - *Scenario:* Given proposed edits target `decisions` and `work`, when the review drawer opens, then the user can see both doc groups and switch between or scan them without leaving the drawer.

- **Project-language edit types** — MUST label edit types as Add, Update, and Remove in user-facing UI.
  - *Scenario:* Given a proposed replacement of an existing decision, when the user sees the change summary, then it is labeled as an Update rather than a technical replacement hunk.

- **Contextual diff preview** — MUST show proposed edits against nearby canonical doc context.
  - *Scenario:* Given a proposed update under a decision heading, when the user opens the edit in review, then the surrounding heading and nearby canonical text are visible alongside the proposed change.

- **Insertion review** — MUST show additions as new proposed wiki content with clear placement in the canonical doc.
  - *Scenario:* Given a proposed new action item, when the user reviews it, then the UI shows where the new item would be added and provides Accept and Reject actions for that item.

- **Replacement review** — MUST show updates as before/after changes, with the current wiki text and the proposed replacement visible together.
  - *Scenario:* Given an existing vendor decision is proposed to change, when the user reviews it, then the UI shows the current text and the proposed updated text before acceptance.

- **Removal clarity** — MUST label removals clearly and show the removed text prominently before acceptance.
  - *Scenario:* Given an edit proposes removing canonical wiki text, when the user reviews it, then the UI labels it as a removal and shows the removed text prominently before the user accepts the change.

- **Source evidence panel** — MUST show source grounding for each pending edit, including source artifact, supporting excerpt or quote when available, reason, and confidence.
  - *Scenario:* Given a proposed update was extracted from a meeting, when the user selects that update, then the review drawer shows the meeting title and the evidence that supports the proposed change.

- **Per-edit resolution** — MUST let users accept or reject each pending edit from the review drawer.
  - *Scenario:* Given a doc group contains three pending edits, when the user accepts one and rejects another, then only those selected edits are resolved and the remaining edit stays pending.

- **Resolved-state visibility** — MUST preserve accepted and rejected edit history in a collapsed or secondary state.
  - *Scenario:* Given a user accepted a proposed decision update, when they revisit the source's proposed changes, then the accepted change remains auditable without dominating the pending review list.

- **Edit authorship trail** — MUST preserve who proposed and who resolved each pending wiki edit.
  - *Scenario:* Given a teammate accepts a proposed decision update, when another teammate reviews the edit later, then the system can show who proposed it, who accepted it, and when it was resolved.

- **Activity entry to review context** — MUST make accepted and rejected wiki edit activity point back to the relevant review context when possible.
  - *Scenario:* Given a wiki edit was accepted from the review drawer, when the user opens the activity page entry, then they can navigate to the associated wiki review context or target doc rather than a generic wiki page.

- **Conflict and drift states** — MUST surface stale, moved, duplicated, or no-longer-matching proposals before acceptance.
  - *Scenario:* Given the target wiki text changed after an update proposal was created, when the user opens the review drawer, then the UI marks the proposal as needing attention instead of applying it silently.

## MODIFIED

- **Source-detail review panel** — updated: source detail pages SHOULD use the sidebar proposed-changes area as a compact launch and status surface, while the full review happens in the unified drawer. (Previously: the source detail page listed per-edit cards in a constrained panel and opened a doc-focused diff sheet from individual cards.)

- **Click-to-jump-to-hunk** — updated: selecting a pending edit MUST open or focus the unified review drawer and scroll to the relevant doc context within that drawer. (Previously: selecting a pending edit opened a target canonical doc slide-in viewer.)

- **Inline rendering of all pending edits in viewer** — updated: the review drawer SHOULD show all pending edits for the selected target doc together, with navigation between doc groups when multiple docs are affected. (Previously: the viewer focused on all pending edits for the selected doc only.)

- **Bulk accept and reject** — updated: bulk actions SHOULD be available for visible pending edits in the review drawer after the user has opened the review context. (Previously: accept all and reject all applied uniformly from the constrained source panel.)

- **Append-only ingestion edits** — updated: the UI model SHOULD support Add and Update review states now, while source-ingestion support for Remove MAY be deferred or restricted until destructive extraction behavior is explicitly specified. (Previously: ingestion-derived edits were limited to additive insertions or appends.)

- **Anchor drift handling** — updated: drift handling MUST use user-facing review states such as "Moved", "Needs review", or "Already changed" and show the proposed location before acceptance. (Previously: repositioned and fallback locations were shown primarily as placement notes.)

## REMOVED

- **Cramped card-only review** — reason for removal: canonical memory changes require more context than small sidebar cards can provide.

## Out of Scope

- Building a full wiki version history browser.
- Building a full per-line "blame" view for canonical wiki documents.
- Creating a visible branching, commit, or merge model.
- Redesigning canonical document authoring/editing itself.
- Automatically extracting or applying deletion proposals from ingestion without a separate product decision.
