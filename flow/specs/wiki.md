# Wiki Specification

## Purpose

The wiki domain covers each project's canonical documentation surface: fixed default docs, user-pinned custom docs, direct editing, and reviewable proposed changes from sources or chat.

## Design

The wiki is a per-project collection of named markdown documents with a stable schema. Each project has five default canonical docs: `project`, `decisions`, `people`, `work`, and `glossary`. Users may add explicitly pinned custom docs, which join the canonical set for that project. The wiki view lists only default docs and user-pinned custom docs; arbitrary agent-generated pages and nested free-form hierarchies do not exist.

Wiki docs may be changed through direct user edits, saved chat proposals, or accepted pending edits from source ingestion. Source-ingestion proposals are stored as per-doc hunks with an anchor, inserted content, reason, source reference, status, and confidence. They are reviewed from the source detail surface, where users can inspect inline diffs, accept or reject individual hunks, or resolve all pending edits for a source in bulk. Nothing from ingestion is applied silently.

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
- **Source-detail review panel** — The source detail page for a meeting, email, or file MUST surface a "Proposed changes" side panel listing all pending edits derived from that source, grouped by target canonical doc.
  - *Scenario:* Given a newly ingested meeting transcript with two decisions and three action items, when the user opens the meeting page, then a side panel on the right lists five pending edits grouped under `decisions` and `work`.
- **Click-to-jump-to-hunk** — Selecting a pending edit in the review panel MUST open the target canonical doc in a slide-in viewer and scroll to and highlight the affected hunk inline. Insertions MUST render as inline additions and deletions MUST render as inline strikethrough at the anchor location. Per-hunk Accept and Reject controls MUST appear adjacent to the highlighted hunk.
  - *Scenario:* Given a pending edit on `work`, when the user clicks it, then the `work` doc slides in, scrolls to the relevant section, flashes the proposed action item as an inline insertion, and shows Accept and Reject buttons next to that hunk.
- **Inline rendering of all pending edits in viewer** — When the canonical doc is opened from the review panel, all pending edits targeting that doc MUST be visible inline simultaneously, so the user can see the full proposed state of the doc.
- **Bulk accept and reject** — The review panel MUST support "Accept all" and "Reject all" actions per source, applying or discarding every pending edit derived from that source in one operation.
- **Atomic application** — Accepting an edit MUST apply only that edit's hunk to the target doc atomically and transition the edit to `accepted`. Rejecting an edit MUST transition it to `rejected` without modifying the doc.
- **Append-only ingestion edits** — Ingestion-derived edits MUST be additive insertions or appends. The librarian MUST NOT propose deletions or rewrites of existing wiki content during ingestion.
- **Source citation in applied content** — When an edit is accepted, the inserted content MUST include a reference back to the originating source artifact, so canonical doc content can be traced to its origin.
- **Resolution visibility** — Accepted and rejected edits MUST remain visible in the source detail panel as resolved and collapsed, so the user can audit which proposals were applied.
- **Activity feed** — Accepting or rejecting edits MUST be reflected in the activity feed as discrete events with target doc, source link, and action.
- **No auto-apply** — The system MUST NOT apply ingestion-derived edits without explicit user action. There is no background apply-on-ingest path.
- **Anchor drift handling** — If the target doc has changed between extraction and acceptance such that the original anchor no longer matches, the system MUST best-effort reposition the hunk. If repositioning fails, the system MUST fall back to appending the insertion at the end of the relevant section or the end of the doc. The repositioned or fallback location MUST be visible to the user before acceptance.
  - *Scenario:* Given a pending edit anchored under "Q2 actions" and the user has since renamed that section to "Q2 work", when the user opens the diff, then the hunk renders under the renamed section with an indicator that the anchor was repositioned.
  - *Scenario:* Given a pending edit whose section no longer exists, when the user opens the diff, then the hunk renders as an append at the end of the doc with a fallback-location indicator.
- **No emergent wiki entries** — The wiki MUST NOT contain any documents beyond the five defaults plus user-pinned custom docs.
- **No background wiki linting** — The system MUST NOT periodically or automatically restructure wiki content in the background.
