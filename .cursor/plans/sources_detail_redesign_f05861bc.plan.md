---
name: Sources Detail Redesign
overview: Redesign only the project Sources page toward the prototype’s two-pane source browser, using the richer detail scope you selected while preserving the current upload/retry pipeline.
todos:
  - id: loader-detail
    content: Create richer server-side source detail data from existing Supabase tables and typed helpers.
    status: completed
  - id: split-view-ui
    content: Refactor SourcesPanel into the prototype-inspired split list/detail browser.
    status: completed
  - id: upload-affordance
    content: Move the existing upload zone into an Add source flow while preserving staging/upload behavior.
    status: completed
  - id: verify-sources
    content: Run lints/type checks and smoke-test source page interactions.
    status: completed
isProject: false
---

# Sources Detail Redesign

## Direction
- Move from the current flat upload zone plus card grid in [`src/components/sources/sources-panel.tsx`](src/components/sources/sources-panel.tsx) to the prototype’s split view: left source list, right active source detail.
- Keep the design local to Sources for now: Notion-white/cool neutral surfaces, thin borders, mono metadata, Electric-blue active rail via existing semantic tokens from [`src/app/globals.css`](src/app/globals.css).
- Preserve the existing upload/classification/retry behavior in [`src/components/sources/source-upload-zone.tsx`](src/components/sources/source-upload-zone.tsx), but present it behind an `Add source` action so the page feels like a source browser first.

## Data Shape
- Extend the server loader in [`src/lib/server/data.ts`](src/lib/server/data.ts) from `source_materials.select("*")` to a richer query/model that includes:
  - `source_chunks` count per source for the list/detail indexed badge.
  - uploader display name from `profiles`.
  - `raw_storage_path`, `metadata.originalSize`, `metadata.mimeType`, `created_at`, `updated_at` for file details.
  - best-effort linked artifacts from existing tables (`activity_events`, `librarian_runs.files_touched`, and/or cited messages) without adding schema in the first pass.
- Update [`src/lib/types.ts`](src/lib/types.ts) with a `SourceMaterialDetail`-style type so the client code does not parse loose JSON everywhere.

## UI Implementation
- Refactor [`src/components/sources/sources-panel.tsx`](src/components/sources/sources-panel.tsx) into a two-pane client component:
  - Left: header, `Add` button, filter input, list rows with file glyph/type/status/chunk count/date/summary.
  - Right: active detail with status/type pills, title, upload metadata, AI summary, key facts/preview from `summary` and `parsed_content`, file details, linked artifacts, and actions.
  - Responsive fallback: stack list/detail on smaller widths, with the selected detail below the list.
- Convert [`src/components/sources/source-upload-zone.tsx`](src/components/sources/source-upload-zone.tsx) into a reusable upload body that can live inside a sheet/dialog or compact expandable panel. Keep staged file category correction and upload progress.
- Add small helpers for file glyphs, file-size formatting from metadata, source type labels, status badges, and parsed-content previews.

## Verification
- Run lint/type checks for the changed TS/TSX files.
- If the UI compiles, manually smoke-test source filtering, selecting a source, upload staging, upload all, and retry on processing/failed sources.
- If richer linked-artifact data is sparse, ship graceful empty states rather than blocking the redesign on new tables.
