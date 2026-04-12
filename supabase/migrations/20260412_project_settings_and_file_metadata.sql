-- =============================================================
-- project_settings table (one row per project)
-- =============================================================

create table if not exists public.project_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  tone text not null default 'conversational'
    check (tone in ('formal', 'conversational', 'neutral')),
  verbosity text not null default 'standard'
    check (verbosity in ('concise', 'standard', 'detailed')),
  default_format text not null default 'prose'
    check (default_format in ('prose', 'bullets', 'tables', 'structured')),
  proactivity text not null default 'suggestive'
    check (proactivity in ('reactive', 'suggestive', 'proactive')),
  language text not null default 'en',
  auto_synthesize_on_ingest boolean not null default true,
  auto_create_entity_pages boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_project_settings
  before update on public.project_settings
  for each row execute function public.set_updated_at();

-- =============================================================
-- project_files — add wiki display metadata columns
-- =============================================================

alter table public.project_files
  add column if not exists created_by_agent boolean not null default false;
alter table public.project_files
  add column if not exists pinned boolean not null default false;
alter table public.project_files
  add column if not exists visibility text not null default 'surfaced';
alter table public.project_files
  add column if not exists locked boolean not null default false;
alter table public.project_files
  add column if not exists is_source_of_truth boolean not null default false;

do $$
begin
  alter table public.project_files
    add constraint project_files_visibility_check
    check (visibility in ('surfaced', 'internal'));
exception
  when duplicate_object then null;
end $$;

-- =============================================================
-- Backfill: create a project_settings row for every existing project
-- =============================================================

insert into public.project_settings (project_id)
select id from public.projects
on conflict (project_id) do nothing;

-- =============================================================
-- Drop the now-replaced agent_instructions column
-- =============================================================

alter table public.projects drop column if exists agent_instructions;

-- =============================================================
-- RLS for project_settings
-- =============================================================

alter table public.project_settings enable row level security;

create policy "project_settings_select_by_membership"
  on public.project_settings for select
  using (public.user_has_project_access(project_id));

create policy "project_settings_insert_by_membership"
  on public.project_settings for insert
  with check (public.user_has_project_access(project_id));

create policy "project_settings_update_by_membership"
  on public.project_settings for update
  using (public.user_has_project_access(project_id))
  with check (public.user_has_project_access(project_id));

-- =============================================================
-- Storage buckets (private)
-- =============================================================

insert into storage.buckets (id, name, public)
values ('sources', 'sources', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

create policy "sources_project_access" on storage.objects
for all using (
  bucket_id = 'sources'
  and public.user_has_project_access((string_to_array(name, '/'))[1]::uuid)
) with check (
  bucket_id = 'sources'
  and public.user_has_project_access((string_to_array(name, '/'))[1]::uuid)
);

create policy "exports_project_access" on storage.objects
for all using (
  bucket_id = 'exports'
  and public.user_has_project_access((string_to_array(name, '/'))[1]::uuid)
) with check (
  bucket_id = 'exports'
  and public.user_has_project_access((string_to_array(name, '/'))[1]::uuid)
);
