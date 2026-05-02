-- Hybrid source retrieval: vector similarity + lexical full-text matching on chunk text.
-- Lexical leg uses runtime to_tsvector (no persisted tsvector column) to avoid bulk table
-- rewrites exceeding maintenance_work_mem on small Postgres instances.
-- Optionally add GENERATED STORED content_tsv + gin index separately when chunk volume warrants it.

create or replace function public.match_source_chunks_hybrid(
  p_project_id uuid,
  p_query_embedding vector,
  p_query_text text,
  p_match_count integer default 8,
  p_semantic_pool integer default 24,
  p_lexical_pool integer default 24
)
returns table(
  chunk_id uuid,
  source_material_id uuid,
  content text,
  similarity double precision,
  semantic_similarity double precision,
  lexical_rank double precision,
  match_kind text,
  char_start integer,
  char_end integer
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with accessibility as (
    select (select public.user_has_project_access(p_project_id)) as ok
  ),
  semantic_candidates as (
    select
      s.cid,
      s.smid,
      s.cbody,
      s.cstart,
      s.cend,
      s.sem_sim,
      row_number() over (order by s.dist_ord) as sem_rn
    from (
      select
        sc.id as cid,
        sc.source_material_id as smid,
        sc.content as cbody,
        sc.char_start as cstart,
        sc.char_end as cend,
        (1::double precision - (sc.embedding <=> p_query_embedding)::double precision)
          as sem_sim,
        (sc.embedding <=> p_query_embedding) as dist_ord
      from public.source_chunks sc
      join public.source_materials sm on sm.id = sc.source_material_id
      cross join accessibility a
      where a.ok
        and sm.project_id = p_project_id
        and sc.embedding is not null
      order by sc.embedding <=> p_query_embedding
      limit greatest(1, p_semantic_pool)
    ) as s
  ),
  lexical_q as (
    select case
      when length(trim(both from coalesce(p_query_text, ''))) < 2 then null::tsquery
      else plainto_tsquery('english', trim(both from p_query_text))
    end as tsq
  ),
  lexical_candidates as (
    select
      lx.cid,
      lx.smid,
      lx.cbody,
      lx.cstart,
      lx.cend,
      lx.tsrank,
      row_number() over (order by lx.tsrank desc) as lex_rn
    from (
      select
        sc.id as cid,
        sc.source_material_id as smid,
        sc.content as cbody,
        sc.char_start as cstart,
        sc.char_end as cend,
        ts_rank_cd(
          to_tsvector('english', sc.content),
          lq.tsq
        )::double precision as tsrank
      from public.source_chunks sc
      join public.source_materials sm on sm.id = sc.source_material_id
      cross join accessibility a
      cross join lexical_q lq
      where a.ok
        and sm.project_id = p_project_id
        and lq.tsq is not null
        and to_tsvector('english', sc.content) @@ lq.tsq
      order by ts_rank_cd(to_tsvector('english', sc.content), lq.tsq) desc
      limit greatest(1, p_lexical_pool)
    ) as lx
  ),
  merged as (
    select
      coalesce(s.cid, l.cid) as m_chunk_id,
      coalesce(s.smid, l.smid) as m_source_material_id,
      coalesce(s.cbody, l.cbody) as m_content,
      coalesce(s.cstart, l.cstart) as m_char_start,
      coalesce(s.cend, l.cend) as m_char_end,
      s.sem_sim,
      l.tsrank,
      s.sem_rn,
      l.lex_rn
    from semantic_candidates s
    full outer join lexical_candidates l on s.cid = l.cid
  ),
  fused as (
    select
      m.m_chunk_id,
      m.m_source_material_id,
      m.m_content,
      m.m_char_start,
      m.m_char_end,
      m.sem_sim,
      m.tsrank,
      case
        when m.sem_rn is not null and m.lex_rn is not null then 'both'
        when m.sem_rn is not null then 'semantic'
        else 'lexical'
      end as mk,
      (
        coalesce(1::double precision / (60::double precision + m.sem_rn::double precision), 0::double precision)
        + coalesce(
            1::double precision / (60::double precision + m.lex_rn::double precision),
            0::double precision
          )
      )::double precision as rrf
    from merged m
  )
  select
    f.m_chunk_id as chunk_id,
    f.m_source_material_id as source_material_id,
    f.m_content as content,
    (f.rrf / nullif(max(f.rrf) over (), 0::double precision))::double precision as similarity,
    f.sem_sim as semantic_similarity,
    f.tsrank as lexical_rank,
    f.mk as match_kind,
    f.m_char_start::integer as char_start,
    f.m_char_end::integer as char_end
  from fused f
  order by f.rrf desc, f.m_chunk_id
  limit greatest(1, p_match_count);
$function$;

revoke all on function public.match_source_chunks_hybrid(uuid, vector, text, integer, integer, integer) from public;
grant execute on function public.match_source_chunks_hybrid(uuid, vector, text, integer, integer, integer)
  to authenticated, service_role;
