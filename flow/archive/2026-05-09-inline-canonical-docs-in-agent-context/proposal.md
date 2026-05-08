# Proposal: Inline canonical docs in agent context

**Goal:** Ground both the advisor and the librarian's pending-edit extractor in the project's actual canonical doc content instead of inventories or heading previews.
**Domain(s):** `chat`, `librarian`

## Summary

Today the advisor sees only a list of canonical doc slugs/titles in its system prompt and must call a tool to read any body, and the librarian's pending-edit extractor sees only the first six heading lines of each doc when proposing wiki edits from an ingested source. Both surfaces routinely miss project context that already exists in the wiki, leading to advisor answers that ignore known facts and pending-edit proposals that duplicate or misalign with existing decisions, people, work, and glossary entries. This change inlines the full bodies of all canonical docs (defaults plus pinned customs) directly into the agent context for both surfaces, and retires the advisor's read-only canonical-doc tools that become redundant.

## Out of Scope

- Meeting summary extraction (`MEETING_EXTRACTION_SYSTEM_PROMPT`) and source summary remain transcript/source-faithful and unchanged.
- Source content (ingested chunks) stays behind the existing `search_sources` / `read_source` tools.
- No truncation or size-cap policy is introduced in this change; bounding canonical doc size is a future feature/rule.
- No changes to how pending edits are reviewed, applied, or rejected.
- No changes to chat proposal-card behavior beyond the agent's improved grounding.
