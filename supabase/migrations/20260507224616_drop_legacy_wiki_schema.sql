-- Legacy free-form wiki schema. Canonical docs now live in canonical_docs,
-- and reviewable writes live in pending_wiki_edits.

drop table if exists public.project_file_versions cascade;
drop table if exists public.project_files cascade;
