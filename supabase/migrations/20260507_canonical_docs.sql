-- =============================================================
-- Canonical wiki docs: fixed default set + user-pinned customs
-- =============================================================

create table if not exists public.canonical_docs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  slug text not null,
  title text not null,
  body text not null default '',
  is_default boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug),
  check (is_default <> is_pinned)
);

create index if not exists idx_canonical_docs_project
  on public.canonical_docs (project_id, slug);

alter table public.canonical_docs enable row level security;

create policy "canonical_docs_select_by_membership"
  on public.canonical_docs for select
  using (public.user_has_project_access(project_id));

create policy "canonical_docs_insert_by_write_access"
  on public.canonical_docs for insert
  with check (public.user_has_project_write_access(project_id));

create policy "canonical_docs_update_by_write_access"
  on public.canonical_docs for update
  using (public.user_has_project_write_access(project_id))
  with check (public.user_has_project_write_access(project_id));

-- Custom-pinned docs may be deleted by writers; default docs are protected
-- by an explicit guard in the delete policy + trigger below.
create policy "canonical_docs_delete_pinned_only"
  on public.canonical_docs for delete
  using (
    public.user_has_project_write_access(project_id)
    and is_default = false
  );

-- Belt and suspenders: prevent default docs from being deleted by any path
-- (including service-role calls that bypass RLS).
create or replace function public.canonical_docs_block_default_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_default then
    raise exception 'cannot delete default canonical doc % for project %',
      old.slug, old.project_id;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_canonical_docs_block_default_delete on public.canonical_docs;
create trigger trg_canonical_docs_block_default_delete
  before delete on public.canonical_docs
  for each row execute function public.canonical_docs_block_default_delete();

-- =============================================================
-- updated_at maintenance
-- =============================================================
create or replace function public.canonical_docs_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_canonical_docs_touch_updated_at on public.canonical_docs;
create trigger trg_canonical_docs_touch_updated_at
  before update on public.canonical_docs
  for each row execute function public.canonical_docs_touch_updated_at();

-- =============================================================
-- Seed function + new-project trigger
-- =============================================================

create or replace function public.seed_default_canonical_docs(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.canonical_docs (project_id, slug, title, is_default)
  values
    (p_project_id, 'project',   'Project',   true),
    (p_project_id, 'decisions', 'Decisions', true),
    (p_project_id, 'people',    'People',    true),
    (p_project_id, 'work',      'Work',      true),
    (p_project_id, 'glossary',  'Glossary',  true)
  on conflict (project_id, slug) do nothing;
end;
$$;

create or replace function public.seed_canonical_docs_on_project_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_canonical_docs(new.id);
  return new;
end;
$$;

drop trigger if exists trg_seed_canonical_docs_on_project_insert on public.projects;
create trigger trg_seed_canonical_docs_on_project_insert
  after insert on public.projects
  for each row execute function public.seed_canonical_docs_on_project_insert();

-- Backfill: seed defaults for any pre-existing projects.
do $$
declare
  rec record;
begin
  for rec in select id from public.projects loop
    perform public.seed_default_canonical_docs(rec.id);
  end loop;
end;
$$;
