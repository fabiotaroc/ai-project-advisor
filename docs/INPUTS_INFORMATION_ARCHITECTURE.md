# Inputs Information Architecture

## Status

- Status: proposed
- Purpose: define a clearer end-user navigation model for project inputs

## Recommendation

Split the current mixed `Sources` experience into three dedicated destinations:

- `Files`
- `Meetings`
- `Emails`

Use `Files` for project materials such as decks, docs, spreadsheets, notes, and other uploaded artifacts.

Use `Meetings` for transcripts, meeting recaps, extracted decisions, and follow-ups.

Use `Emails` for imported email threads, summaries, and thread-specific actions.

Do not keep calling uploaded documents `Deliverables` unless they are truly outputs prepared for a client or stakeholder. For most users, "deliverable" is too narrow and creates confusion. The more accurate label for the current page is `Files` or `Project Files`.

## Why This Is Better For Users

The current model groups several conceptually different inputs into one place:

- documents and decks
- meeting transcripts
- email threads
- notes

That is technically coherent, but it is not mentally coherent for the user.

From a user point of view, these inputs answer different questions:

- `Files` answer: what materials exist for this project?
- `Meetings` answer: what happened, what was decided, and what are the next actions?
- `Emails` answer: what is the latest thread context, who said what, and what still needs a reply?

Separating them reduces cognitive load, allows more specialized UI, and creates natural homes for future connectors such as Outlook, Blue Dot, Plaud, `.txt` imports, or calendar-linked meeting capture.

## Proposed Sidebar IA

Recommended primary project navigation:

1. `Chat`
2. `Wiki`
3. `Files`
4. `Meetings`
5. `Emails`
6. `Activity`
7. `Settings`

If the product supports grouped navigation, `Files`, `Meetings`, and `Emails` should appear under a shared conceptual group such as `Inputs`.

If the sidebar remains flat in v1, the grouping should still be implied visually and in copy:

- `Wiki`
- `Files`
- `Meetings`
- `Emails`
- `Activity`

This makes the product easier to understand:

- `Wiki` is the synthesized knowledge layer
- `Files`, `Meetings`, and `Emails` are the raw input layer
- `Activity` is the audit/history layer

## Naming Guidance

Preferred labels:

- `Files` for uploaded project documents and notes
- `Meetings` for transcripts and meeting-derived records
- `Emails` for threads and imported email conversations
- `Wiki` for agent-maintained project knowledge

Avoid:

- `Sources` as the main end-user label once the split exists
- `Deliverables` as a bucket for all documents

`Sources` can still exist as an internal/backend concept covering all ingestible material.

## Page Goals And First Version Scope

### Files

**User goal**

See all project materials in one place and inspect what has been uploaded.

**What belongs here**

- PDF, DOCX, PPTX, XLSX
- markdown notes
- plain text notes
- anything that is best understood as a project file rather than a conversation artifact

**v1 page should include**

- a list view with title, file type, upload date, uploader, status
- search within files
- basic filters by type and processing status
- detail view with AI summary, metadata, preview, linked activity
- clear `Add files` CTA

**v1 should not try to do yet**

- advanced foldering
- deep document annotation
- version comparison UI for binary files

### Meetings

**User goal**

Understand what happened in meetings without reading full transcripts.

**What belongs here**

- meeting transcripts
- imported call notes
- transcript exports from third-party tools
- meeting-specific summaries and extracted structure

**v1 page should include**

- a list organized by meeting title/date
- participants, meeting date, source/import type where available
- AI summary at the top of the detail view
- dedicated sections for:
  - decisions
  - action items
  - open questions
  - transcript preview
- links into chat/activity when a meeting influenced the wiki or agent output
- `Import meeting` CTA with room for future providers

**Why this matters**

A meeting should feel like an event with outcomes, not just another uploaded file.

### Emails

**User goal**

Track the state of important conversations and quickly recover thread context.

**What belongs here**

- imported `.eml` messages
- normalized email threads
- thread-level summaries and follow-up context

**v1 page should include**

- a thread-centric list, not just a raw message list
- subject, participants, latest message time, message count
- AI summary at the thread level
- dedicated sections for:
  - latest state
  - key decisions
  - requested actions
  - attachments
  - message timeline
- `Import email` CTA with room for future Outlook/Gmail connectors

**Why this matters**

Users think in threads and outstanding replies, not in individual `.eml` files.

## Shared UX Rules Across All Three Pages

These pages should feel related even though they are specialized.

Shared patterns:

- same high-level list-detail layout
- same search behavior
- same processing status language
- same citation jump behavior from chat
- same activity links
- same empty-state structure

Specialization should come from the detail view and page copy, not from inventing three unrelated UIs.

## Global Behaviors That Must Remain Unified

Splitting the pages should not split the user's mental model of the project.

The following should still work across all input types:

- global search across files, meetings, and emails
- chat citations that deep-link to the correct page and selected item
- project-level activity feed
- a unified ingest pipeline behind the scenes
- a shared "all inputs" count in overview/home surfaces if needed

## Ingestion And Connector Model

The UI should make room for connector growth without forcing it into v1 immediately.

Recommended pattern:

- each page has its own primary import CTA
- each page can later show page-specific import options
- connector copy is contextual to the object type

Examples:

- `Files`: upload docs, decks, spreadsheets, notes
- `Meetings`: import transcript, connect recorder, paste notes
- `Emails`: upload `.eml`, connect Outlook, sync threads

This is more understandable than one generic "Add source" entry point once the product expands.

## Suggested Rollout

### Phase 1 (completed)

- rename `Sources` to `Files`
- add `Meetings` page
- add `Emails` page
- keep backend source model unchanged
- route existing source records to the correct page by `type`

### Phase 2 (completed)

- make meeting detail UI outcome-focused
- make email detail UI thread-focused
- add page-specific import entry points

### Phase 3

- add connectors for Outlook, transcript tools, and other providers
- add richer meeting and email metadata extraction

## Product Principle

The product should not expose technical ingestion categories as the primary user-facing structure.

The navigation should match how people actually think about project context:

- knowledge they maintain (`Wiki`)
- materials they upload (`Files`)
- conversations they had (`Meetings`, `Emails`)
- history of what changed (`Activity`)

