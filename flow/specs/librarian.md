# Librarian Specification

## Purpose

The librarian domain covers source ingestion support, indexing-related activity, and extraction of reviewable pending edits for canonical wiki docs.

## Design

The librarian handles source-side processing and emits structured extraction results when sources are ingested. For wiki-related work, it creates pending edits targeting canonical docs and persists them with `pending` status. It does not apply wiki edits directly; application happens only through user acceptance in the wiki/source review surfaces.

Meeting sources may be created from uploaded transcript files or pasted transcript/notes text. Both import paths use the same ingestion pipeline so indexing, summaries, structured meeting details, activity, and pending-edit extraction remain consistent.

When extracting pending wiki edits from an ingested source, the librarian presents the full markdown body of every canonical doc in the project to the extraction model. The catalog includes default docs and pinned custom docs, labels each doc with slug, title, and default/pinned status, and lets the extractor avoid duplicates and choose anchors from existing headings in the shown content.

The librarian no longer runs a recurring wiki linting or restructuring job. It does not create emergent wiki pages, rewrite existing wiki docs, or silently update canonical documentation in the background.

## Requirements

- **Librarian responsibilities** — The librarian MUST handle source ingestion and indexing support, and MUST extract pending wiki edits from ingested sources when appropriate. It MUST NOT apply wiki edits autonomously.
- **Activity reporting** — Librarian activity entries MUST describe source-side actions and extraction events, including counts of pending edits extracted from a source. Application events such as accept and reject are reported by the wiki domain.
- **Pasted meeting import** — Users MUST be able to paste meeting transcript or notes text into the meeting import dialog, provide a title, and import it as a meeting source.
  - *Scenario:* Given a user has meeting notes on their clipboard, when they paste the text, add a title, and import it, then the meeting appears in the meetings list with normal processing results.
- **Required pasted meeting content** — Pasted meeting import MUST require non-empty pasted text and a non-empty title before submission.
  - *Scenario:* Given the paste form has no content, when the user views the import action, then submission is unavailable until valid content is provided.
- **Meeting import choices** — The meeting import dialog SHOULD present file upload and pasted text as peer import options. File upload behavior MUST continue to work as before.
- **Pending edit extraction on meeting ingestion** — On meeting transcript ingestion, the librarian MUST extract candidate decisions, action items, attendee or role updates, and glossary terms, and persist each as a pending edit targeting the corresponding canonical doc (`decisions`, `work`, `people`, `glossary`).
  - *Scenario:* Given a transcript with two decisions and three action items, when ingestion completes, then five pending edits exist, each linked to the meeting and visible in the source-detail review panel.
- **Pending edit extraction on email and file ingestion** — Email and file ingestion MAY produce pending edits when extraction confidence is high. Low-confidence extractions MUST be skipped.
- **Full canonical doc bodies in extraction context** — The pending-edit extractor MUST present every canonical doc in the project (defaults and pinned customs) with its slug, title, default/pinned status, and full markdown body to the extraction model.
  - *Scenario:* Given a meeting transcript is being ingested in a project whose `decisions` doc already records a specific decision, when extraction runs, then the extractor's input includes the full `decisions` body and no pending edit is proposed that simply restates an already-recorded decision.
- **Anchor selection grounded in real content** — When the extractor emits a candidate with an `anchor_heading`, that heading MUST be one that actually appears in the target doc's full body shown to the extractor.
  - *Scenario:* Given the `work` doc contains a heading `## Action items`, when the extractor proposes a new action item from a meeting, then the candidate's `anchor_heading` is `## Action items` (verbatim) rather than an invented heading.
- **No heading-only extraction catalog** — The pending-edit extractor MUST NOT present canonical docs to the model as a headings-only preview.
- **Append-only proposals** — Pending edits emitted by the librarian MUST be additive insertions or appends. The librarian MUST NOT propose deletions or rewrites of existing wiki content.
- **One-shot wiki migration** — The system MAY use a one-time migration or cleanup path to consolidate or remove legacy wiki content while moving to canonical docs. Migration output MAY use the pending-edit pipeline when user review is needed.
- **No recurring wiki linting** — The continuous background job that rewrites wiki content MUST NOT exist.
- **No emergent wiki page creation** — The librarian MUST NOT create wiki pages outside the canonical doc set.
- **No direct wiki writes** — The librarian MUST NOT modify wiki doc content directly under any path. All updates MUST flow through pending edits plus user acceptance, direct user edits, or accepted chat proposals.
