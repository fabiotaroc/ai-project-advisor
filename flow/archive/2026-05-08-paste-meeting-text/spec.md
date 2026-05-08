# Delta Spec: Paste Meeting Text

**Goal:** Let users import a meeting by pasting transcript or notes text directly.
**Domain:** `librarian`

## Design

The meeting import surface adds a manual text entry path alongside file upload. Pasted meeting content is submitted through the same ingestion pipeline as transcript file uploads so downstream extraction, indexing, activity, and review behavior remain consistent.

## ADDED

- **Pasted meeting import** — Users MUST be able to paste meeting transcript or notes text into the meeting import dialog, provide a title, and import it as a meeting source.
  - *Scenario:* Given a user has meeting notes on their clipboard, when they paste the text, add a title, and import it, then the meeting appears in the meetings list with normal processing results.

- **Required pasted content** — The pasted import action MUST require non-empty pasted text and a non-empty title before submission.
  - *Scenario:* Given the paste form has no content, when the user views the import action, then submission is unavailable until valid content is provided.

## MODIFIED

- **Meeting import choices** — The meeting import dialog SHOULD present file upload and pasted text as peer import options. File upload behavior MUST continue to work as before.

## REMOVED

- None.

## Out of Scope

- Pasted imports for non-meeting source types.
- Automatic parsing of rich text formatting from the clipboard.
