-- =============================================================
-- Librarian agent: runs ledger + soft delete for project_files
-- =============================================================

-- Soft-delete column for project_files so the Librarian can
-- delete files without losing the version history (and so
-- the spec's "undo safety net" is preserved).
alter table public.project_files
  add column if not exists deleted_at timestamptz;

-- The existing unique (project_id, path) constraint prevents
-- re-creating a file at a path that was soft-deleted. Replace
-- it with a partial unique index scoped to live rows.
alter table public.project_files
  drop constraint if exists project_files_project_id_path_key;

create unique index if not exists project_files_project_id_path_live_key
  on public.project_files (project_id, path)
  where deleted_at is null;

create index if not exists idx_project_files_project_id_deleted_at
  on public.project_files (project_id, deleted_at);

-- =============================================================
-- librarian_runs: one row per Librarian invocation
-- =============================================================

create table if not exists public.librarian_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  trigger_type text not null
    check (trigger_type in ('source_ingested', 'conversation_ended', 'wiki_lint')),
  trigger_ref uuid,
  mode text not null default 'write'
    check (mode in ('write', 'proposal')),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed')),
  summary text,
  error text,
  actor_id uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_librarian_runs_project_started
  on public.librarian_runs (project_id, started_at desc);

alter table public.librarian_runs enable row level security;

create policy "librarian_runs_select_by_membership"
  on public.librarian_runs for select
  using (public.user_has_project_access(project_id));
