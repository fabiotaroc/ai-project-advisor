---
name: Activity UI Refresh
overview: Change the activity page from event-log labels to a clearer “who did what” timeline. Wiki activity will show the acting user, affected wiki doc, whether it came from source ingestion or manual/chat proposal, and a one-sentence change summary, while source-ingested actions remain visually and behaviorally unchanged.
todos:
  - id: enrich-activity-data
    content: Extend activity data loading and types with actor and wiki edit details.
    status: completed
  - id: improve-wiki-summary
    content: Update accepted wiki edit activity summaries at creation time.
    status: completed
  - id: render-wiki-row
    content: Add a dedicated wiki activity row presentation in the activity panel.
    status: completed
  - id: preserve-existing-events
    content: Keep source-ingested and unknown legacy events using the current rendering path.
    status: completed
  - id: verify-ui
    content: Check lints and, if possible, inspect the activity page in browser.
    status: completed
isProject: false
---

# Activity UI Refresh Plan

## Scope

Update the activity page data shape and row rendering so accepted wiki rows read like human activity, not raw log entries. Hide rejected wiki edits from the activity timeline because no project knowledge changed. Keep source ingestion rows as they are today.

Relevant files:

- [docs/prototypes/activity-ui-refresh/activity.html](docs/prototypes/activity-ui-refresh/activity.html): primary visual/reference prototype to match as closely as practical in the production component.
- [src/lib/server/data.ts](src/lib/server/data.ts): fetch richer activity event data.
- [src/lib/types.ts](src/lib/types.ts): extend `ActivityEvent` with optional actor and wiki-change detail fields.
- [src/components/activity/activity-panel.tsx](src/components/activity/activity-panel.tsx): render wiki rows with a clean “who did what” layout.
- [src/components/activity/activity-shared.tsx](src/components/activity/activity-shared.tsx): keep event metadata/icons, with small label updates if needed.
- [supabase/migrations](supabase/migrations): update the `resolve_pending_wiki_edit` function so future `wiki_edit_accepted` rows store a descriptive summary.

## Design Target

Use [docs/prototypes/activity-ui-refresh/activity.html](docs/prototypes/activity-ui-refresh/activity.html) as the source of truth for the UI direction. Match the prototype as closely as possible while staying inside the existing shadcn/Tailwind component system.

Prototype details to preserve:

- Wiki rows use the actor avatar/initials in the glyph position instead of the generic check icon.
- Headlines read like real activity: `{Actor} edited {Doc}` or `{Actor} updated {Doc}`.
- Wiki rows include a small `Wiki` badge.
- Origin is shown as a compact chip: `Manual change` or `From source update`.
- Ingestion-origin rows show the source title as a link next to the origin chip when available.
- The one-sentence change summary sits directly under the origin metadata.
- Optional row details can show a compact diff/change preview when enough data is available.
- Existing librarian run rows and source-ingested event rows should remain visually unchanged.

## Data Model

For `wiki_edit_accepted`, enrich events in `getActivity()` by joining or batch-loading:

- `profiles` for `actor_id`, displayed as name or email fallback.
- `pending_wiki_edits` via `target_id`, including `origin`, `inserted_text`, `deleted_text`, `reason`, `target_doc_id`, and `source_material_id`.
- `canonical_docs` for wiki doc title/slug.
- `source_materials` only when present, for source title.

Filter `wiki_edit_rejected` out of the activity page query or timeline normalization. Unknown/legacy rejected rows can remain in the database, but they should not be shown.

Avoid changing the database schema for this UI pass. The live DB already has the required information for actor, document, origin, and source title.

## Summary Creation

Today, `activity_events.summary` for `wiki_edit_accepted` is created by the Postgres function `resolve_pending_wiki_edit` and is only:

`Accepted proposed wiki edit for "{Doc Title}".`

Update that function through a new Supabase migration so future accepted wiki events store a useful one-sentence summary. The summary should prefer the pending edit `reason`; if absent, derive a concise fallback from `inserted_text` / `deleted_text`.

Existing rows can still be displayed well by reading `pending_wiki_edits.reason` at render time. No backfill is required unless we decide historical activity should also have improved `activity_events.summary` values.

## UI Behavior

For source ingestion rows:

- Preserve the current label, summary, icon, link target, and compact display.

For accepted wiki rows, render a dedicated row variant:

- Headline: `{Actor} edited {Doc}` or `{Actor} updated {Doc}`.
- Secondary metadata: `Manual change` for `origin = "chat"`; `From source update` for `origin = "ingestion"`, optionally followed by the source title when available.
- One-sentence summary: prefer `pending_wiki_edits.reason`; otherwise summarize inserted/deleted text with a short fallback.
- Actor visual: show a user/avatar glyph in the row for the acting user, using initials/name fallback when no avatar URL is available.
- Link behavior: keep the existing destination logic to source drawer when source-linked, otherwise wiki doc page.

Example row copy:

- `Taro Casalino edited Work`
- `From source update: 2026-05-07 10:30 Alessio Taro demo review.md`
- `The meeting identified Spring integration and real data access as the remaining blocker.`

## Implementation Notes

Keep the UI calm and scan-friendly:

- Use the existing timeline/card structure.
- Follow the prototype spacing and hierarchy: timestamp, avatar/glyph, body, headline, pills, metadata, summary.
- Add small inline chips for `Manual` / `Source update` only if they improve scanning.
- Avoid showing raw `event_type`, IDs, or patch metadata.
- Preserve historical fallback rendering for unknown/legacy event types.

## Verification

- Run TypeScript/lint checks for edited files.
- Manually verify the activity page shows recent wiki accepted rows with actor, doc, origin, and summary.
- Confirm source-ingested rows still look and link as before.

