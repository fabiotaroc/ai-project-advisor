# Chat Specification

## Purpose

The chat domain covers conversational advisor behavior, including user-requested canonical wiki updates through reviewable proposal cards.

## Design

When a user explicitly asks the advisor to update a canonical doc, chat emits a structured proposal card instead of writing to the wiki by side effect. The card stays compact and acts as a launcher and status surface: it summarizes the target doc, edit type, short reason, and current review state. Detailed inspection and resolution of substantive wiki changes happens in the same unified wiki review drawer used by source detail pages, so chat threads stay readable while canonical-memory changes still get a trustworthy review path.

A proposal card may summarize one or more closely related underlying edits produced by a single user request, but each underlying edit remains individually reviewable in the drawer. Cards move through `draft`, `editing`, `saved`/`accepted`, `partially resolved`, and `discarded`/`rejected` states and reflect resolutions made elsewhere. Saving or accepting substantive wiki changes happens from the review drawer; chat MAY keep a lightweight inline discard for simple pending proposals. Source-ingestion-triggered wiki updates use the source review flow, not chat proposal cards.

Chat does not render a persistent right rail. Source citations from assistant messages are surfaced as inline popovers tied to citation pills, and pending wiki memory review is represented by proposal cards plus the unified review drawer.

The advisor's initial chat-agent context for a conversation run includes the full markdown body of every canonical doc that belongs to the project, including the five defaults and any pinned customs. Docs are labeled with slug, title, and default/pinned status, ordered defaults-first then pinned customs by slug, and reused for subsequent turns of the same active run unless a new run context is initialized. Because canonical docs are present in the run context, the advisor does not expose read-only canonical-doc listing or reading tools; source material remains available through source-search tools.

## Requirements

- **Wiki proposal message type** — Chat MUST support a structured proposal message with target doc, edit type, short reason, and resolution state, rendered as a compact launch/status card for the unified wiki review drawer rather than as a full inline diff.
  - *Scenario:* Given the user asks the agent to record a decision, when the agent responds, then the chat shows a compact card referencing `decisions` with the edit type and a Review actiown that opens the wiki review drawer.
- **Save action** — Saving or accepting substantive wiki changes (Update or Remove proposals, and any rich diff) MUST happen from the unified review drawer; saving applies the change to the target canonical doc atomically and transitions the proposal to a saved/accepted state. The wiki view MUST reflect the change immediately.
- **Edit draft action** — Editing proposed text MAY remain available inline for simple Add proposals, but richer Update or Remove proposals MUST be edited or resolved from the review drawer; saving an edited draft applies the user's wording, not the original.
  - *Scenario:* Given a simple Add proposal, when the user revises the text inline and saves, then the doc is updated with the user's edited version. Given an Update proposal, when the user wants to revise it, then editing happens in the review drawer.
- **Discard action** — Chat cards MAY offer a lightweight discard/reject action for simple pending proposals, but the primary review path MUST be the unified drawer; discarding/rejecting MUST NOT modify any doc and MUST transition the card to a discarded/rejected state.
- **Proposal scope** — A proposal card SHOULD target a single canonical doc, but MAY summarize multiple related wiki edits in one card when a single user request naturally produces a small set of changes, as long as each underlying edit remains individually reviewable in the drawer.
- **User-triggered emission** — The agent MUST emit chat proposals only in response to an explicit user request in the conversation. Source-ingestion-triggered wiki updates MUST NOT appear as chat proposals.
- **Resolved-state collapse** — Saved, accepted, rejected, or discarded cards MUST collapse to a compact status line in scrollback while preserving a path to review what changed in the unified drawer.
- **Agent tool surface for wiki** — The advisor agent's wiki-update tool, when invoked from chat, MUST produce a proposal card rather than write directly.
- **Initial-run canonical context loading** — The advisor MUST load and inline the full markdown body of every canonical doc in the project (defaults and pinned customs) when a new advisor conversation run initializes. It MUST NOT re-fetch and re-inline canonical docs on every subsequent turn of the same active run unless a new run context is initialized.
  - *Scenario:* Given a project with the five default canonical docs populated and one pinned custom doc, when a new advisor conversation run initializes, then the run context contains the full body of all six docs, with defaults listed before the pinned custom.
- **Canonical doc labeling and ordering** — Each inlined canonical doc MUST be labeled with its slug, title, and default/pinned status, ordered defaults-first then pinned, alphabetically by slug within each group.
  - *Scenario:* Given a project with default docs and pinned custom docs, when the advisor context is initialized, then default docs appear before pinned custom docs and each group is sorted by slug.
- **Grounded advisor responses** — The advisor MUST be able to answer questions and emit wiki proposal cards using canonical doc content without invoking a read tool first.
  - *Scenario:* Given the `people` doc lists a person with a defined role, when the user asks the advisor about that person, then the advisor responds using the role from the doc on the first turn without calling a canonical-doc read tool.
- **No advisor canonical-doc read tools** — The advisor MUST NOT expose read-only tools that list canonical docs or read canonical doc bodies, because canonical docs are already loaded into context.
- **Open review from chat** — A chat wiki proposal MUST be able to open the unified wiki review drawer focused on its proposed change.
  - *Scenario:* Given the advisor drafts a decision update in chat, when the user clicks Review, then the wiki review drawer opens to that proposed change.
- **Compact proposal summary** — Chat MUST summarize a proposed wiki update without rendering a large diff inline.
  - *Scenario:* Given a proposed update to `decisions`, when it appears in chat, then the card shows the target doc, edit type, short reason, and status without taking over the conversation.
- **Chat review status sync** — A chat proposal card MUST reflect the proposal's current review state, including resolutions performed in the review drawer.
  - *Scenario:* Given a user accepts a proposal in the review drawer, when they return to chat, then the proposal card shows the accepted state rather than remaining as a draft.
- **Partial-resolution status** — Chat-triggered proposals that contain more than one underlying edit SHOULD support a partially resolved state.
  - *Scenario:* Given a chat request produces two proposed wiki updates, when the user accepts one and leaves one pending, then the chat card indicates that some proposed changes still need review.
- **Inline citation preview** — Source citations MUST be available from assistant message citation pills as inline previews (popover on hover/focus) without requiring a persistent right rail; the preview MUST show source title and excerpt with a path to open the source.
  - *Scenario:* Given an assistant answer includes a source citation, when the user hovers or focuses the citation pill, then a compact preview shows the source title and excerpt with a path to open the source.
- **No persistent chat right rail** — Chat MUST NOT render a persistent right rail for citations or memory drafts; pending wiki memory review MUST be represented by proposal cards plus the unified review drawer, and citations MUST use inline previews.
