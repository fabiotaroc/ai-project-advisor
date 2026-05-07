# Chat Specification

## Purpose

The chat domain covers conversational advisor behavior, including user-requested canonical wiki updates through reviewable proposal cards.

## Design

When a user explicitly asks the advisor to update a canonical doc, chat emits a structured proposal card instead of writing to the wiki by side effect. The proposal card follows the memory-card pattern: a compact header, draft state, target doc context, quoted proposed change, and actions to save, edit, or discard.

Each proposal targets exactly one canonical doc. Proposal cards move through `draft`, `editing`, `saved`, and `discarded` states. Saving applies the proposal atomically to the target canonical doc. Editing lets the user revise the proposed content before saving. Discarding resolves the proposal without changing a doc. Source-ingestion-triggered wiki updates use the source review flow, not chat proposal cards.

## Requirements

- **Wiki proposal message type** — Chat MUST support a structured proposal message with target doc, proposed change content, and resolution state, rendered as a card matching the design-system memory-card pattern.
  - *Scenario:* Given the user asks the agent to record a decision, when the agent responds, then the chat shows a card with a memory-style proposed update header, a Draft pill, body referencing `decisions.md` with the quoted change, and Save, Edit draft, and Discard actions.
- **Save action** — Saving a proposal MUST apply the change to the target canonical doc atomically and transition the card to a saved state. The wiki view MUST reflect the change immediately.
- **Edit draft action** — A user MUST be able to edit the proposal's content inline before saving; saving the edited draft applies the user's wording, not the original.
  - *Scenario:* Given a draft proposal, when the user clicks Edit draft, revises the text, and clicks Save, then the doc is updated with the user's edited version.
- **Discard action** — Discarding MUST throw the proposal away without modifying any doc and transition the card to a discarded state.
- **Proposal scope** — A proposal card MUST target exactly one canonical doc. Multi-doc updates require multiple cards.
- **User-triggered emission** — The agent MUST emit chat proposals only in response to an explicit user request in the conversation. Source-ingestion-triggered wiki updates MUST NOT appear as chat proposals.
- **Resolved-state collapse** — Saved or discarded cards MUST collapse to a compact summary line in scrollback, preserving history without taking visual weight.
- **Agent tool surface for wiki** — The advisor agent's wiki-update tool, when invoked from chat, MUST produce a proposal card rather than write directly.
