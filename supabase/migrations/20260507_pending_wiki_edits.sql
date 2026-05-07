-- =============================================================
-- Pending wiki edits: reviewable hunks against canonical docs
-- =============================================================

create type public.pending_wiki_edit_origin as enum ('ingestion', 'chat');
create type public.pending_wiki_edit_status as enum ('pending', 'accepted', 'rejected');

create table if not exists public.pending_wiki_edits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  target_doc_id uuid not null references public.canonical_docs(id) on delete cascade,
  source_material_id uuid references public.source_materials(id) on delete cascade,
  origin public.pending_wiki_edit_origin not null,
  -- anchor: { heading?: text, before?: text, after?: text } — used to relocate the hunk if the
  -- target doc has changed since extraction.
  anchor jsonb not null default '{}'::jsonb,
  inserted_text text not null default '',
  deleted_text text,
  reason text,
  confidence numeric(4, 3),
  status public.pending_wiki_edit_status not null default 'pending',
  repositioned boolean not null default false,
  fallback_applied boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- Chat-origin edits do not carry a source; ingestion-origin edits must.
  check (origin <> 'ingestion' or source_material_id is not null),
  -- Append-only ingestion: no deletions allowed for ingestion-origin rows.
  check (origin <> 'ingestion' or deleted_text is null)
);

create index if not exists idx_pending_wiki_edits_project_status
  on public.pending_wiki_edits (project_id, status);

create index if not exists idx_pending_wiki_edits_source_status
  on public.pending_wiki_edits (source_material_id, status);

create index if not exists idx_pending_wiki_edits_doc_status
  on public.pending_wiki_edits (target_doc_id, status);

alter table public.pending_wiki_edits enable row level security;

create policy "pending_wiki_edits_select_by_membership"
  on public.pending_wiki_edits for select
  using (public.user_has_project_access(project_id));

create policy "pending_wiki_edits_insert_by_write_access"
  on public.pending_wiki_edits for insert
  with check (public.user_has_project_write_access(project_id));

create policy "pending_wiki_edits_update_by_write_access"
  on public.pending_wiki_edits for update
  using (public.user_has_project_write_access(project_id))
  with check (public.user_has_project_write_access(project_id));

create policy "pending_wiki_edits_delete_by_write_access"
  on public.pending_wiki_edits for delete
  using (public.user_has_project_write_access(project_id));
