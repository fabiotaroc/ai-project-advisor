# Delta Spec: Chat Entry To Wiki Review

**Goal:** keep chat proposals compact while routing substantive wiki-memory review into the unified rich diff drawer.
**Domain:** `chat`

## Design

Chat remains a conversational surface, not the primary place to inspect rich wiki diffs. When the advisor proposes a wiki update from chat, the message renders a compact proposal card that summarizes the target doc, edit type, and review status. Detailed inspection and resolution happens in the same unified wiki review drawer used by source detail pages. This keeps the chat thread readable while preserving a trustworthy review path for canonical memory changes.

## ADDED

- **Open review from chat** — MUST let a chat wiki proposal open the unified wiki review drawer.
  - *Scenario:* Given the advisor drafts a decision update in chat, when the user clicks Review, then the wiki review drawer opens to that proposed change.

- **Compact proposal summary** — MUST summarize the proposed wiki update in chat without rendering a large diff inline.
  - *Scenario:* Given a proposed update to `decisions`, when it appears in chat, then the card shows the target doc, edit type, short reason, and status without taking over the conversation.

- **Chat review status sync** — MUST reflect the proposal's current review state in the chat card.
  - *Scenario:* Given a user accepts a proposal in the review drawer, when they return to chat, then the proposal card shows the accepted state rather than remaining as a draft.

- **Partial-resolution status** — SHOULD support a partially resolved state when a chat-triggered proposal contains more than one edit.
  - *Scenario:* Given a chat request produces two proposed wiki updates, when the user accepts one and leaves one pending, then the chat card indicates that some proposed changes still need review.

- **Inline citation preview** — MUST keep source citations available from assistant message citation pills without requiring a persistent right rail.
  - *Scenario:* Given an assistant answer includes a source citation, when the user hovers or focuses the citation pill, then a compact preview shows the source title and excerpt with a path to open the source.

## MODIFIED

- **Wiki proposal message type** — updated: chat proposal cards SHOULD act as compact launch/status cards for the review drawer. (Previously: chat proposal cards directly showed the draft text and Save, Edit draft, and Discard actions inline.)

- **Save action** — updated: saving or accepting substantive wiki changes SHOULD happen from the review drawer for rich diff proposals. (Previously: saving could happen directly from the chat card.)

- **Edit draft action** — updated: editing proposed text MAY remain available for simple Add proposals, but richer Update or Remove proposals SHOULD be edited or resolved from the review drawer. (Previously: inline draft editing was the primary chat proposal edit path.)

- **Discard action** — updated: chat cards MAY offer a lightweight discard/reject action for simple pending proposals, but the primary review path SHOULD be the drawer. (Previously: discard was a primary inline chat card action.)

- **Proposal scope** — updated: chat MAY summarize multiple related wiki edits in one card when the user request naturally produces a small set of changes, as long as each underlying edit remains individually reviewable in the drawer. (Previously: each proposal card targeted exactly one canonical doc.)

- **Resolved-state collapse** — updated: resolved chat proposal cards MUST collapse to a compact status line while preserving a path to review what changed. (Previously: resolved cards collapsed to a compact summary line without a rich review target.)

- **Citation rail** — updated: citations SHOULD move from the persistent right rail into inline popovers tied to citation pills. (Previously: citations were collected in a dedicated right rail.)

- **Memory drafts rail section** — updated: pending wiki memory review SHOULD be represented by proposal cards and the unified review drawer. (Previously: the chat rail also listed memory drafts.)

## REMOVED

- **Chat as primary diff surface** — reason for removal: large or rich wiki diffs in chat would make the conversation hard to scan and would not provide enough context for durable memory review.

- **Persistent chat right rail** — reason for removal: citations, memory drafts, and conversation facts do not justify permanent horizontal space once rich wiki review moves to the drawer and citations become inline previews.

## Out of Scope

- Rebuilding the general chat layout.
- Letting chat proposals bypass review for canonical wiki changes.
