# Wiki Specification

## Purpose

The wiki domain covers each project's canonical documentation surface: fixed default docs, user-pinned custom docs, direct editing, and reviewable proposed changes from sources or chat.

## Design

The wiki is a per-project collection of named markdown documents with a stable schema. Each project has five default canonical docs: `project`, `decisions`, `people`, `work`, and `glossary`. Users may add explicitly pinned custom docs, which join the canonical set for that project. The wiki view lists only default docs and user-pinned custom docs; arbitrary agent-generated pages and nested free-form hierarchies do not exist.

Wiki docs may be changed through direct user edits, saved chat proposals, or accepted pending edits from source ingestion. Source-ingestion proposals are stored as per-doc hunks with an anchor, inserted content, reason, source reference, status, and confidence. Pending edits are reviewed inside a unified, full-height right-side review drawer that can be opened from source detail pages, chat proposal cards, and (later) wiki documents. Source detail pages keep a compact proposed-changes summary that launches the drawer rather than rendering rich diffs in cramped cards. Nothing from ingestion is applied silently.

The drawer uses project-language labels — Add, Update, Remove — instead of exposing a Git workflow, while still showing enough before/after canonical context to support trustworthy review. Insertions and replacements are first-class; deletions are supported as a higher-risk review state and source-ingestion-derived removals MAY be deferred until destructive extraction behavior is explicitly specified.

Legacy free-form wiki content is retired in favor of canonical docs. Existing legacy wiki entries are handled as a one-shot migration or cleanup path; content that does not fit canonical docs may be discarded while original sources remain the durable source of truth.

## Requirements

- **Canonical doc set** — Each project MUST have exactly the five default canonical docs (`project`, `decisions`, `people`, `work`, `glossary`) created at project creation, plus any user-pinned custom docs.
  - *Scenario:* Given a newly created project, when the user opens the wiki view, then they see exactly five default docs with empty bodies and no other entries.
- **User-pinned custom docs** — A user MUST be able to add a custom canonical doc by providing a slug and title; the doc then appears alongside the defaults in the wiki view.
  - *Scenario:* Given a hardware project, when the user pins a `bom` doc, then `bom` appears in the wiki list and may receive proposals like any default doc.
- **Doc-level deletion of custom docs** — A user MUST be able to remove a user-pinned custom doc; default docs MUST NOT be deletable.
  - *Scenario:* Given a project with a pinned `bom` doc, when the user removes it, then it disappears from the wiki and its content is discarded; attempting to remove `decisions` MUST fail.
- **Wiki view as primary surface** — The wiki MUST be reachable via a dedicated tab or view in the project navigation. Default docs MUST be visually distinguishable from user-pinned docs.
- **One-shot migration of legacy wiki content** — Existing wiki entries MUST be consolidated into the five default canonical docs via a one-time migration or intentionally removed during legacy cleanup; entries that do not fit MUST be discarded.
  - *Scenario:* Given a project with legacy wiki entries about decisions, team members, and free-form notes, when migration runs, then decision entries land in `decisions`, team entries in `people`, and free-form notes that match no canonical doc are dropped.
- **Wiki content authorship** — Wiki docs MUST only be modified through direct user edits in the wiki view, saved proposals from chat, or accepted updates from source ingestion.
- **Wiki search and retrieval** — The advisor agent MAY read canonical docs as part of its context but MUST NOT write to them from chat outside the proposal flow.
- **Pending edit data shape** — Each pending edit MUST capture target canonical doc, anchor location, inserted text, deleted text if any, reason, source artifact reference, status (`pending` | `accepted` | `rejected`), and confidence indicator.
- **Source-detail review panel** — The source detail page for a meeting, email, or file MUST surface a compact "Proposed changes" summary listing pending edits derived from that source, grouped by target canonical doc, that acts as a launch and status surface for the unified review drawer rather than the primary inspection surface.
  - *Scenario:* Given a newly ingested meeting transcript with two decisions and three action items, when the user opens the meeting page, then the sidebar summarizes five pending edits grouped under `decisions` and `work` and offers a clear review action that opens the unified drawer.
- **Click-to-jump-to-hunk** — Selecting a pending edit MUST open or focus the unified review drawer and scroll to the relevant doc context within the drawer, with per-edit Accept and Reject controls adjacent to the affected hunk.
  - *Scenario:* Given a pending edit on `work`, when the user clicks it, then the unified review drawer opens, scrolls to the relevant section, highlights the proposed action item, and shows Accept and Reject buttons next to that hunk.
- **Inline rendering of all pending edits in viewer** — The review drawer MUST show all pending edits for the selected target doc together, with navigation between doc groups when multiple docs are affected, so the user can see the full proposed state of each doc.
- **Bulk accept and reject** — Bulk Accept and Reject actions MUST be available for the visible pending edits in the unified review drawer once the user has opened the review context, scoped per source or per target doc.
- **Atomic application** — Accepting an edit MUST apply only that edit's hunk to the target doc atomically and transition the edit to `accepted`. Rejecting an edit MUST transition it to `rejected` without modifying the doc.
- **Append-only ingestion edits** — Ingestion-derived edits MUST support Add and Update review states (insertions and replacements of an existing span). Source-ingestion support for Remove MAY be deferred or restricted until destructive extraction behavior is explicitly specified; the librarian MUST NOT propose deletion-only edits during ingestion in this version.
- **Source citation in applied content** — When an edit is accepted, the inserted content MUST include a reference back to the originating source artifact, so canonical doc content can be traced to its origin.
- **Resolution visibility** — Accepted and rejected edits MUST remain visible in the source detail panel as resolved and collapsed, so the user can audit which proposals were applied.
- **Activity feed** — Accepting or rejecting edits MUST be reflected in the activity feed as discrete events with target doc, source link, and action.
- **No auto-apply** — The system MUST NOT apply ingestion-derived edits without explicit user action. There is no background apply-on-ingest path.
- **Anchor drift handling** — If the target doc has changed between extraction and acceptance such that the original anchor no longer matches, the system MUST best-effort reposition the hunk. If repositioning fails, the system MUST fall back to appending the insertion at the end of the relevant section or the end of the doc. Drift handling MUST surface user-facing review states such as "Moved", "Needs review", or "Already changed" and show the proposed location before acceptance, instead of silently rewriting the doc.
  - *Scenario:* Given a pending edit anchored under "Q2 actions" and the user has since renamed that section to "Q2 work", when the user opens the diff, then the hunk renders under the renamed section with a "Moved" indicator that the anchor was repositioned.
  - *Scenario:* Given a pending edit whose target span no longer matches the current doc body, when the user opens the diff, then the proposal is marked as needing attention before acceptance.
- **No emergent wiki entries** — The wiki MUST NOT contain any documents beyond the five defaults plus user-pinned custom docs.
- **No background wiki linting** — The system MUST NOT periodically or automatically restructure wiki content in the background.
- **Unified review drawer** — The system MUST provide a spacious right-side review drawer for inspecting pending canonical wiki edits, openable from source detail pages, chat proposal cards, and (later) wiki documents.
  - *Scenario:* Given a source has pending wiki edits, when the user chooses to review changes, then a full-height review drawer opens without navigating away from the source detail page.
- **Review entry summary** — Source detail pages MUST be able to show a compact proposed-changes summary that opens the unified review drawer rather than rendering full diffs inline.
  - *Scenario:* Given a meeting produced five proposed wiki edits, when the user views the meeting detail page, then the sidebar summarizes the number and target docs and offers a clear review action.
- **Grouped doc review** — The unified review drawer MUST group pending edits by target canonical document.
  - *Scenario:* Given proposed edits target `decisions` and `work`, when the review drawer opens, then the user can see both doc groups and switch between or scan them without leaving the drawer.
- **Project-language edit types** — User-facing UI MUST label edit types as Add, Update, and Remove, not technical replacement/hunk terminology.
  - *Scenario:* Given a proposed replacement of an existing decision, when the user sees the change summary, then it is labeled as an Update.
- **Contextual diff preview** — Proposed edits MUST be shown against nearby canonical doc context, not as standalone snippets.
  - *Scenario:* Given a proposed update under a decision heading, when the user opens the edit in review, then the surrounding heading and nearby canonical text are visible alongside the proposed change.
- **Insertion review** — Additions MUST be shown as new proposed wiki content with clear placement in the canonical doc.
  - *Scenario:* Given a proposed new action item, when the user reviews it, then the UI shows where the new item would be added and provides Accept and Reject actions for that item.
- **Replacement review** — Updates MUST be shown as before/after changes, with the current wiki text and the proposed replacement visible together.
  - *Scenario:* Given an existing vendor decision is proposed to change, when the user reviews it, then the UI shows the current text and the proposed updated text before acceptance.
- **Removal clarity** — Removals MUST be labeled clearly and show the removed text prominently before acceptance.
  - *Scenario:* Given an edit proposes removing canonical wiki text, when the user reviews it, then the UI labels it as a removal and shows the removed text prominently before the user accepts the change.
- **Source evidence panel** — The review drawer MUST show source grounding for each pending edit, including source artifact, supporting excerpt or quote when available, reason, and confidence.
  - *Scenario:* Given a proposed update was extracted from a meeting, when the user selects that update, then the review drawer shows the meeting title and the evidence that supports the proposed change.
- **Per-edit resolution** — The review drawer MUST let users accept or reject each pending edit individually.
  - *Scenario:* Given a doc group contains three pending edits, when the user accepts one and rejects another, then only those selected edits are resolved and the remaining edit stays pending.
- **Resolved-state visibility** — Accepted and rejected edits MUST remain visible in a collapsed or secondary state so the audit trail is preserved without dominating the pending list.
  - *Scenario:* Given a user accepted a proposed decision update, when they revisit the source's proposed changes, then the accepted change remains auditable without dominating the pending review list.
- **Edit authorship trail** — The system MUST preserve who proposed and who resolved each pending wiki edit.
  - *Scenario:* Given a teammate accepts a proposed decision update, when another teammate reviews the edit later, then the system can show who proposed it, who accepted it, and when it was resolved.
- **Activity entry to review context** — Accepted and rejected wiki edit activity entries MUST link back to the relevant review context (source detail or target doc) rather than a generic wiki page when possible.
  - *Scenario:* Given a wiki edit was accepted from the review drawer, when the user opens the activity page entry, then they can navigate to the associated wiki review context or target doc.
- **Conflict and drift states** — The drawer MUST surface stale, moved, duplicated, or no-longer-matching proposals before acceptance instead of applying them silently.
  - *Scenario:* Given the target wiki text changed after an update proposal was created, when the user opens the review drawer, then the UI marks the proposal as needing attention.
