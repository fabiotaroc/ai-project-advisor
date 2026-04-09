-- Fix recursive project access checks by moving membership lookups into
-- security definer helpers that can safely bypass RLS.

create or replace function public.user_has_workspace_access(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = (select auth.uid())
  );
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
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = (select auth.uid())
  );
$$;

revoke all on function public.user_has_workspace_access(uuid) from public;
grant execute on function public.user_has_workspace_access(uuid) to authenticated, service_role;

revoke all on function public.user_has_project_access(uuid) from public;
grant execute on function public.user_has_project_access(uuid) to authenticated, service_role;

drop policy if exists "project_members_access_by_membership" on public.project_members;
create policy "project_members_select_own"
on public.project_members
for select
using (user_id = (select auth.uid()));

drop policy if exists "workspaces_access_by_membership" on public.workspaces;
create policy "workspaces_access_by_membership"
on public.workspaces
for select
using ((select public.user_has_workspace_access(id)));

create or replace function public.match_source_chunks(
  p_project_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 8
)
returns table(
  chunk_id uuid,
  source_material_id uuid,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sc.id as chunk_id,
    sc.source_material_id,
    sc.content,
    1 - (sc.embedding <=> p_query_embedding) as similarity
  from public.source_chunks sc
  join public.source_materials sm on sm.id = sc.source_material_id
  where (select public.user_has_project_access(p_project_id))
    and sm.project_id = p_project_id
  order by sc.embedding <=> p_query_embedding
  limit p_match_count;
$$;

revoke all on function public.match_source_chunks(uuid, vector, int) from public;
grant execute on function public.match_source_chunks(uuid, vector, int) to authenticated, service_role;
