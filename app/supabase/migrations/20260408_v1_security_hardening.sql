create or replace function public.user_has_project_access(p_project_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
  );
$$;

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
set search_path = public
as $$
  select
    sc.id as chunk_id,
    sc.source_material_id,
    sc.content,
    1 - (sc.embedding <=> p_query_embedding) as similarity
  from public.source_chunks sc
  join public.source_materials sm on sm.id = sc.source_material_id
  where sm.project_id = p_project_id
  order by sc.embedding <=> p_query_embedding
  limit p_match_count;
$$;
