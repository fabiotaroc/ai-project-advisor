alter table public.source_chunks
  add column if not exists char_start integer,
  add column if not exists char_end integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'source_chunks_char_range_check'
      and conrelid = 'public.source_chunks'::regclass
  ) then
    alter table public.source_chunks
      add constraint source_chunks_char_range_check
      check (
        (char_start is null and char_end is null)
        or (char_start is not null and char_end is not null and char_end >= char_start)
      );
  end if;
end $$;

with located_chunks as (
  select
    sc.id,
    case
      when sm.parsed_content is null then null
      when substring(
        sm.parsed_content
        from (sc.chunk_index * 1000) + 1
        for char_length(sc.content)
      ) = sc.content then sc.chunk_index * 1000
      else nullif(strpos(sm.parsed_content, sc.content), 0) - 1
    end as char_start
  from public.source_chunks sc
  join public.source_materials sm on sm.id = sc.source_material_id
  where sc.char_start is null or sc.char_end is null
)
update public.source_chunks sc
set
  char_start = located_chunks.char_start,
  char_end = located_chunks.char_start + char_length(sc.content)
from located_chunks
where sc.id = located_chunks.id
  and located_chunks.char_start is not null;

drop function if exists public.match_source_chunks(uuid, vector, integer);

create or replace function public.match_source_chunks(
  p_project_id uuid,
  p_query_embedding vector,
  p_match_count integer default 8
)
returns table(
  chunk_id uuid,
  source_material_id uuid,
  content text,
  similarity double precision,
  char_start integer,
  char_end integer
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    sc.id as chunk_id,
    sc.source_material_id,
    sc.content,
    1 - (sc.embedding <=> p_query_embedding) as similarity,
    sc.char_start,
    sc.char_end
  from public.source_chunks sc
  join public.source_materials sm on sm.id = sc.source_material_id
  where (select public.user_has_project_access(p_project_id))
    and sm.project_id = p_project_id
  order by sc.embedding <=> p_query_embedding
  limit p_match_count;
$function$;
