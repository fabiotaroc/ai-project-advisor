create or replace function public.resolve_pending_wiki_edit(
  p_edit_id uuid,
  p_action text,
  p_resolved_by uuid,
  p_new_body text default null,
  p_repositioned boolean default false,
  p_fallback_applied boolean default false,
  p_location_note text default null
)
returns table (
  edit_id uuid,
  status public.pending_wiki_edit_status,
  target_doc_id uuid,
  target_doc_slug text,
  target_doc_title text
)
language plpgsql
set search_path = public
as $$
declare
  v_edit public.pending_wiki_edits%rowtype;
  v_doc public.canonical_docs%rowtype;
  v_source_title text;
  v_status public.pending_wiki_edit_status;
  v_event_type text;
  v_summary text;
begin
  if p_action not in ('accept', 'reject') then
    raise exception 'Unsupported pending wiki edit action: %', p_action;
  end if;

  select *
    into v_edit
    from public.pending_wiki_edits
   where id = p_edit_id
   for update;

  if not found then
    raise exception 'Pending wiki edit % not found', p_edit_id;
  end if;

  if v_edit.status <> 'pending' then
    raise exception 'Pending wiki edit % is already %', p_edit_id, v_edit.status;
  end if;

  select *
    into v_doc
    from public.canonical_docs
   where id = v_edit.target_doc_id
   for update;

  if not found then
    raise exception 'Target canonical doc % not found', v_edit.target_doc_id;
  end if;

  if p_action = 'accept' and p_new_body is null then
    raise exception 'Accepted pending wiki edits require p_new_body';
  end if;

  if p_action = 'accept' then
    update public.canonical_docs
       set body = p_new_body
     where id = v_doc.id;

    v_status := 'accepted';
    v_event_type := 'wiki_edit_accepted';
    v_summary := coalesce(
      nullif(trim(v_edit.reason), ''),
      case
        when nullif(trim(coalesce(v_edit.deleted_text, '')), '') is not null
          then 'Updated wiki text: ' || left(regexp_replace(trim(v_edit.inserted_text), '\s+', ' ', 'g'), 180)
        else 'Added wiki text: ' || left(regexp_replace(trim(v_edit.inserted_text), '\s+', ' ', 'g'), 180)
      end
    );
  else
    v_status := 'rejected';
    v_event_type := 'wiki_edit_rejected';
    v_summary := 'Rejected proposed wiki edit for "' || v_doc.title || '".';
  end if;

  update public.pending_wiki_edits
     set status = v_status,
         resolved_by = p_resolved_by,
         resolved_at = now(),
         repositioned = case when p_action = 'accept' then p_repositioned else repositioned end,
         fallback_applied = case when p_action = 'accept' then p_fallback_applied else fallback_applied end
   where id = v_edit.id;

  select title
    into v_source_title
    from public.source_materials
   where id = v_edit.source_material_id;

  insert into public.activity_events (
    project_id,
    event_type,
    summary,
    actor_id,
    target_type,
    target_id,
    metadata
  )
  values (
    v_edit.project_id,
    v_event_type,
    v_summary,
    p_resolved_by,
    'pending_wiki_edit',
    v_edit.id,
    jsonb_build_object(
      'edit_id', v_edit.id,
      'target_doc_id', v_doc.id,
      'target_doc_slug', v_doc.slug,
      'source_material_id', v_edit.source_material_id,
      'source_title', v_source_title,
      'repositioned', p_repositioned,
      'fallback_applied', p_fallback_applied,
      'location_note', p_location_note
    )
  );

  return query
  select v_edit.id, v_status, v_doc.id, v_doc.slug, v_doc.title;
end;
$$;

revoke execute on function public.resolve_pending_wiki_edit(uuid, text, uuid, text, boolean, boolean, text) from public;
grant execute on function public.resolve_pending_wiki_edit(uuid, text, uuid, text, boolean, boolean, text) to service_role;
