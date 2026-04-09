create or replace function public.user_has_project_access(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.user_has_project_access(uuid) from public;
grant execute on function public.user_has_project_access(uuid) to authenticated, service_role;

drop policy if exists "project_file_versions_edit_by_member" on public.project_file_versions;
create policy "project_file_versions_edit_by_member"
on public.project_file_versions
for all using (
  exists (
    select 1
    from public.project_files pf
    where pf.id = project_file_id
      and public.user_has_project_access(pf.project_id)
  )
)
with check (
  exists (
    select 1
    from public.project_files pf
    where pf.id = project_file_id
      and public.user_has_project_access(pf.project_id)
  )
);

drop policy if exists "activity_events_insert_by_member" on public.activity_events;
create policy "activity_events_insert_by_member"
on public.activity_events
for insert
with check (public.user_has_project_access(project_id));
