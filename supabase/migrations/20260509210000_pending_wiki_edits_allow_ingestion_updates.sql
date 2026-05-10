-- Allow ingestion-origin pending wiki edits to carry deleted_text so the
-- librarian can propose Update patches (replace an existing span). Removals
-- from ingestion remain out of scope for the current change; the librarian
-- prompt enforces add/update only.
alter table public.pending_wiki_edits
  drop constraint pending_wiki_edits_check1;
