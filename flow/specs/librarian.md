# Librarian Specification

## Purpose

The librarian domain covers source ingestion support, indexing-related activity, and extraction of reviewable pending edits for canonical wiki docs.

## Design

The librarian handles source-side processing and emits structured extraction results when sources are ingested. For wiki-related work, it creates pending edits targeting canonical docs and persists them with `pending` status. It does not apply wiki edits directly; application happens only through user acceptance in the wiki/source review surfaces.

The librarian no longer runs a recurring wiki linting or restructuring job. It does not create emergent wiki pages, rewrite existing wiki docs, or silently update canonical documentation in the background.

## Requirements

- **Librarian responsibilities** — The librarian MUST handle source ingestion and indexing support, and MUST extract pending wiki edits from ingested sources when appropriate. It MUST NOT apply wiki edits autonomously.
- **Activity reporting** — Librarian activity entries MUST describe source-side actions and extraction events, including counts of pending edits extracted from a source. Application events such as accept and reject are reported by the wiki domain.
- **Pending edit extraction on meeting ingestion** — On meeting transcript ingestion, the librarian MUST extract candidate decisions, action items, attendee or role updates, and glossary terms, and persist each as a pending edit targeting the corresponding canonical doc (`decisions`, `work`, `people`, `glossary`).
  - *Scenario:* Given a transcript with two decisions and three action items, when ingestion completes, then five pending edits exist, each linked to the meeting and visible in the source-detail review panel.
- **Pending edit extraction on email and file ingestion** — Email and file ingestion MAY produce pending edits when extraction confidence is high. Low-confidence extractions MUST be skipped.
- **Append-only proposals** — Pending edits emitted by the librarian MUST be additive insertions or appends. The librarian MUST NOT propose deletions or rewrites of existing wiki content.
- **One-shot wiki migration** — The system MAY use a one-time migration or cleanup path to consolidate or remove legacy wiki content while moving to canonical docs. Migration output MAY use the pending-edit pipeline when user review is needed.
- **No recurring wiki linting** — The continuous background job that rewrites wiki content MUST NOT exist.
- **No emergent wiki page creation** — The librarian MUST NOT create wiki pages outside the canonical doc set.
- **No direct wiki writes** — The librarian MUST NOT modify wiki doc content directly under any path. All updates MUST flow through pending edits plus user acceptance, direct user edits, or accepted chat proposals.
