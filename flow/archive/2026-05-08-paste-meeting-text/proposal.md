# Proposal: Paste Meeting Text

**Goal:** Let users import a meeting by pasting transcript or notes text directly.
**Domain(s):** `librarian`

## Summary

The meetings import dialog currently supports file upload only, which adds friction when users have a transcript or meeting notes on the clipboard. This change adds a paste-based import option for meetings while reusing the existing meeting ingestion pipeline so summaries, structured meeting details, search chunks, and librarian proposals behave like uploaded transcripts.

## Out of Scope

- Pasted imports for files, emails, or notes.
- Rich text parsing, calendar connectors, or external recorder integrations.
