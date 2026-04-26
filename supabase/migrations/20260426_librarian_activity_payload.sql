-- =============================================================
-- Richer activity payloads for Librarian runs
-- =============================================================

alter table public.librarian_runs
  add column if not exists action_count integer not null default 0 check (action_count >= 0),
  add column if not exists suggestion_count integer not null default 0 check (suggestion_count >= 0),
  add column if not exists actions jsonb not null default '[]'::jsonb,
  add column if not exists suggestions jsonb not null default '[]'::jsonb,
  add column if not exists files_touched text[] not null default '{}'::text[];

create index if not exists idx_librarian_runs_project_status_started
  on public.librarian_runs (project_id, status, started_at desc);

create index if not exists idx_librarian_runs_files_touched
  on public.librarian_runs using gin (files_touched);

alter table public.activity_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_activity_events_project_event_type_created_at
  on public.activity_events (project_id, event_type, created_at desc);
