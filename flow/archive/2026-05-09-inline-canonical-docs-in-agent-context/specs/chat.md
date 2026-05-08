# Delta Spec: Inline canonical docs in advisor context

**Goal:** Replace the advisor's canonical-doc inventory plus tool-based reads with full canonical doc bodies loaded into the initial chat-agent context.
**Domain:** `chat`

## Design

The advisor's initial chat-agent context for a conversation run is assembled from project metadata, settings, the current user, and a canonical-doc section. The canonical-doc section currently lists slugs/titles and instructs the agent to call a read tool to fetch bodies; the agent also has a tool to list docs.

This change widens the initial canonical-doc section to embed the full markdown body of every canonical doc that belongs to the project — the five defaults plus any pinned customs — in a stable order (defaults first by slug, then pinned customs by slug). Each doc is presented with its slug, title, default/pinned tag, and full body in a delimited block so the agent can ground responses and proposal cards in the actual content. The docs are loaded when a new advisor conversation run initializes; they are not re-fetched and re-inlined on every subsequent turn of the same active run.

Because bodies are present in the run context, the read-only canonical-doc tools become redundant and are removed from the advisor's tool surface. The proposal-emission tool and source-search tools are unaffected. Token-cost and prompt-size growth are deliberately accepted; bounding canonical doc size is handled by a future feature outside this change.

## ADDED

- **Initial-run canonical context loading** — The advisor MUST load and inline the full markdown body of every canonical doc in the project (defaults and pinned customs) when a new advisor conversation run initializes. It MUST NOT re-fetch and re-inline canonical docs on every subsequent turn of the same active run unless a new run context is initialized.
  - *Scenario:* Given a project with the five default canonical docs populated and one pinned custom doc, when a new advisor conversation run initializes, then the run context contains the full body of all six docs, with defaults listed before the pinned custom.

- **Canonical doc labeling and ordering** — Each inlined canonical doc MUST be labeled with its slug, title, and default/pinned status, ordered defaults-first then pinned, alphabetically by slug within each group.
  - *Scenario:* Given a project with default docs and pinned custom docs, when the advisor context is initialized, then default docs appear before pinned custom docs and each group is sorted by slug.

- **Grounded advisor responses** — The advisor MUST be able to answer questions and emit wiki proposal cards using canonical doc content without invoking a read tool first.
  - *Scenario:* Given the `people` doc lists a person with a defined role, when the user asks the advisor about that person, then the advisor responds using the role from the doc on the first turn without calling a canonical-doc read tool.

## MODIFIED

- **Canonical doc presence in advisor context** — updated: the advisor's initial run context MUST present canonical docs with full bodies. (Previously: it presented only an inventory of slugs and titles and instructed the agent to call a read tool for bodies.)

## REMOVED

- **Advisor `list_canonical_docs` tool** — The advisor MUST NOT expose a tool that lists canonical docs. Reason: the inventory is fully visible inline.
- **Advisor `read_canonical_doc` tool** — The advisor MUST NOT expose a tool that reads a canonical doc body. Reason: bodies are always present in the system prompt.

## Out of Scope

- Source-search and source-read tools (`search_sources`, `read_source`) remain unchanged.
- Wiki proposal-card emission, save/edit/discard flow, and `propose_wiki_update` behavior are unchanged.
- No size cap, truncation, or compression of canonical doc bodies is introduced here.
