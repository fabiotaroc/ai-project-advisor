# AI Project Advisor Roadmap

## Purpose

This roadmap translates the product wedge in `docs/PRODUCT_BRIEF.md` and the requirements in `docs/PRD.md` into practical sequencing for the repo. It is not a full specification and should not duplicate `flow/specs`.

- `docs/PRODUCT_BRIEF.md` is the strategic source of truth for the current wedge, target user, validation assignment, and kill criteria.
- `docs/PRD.md` explains product requirements, user-facing scope, and what value the product should create.
- `docs/ROADMAP.md` explains what we are building next and why that order makes sense.
- `flow/specs/*` define durable product and system behavior after decisions are made.
- `flow/changes/*` holds active proposals, delta specs, and implementation plans.
- `TODO.md` is only an inbox for rough notes before they are promoted here or into specflow.

## Product Thesis

AI Project Advisor keeps a living project brief updated from meetings, emails, notes, and files, with human approval. It combines a calm SaaS workspace, a source library, durable project memory, and an advisor agent that helps teams create useful delivery artifacts instead of only answering chat questions.

The product should stay focused on messy real project delivery work: meetings, emails, documents, decisions, action items, handovers, client-facing updates, and long-running context across changing teams.

## Current Focus

The near-term product should prove that a team can trust the workspace as a durable project memory system:

- Ingest source material and propose grounded updates to canonical project knowledge.
- Let users review and control what becomes persistent memory.
- Keep chat useful while avoiding chat as the only system of record.
- Make activity history understandable enough that users can audit what changed and why.
- Improve the artifact/file workspace so the product can move beyond source storage toward useful deliverable creation.

## Now

These are the priorities that should shape the next usable version.

### Canonical Wiki Review

The wiki is the current core memory surface. It should feel trustworthy, reviewable, and grounded in sources.

- Finish the rich pending-edit review flow for Add, Update, and later Remove proposals.
- Keep source-ingestion updates reviewable in the unified drawer instead of applying them silently.
- Keep chat proposal cards compact, with detailed review happening in the drawer.
- Preserve source grounding and activity entries for accepted or rejected wiki edits.

Relevant specs:

- `flow/specs/wiki.md`
- `flow/specs/chat.md`
- `flow/specs/librarian.md`

### Advisor Memory And Context

The advisor should feel aware of the project without exposing internal plumbing.

- Include canonical docs in the advisor run context as specified in `flow/specs/chat.md`.
- Add advisor access to recent activity as a lightweight daily/project memory signal.
- Add advisor access to relevant user-owned chat history when useful and privacy-safe.
- Keep incognito chat separate from saved team-visible memory.

### Activity And Trust

Activity should explain the system's work in plain project language.

- Make activity entries clear for source ingestion, proposed wiki updates, accepted edits, rejected edits, and chat-driven proposals.
- Link activity entries back to the source, wiki doc, or review context when possible.
- Use activity as an audit trail, not just a feed of technical events.

### Files And Artifacts

The product needs a stronger artifact surface so it can eventually create practical deliverables, not only ingest inputs.

- Evolve the current files/source area into an artifact workspace for user-created documents, markdown pages, slides, spreadsheets, and generated outputs.
- Support useful previews for common work artifacts such as docs, decks, and spreadsheets.
- Let users create and refine artifacts from chat while keeping a visible workspace outside chat.

## Next

These are likely follow-on priorities after the current memory and review loops are stable.

### Chat Experience

- Add file or artifact references on chat messages.
- Add citation pills for canonical docs, not only source materials.
- Improve proposal status syncing between chat, wiki review, and activity history.
- Add incognito chat where memory is not saved and other team members cannot see the conversation.

### Meetings

- Make meeting outputs editable as structured sections: summary, decisions, action items, risks, and open questions.
- Keep meeting-derived wiki proposals grounded in transcript excerpts.
- Improve the handoff from meeting ingestion to canonical wiki updates.

### Collaboration

- Clarify team-visible versus private user-visible surfaces.
- Preserve authorship for proposed, accepted, rejected, and directly edited knowledge.
- Design review flows so they work for teams, not just a solo user.

## Later

These are strategically important but should not distract from proving the core project-memory loop.

- Office-style document drafting and editing, starting with Word-like documents.
- PowerPoint-style presentation generation and review.
- Excel/spreadsheet ingestion, analysis, and artifact creation.
- Outlook, Teams, calendar, SharePoint, cloud drive, and meeting-tool connectors.
- Reusable templates for reports, handovers, status updates, meeting recaps, and client-facing deliverables.
- Modular skills/plugins that extend the advisor without making the MVP feel over-engineered.

## Recently Completed Or Mostly Done

These items came from the earlier `TODO.md` brain dump and are treated as context, not active roadmap work.

- Renamed or reframed sources toward artifacts/files in the product language.
- Moved the wiki toward canonical docs: project, decisions, people, work, glossary, plus pinned customs.
- Added or improved pending wiki edits in a side-panel review flow.
- Added date awareness to the advisor prompt.
- Clarified the visible advisor versus background librarian split.
- Added source citations in chat messages.
- Improved recent activity readability and source/artifact backlinks.
- Documented the librarian/advisor architecture.
- Added token and context count visibility to chat.
- Added scroll-to-bottom behavior in chat.

## Open Questions

- What is the right user-facing name for the source/artifact/file area?
- How much of the project wiki should be automatically loaded into advisor context as projects grow?
- What should be private by default versus team-visible by default?
- Which artifact type should prove the output-creation loop first: markdown documents, Word-style documents, decks, or spreadsheets?
- When should destructive wiki proposals such as removals be allowed from source ingestion?
