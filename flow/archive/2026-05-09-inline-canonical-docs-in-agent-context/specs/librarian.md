# Delta Spec: Inline canonical docs in pending-edit extractor

**Goal:** Ground librarian pending-edit extraction in the full content of each canonical doc instead of a heading-only preview.
**Domain:** `librarian`

## Design

The librarian's pending-edit extractor runs once per ingested source and prompts an extraction model with a doc catalog plus the source excerpt. Today the catalog shows only each doc's slug, title, default/pinned tag, and the first few heading lines of its body, so the model proposes additive edits without seeing what the doc already contains. This produces duplicates, mis-anchored insertions, and proposals that conflict with already-recorded facts.

This change replaces the heading preview with the full markdown body of every canonical doc in the project (defaults and pinned customs alike). The catalog still labels each doc with slug, title, and default/pinned status and presents bodies in delimited blocks so the model can pick a precise existing heading as the anchor and avoid duplicating content. Extraction remains a single-shot, append-only proposal flow; no other behavior changes.

Token-cost and context growth are accepted; bounding canonical doc size is handled by a future feature outside this change.

## ADDED

- **Full canonical doc bodies in extraction context** — The pending-edit extractor MUST present every canonical doc in the project (defaults and pinned customs) with its slug, title, default/pinned status, and full markdown body to the extraction model.
  - *Scenario:* Given a meeting transcript is being ingested in a project whose `decisions` doc already records a specific decision, when extraction runs, then the extractor's input includes the full `decisions` body and no pending edit is proposed that simply restates an already-recorded decision.

- **Anchor selection grounded in real content** — When the extractor emits a candidate with an `anchor_heading`, that heading MUST be one that actually appears in the target doc's full body shown to the extractor.
  - *Scenario:* Given the `work` doc contains a heading `## Action items`, when the extractor proposes a new action item from a meeting, then the candidate's `anchor_heading` is `## Action items` (verbatim) rather than an invented heading.

## MODIFIED

- **Doc catalog presented to the pending-edit extractor** — updated: the catalog MUST show full canonical doc bodies for all docs in the project. (Previously: the catalog showed only the first few heading lines of each doc and an "Empty." marker for docs without headings.)

## REMOVED

- **Heading-only preview in extraction catalog** — The extractor MUST NOT present canonical docs to the model as a headings-only preview. Reason: headings without body content cause duplicate and mis-anchored proposals.

## Out of Scope

- Meeting transcript summary extraction and source summary remain transcript/source-faithful and unchanged.
- The append-only constraint, confidence thresholds, and per-source-type extraction rules are unchanged.
- No change to how pending edits are persisted, reviewed, accepted, or rejected.
- No size cap or truncation of canonical doc bodies is introduced here.
