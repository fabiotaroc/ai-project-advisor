# Inputs Backend Data Model

## Recommendation

Keep a unified backend core for all ingestible inputs, and add type-specific detail tables for inputs whose structure is now stable.

Do not split the system into three completely separate root models for files, meetings, and emails.

Recommended shape:

- `source_materials` remains the canonical cross-input record
- `source_chunks` remains the shared chunking and retrieval layer
- `source_file_details` stores file-specific structured fields
- `source_meeting_details` stores meeting-specific structured fields
- `source_email_details` stores email-specific structured fields
- `metadata` remains available as a flexible escape hatch for unknown or connector-specific fields

## Why

This preserves one ingestion, search, citation, and activity model while giving files, meetings, and emails first-class structured fields where needed.

That is a better fit for the product than keeping important attributes in generic JSON, and it is safer long term than duplicating the whole source system into three disconnected backends.

## Proposed Data Model

### `source_materials`

Shared fields such as:

- `id`
- `project_id`
- `type`
- `title`
- `raw_storage_path`
- `parsed_content`
- `summary`
- `status`
- uploader and timestamps
- generic `metadata`

This table stays responsible for project ownership, access control, shared listing behavior, and cross-type queries.

### `source_file_details`

One-to-one with `source_materials` for records that belong in the `Files` experience.

Suggested fields:

- `source_material_id`
- `original_filename`
- `mime_type`
- `file_extension`
- `file_size_bytes`
- `page_count`
- `slide_count`
- `sheet_count`
- `word_count`
- `language`
- `preview_status`
- `extraction_status`
- `extracted_title`
- file-specific `metadata`

This is a better fit than creating separate tables for `pptx`, `docx`, and `xlsx` immediately.

### `source_meeting_details`

One-to-one with `source_materials` for records where `type = 'meeting'`.

Suggested fields:

- `source_material_id`
- `short_summary`
- `decisions`
- `action_items`
- `risks`
- `open_questions`
- `participants`
- `meeting_at`

### `source_email_details`

One-to-one with `source_materials` for records where `type = 'email'`.

Suggested fields:

- `source_material_id`
- `canonical_subject`
- `from_address`
- `to_addresses`
- `cc_addresses`
- `sent_at`
- `message_id`
- `in_reply_to`
- `references`
- `attachments`
- `latest_state`
- `key_decisions`
- `requested_actions`

## Database Guidance

Yes, this should be backed by a Supabase migration.

Once fields such as meeting decisions, action items, risks, open questions, or email headers become stable product concepts, they should live in database-backed typed structures rather than ad hoc application JSON.

The same applies to reusable file metadata such as MIME type, extension, size, page count, slide count, sheet count, and extraction status.

## Notes

- `Files` should use a single `source_file_details` table rather than separate subtype tables per file format.
- The current `type = 'document' | 'note'` split is worth rethinking. A cleaner long-term model is `type = 'file' | 'meeting' | 'email'`, with a secondary classifier such as `file_kind` for `document`, `note`, `presentation`, `spreadsheet`, and similar categories.
- If changing `type` now is too disruptive, keep the current values temporarily and still add `source_file_details`.
- `Emails` may later need a deeper thread/message model if the product evolves from message ingestion into true thread-native workflows.
- Add indexes that match the new UI, especially project-plus-type list queries.

