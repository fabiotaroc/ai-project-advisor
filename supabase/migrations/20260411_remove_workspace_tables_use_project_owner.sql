alter table public.projects add column if not exists owner_id uuid;

update public.projects p
set owner_id = w.owner_id
from public.workspaces w
where p.workspace_id = w.id
  and p.owner_id is null;

insert into public.project_members (project_id, user_id, role)
select p.id, p.owner_id, 'owner'
from public.projects p
where p.owner_id is not null
on conflict (project_id, user_id) do update
set role = excluded.role;

alter table public.projects alter column owner_id set not null;

create index if not exists idx_projects_owner_id on public.projects(owner_id);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'projects'
      and constraint_name = 'projects_owner_id_fkey'
  ) then
    alter table public.projects
      add constraint projects_owner_id_fkey
      foreign key (owner_id)
      references public.profiles(id)
      on delete restrict;
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(excluded.name, public.profiles.name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

create or replace function public.user_has_project_access(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.user_has_project_access(uuid) from public;
grant execute on function public.user_has_project_access(uuid) to authenticated, service_role;

drop policy if exists "project_invites_owner_select" on public.project_invites;
create policy "project_invites_owner_select"
on public.project_invites
for select
using (
  exists (
    select 1
    from public.projects p
    where p.id = public.project_invites.project_id
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "workspace_members_select_own" on public.workspace_members;
drop policy if exists "workspaces_access_by_membership" on public.workspaces;
drop function if exists public.user_has_workspace_access(uuid);

drop index if exists public.idx_projects_workspace_id;
alter table public.projects drop constraint if exists projects_workspace_id_fkey;
alter table public.projects drop column if exists workspace_id;

drop table if exists public.workspace_members;
drop table if exists public.workspaces;
