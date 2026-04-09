-- Make workspaces personal: each profile owns exactly one workspace.
-- Keep owner membership rows for compatibility with existing app queries.

insert into public.workspaces (name, owner_id)
select
  coalesce(nullif(trim(p.name), ''), split_part(p.email, '@', 1)) || ' workspace',
  p.id
from public.profiles p
left join public.workspaces w on w.owner_id = p.id
where w.id is null;

insert into public.workspace_members (workspace_id, user_id, role)
select
  w.id,
  w.owner_id,
  'owner'
from public.workspaces w
on conflict (workspace_id, user_id) do update
set role = excluded.role;

create unique index if not exists workspaces_owner_id_key
on public.workspaces(owner_id);

create unique index if not exists workspace_members_user_id_key
on public.workspace_members(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_workspace_name text;
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

  v_workspace_name := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
    split_part(new.email, '@', 1)
  ) || ' workspace';

  insert into public.workspaces (name, owner_id)
  values (v_workspace_name, new.id)
  on conflict (owner_id) do update
    set name = public.workspaces.name
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do update
    set role = excluded.role;

  return new;
end;
$$;

create or replace function public.user_has_workspace_access(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.user_has_workspace_access(uuid) from public;
grant execute on function public.user_has_workspace_access(uuid) to authenticated, service_role;

drop policy if exists "workspaces_access_by_membership" on public.workspaces;
create policy "workspaces_access_by_membership"
on public.workspaces
for select
using ((select public.user_has_workspace_access(id)));
