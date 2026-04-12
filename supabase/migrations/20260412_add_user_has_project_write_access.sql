-- Role-aware write check (owner or editor). Required by later RLS policies.
-- Idempotent with 20260412_enforce_viewer_read_only.sql (create or replace).

create or replace function public.user_has_project_write_access(p_project_id uuid)
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
      and pm.role in ('owner', 'editor')
  );
$$;

revoke all on function public.user_has_project_write_access(uuid) from public;
grant execute on function public.user_has_project_write_access(uuid) to authenticated, service_role;
