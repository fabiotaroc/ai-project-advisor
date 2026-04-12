-- =============================================================
-- Add role-aware write-access function
-- =============================================================
-- Returns true only for project owner or members with editor role.
-- Viewers are excluded from all write paths at the RLS level.

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

-- =============================================================
-- project_files: split FOR ALL into SELECT + write policies
-- =============================================================

drop policy if exists "project_files_edit_by_member" on public.project_files;

create policy "project_files_select_by_member"
  on public.project_files for select
  using (public.user_has_project_access(project_id));

create policy "project_files_write_by_editor"
  on public.project_files for insert
  with check (public.user_has_project_write_access(project_id));

create policy "project_files_update_by_editor"
  on public.project_files for update
  using (public.user_has_project_write_access(project_id))
  with check (public.user_has_project_write_access(project_id));

create policy "project_files_delete_by_editor"
  on public.project_files for delete
  using (public.user_has_project_write_access(project_id));

-- =============================================================
-- project_file_versions: split FOR ALL into SELECT + write
-- =============================================================

drop policy if exists "project_file_versions_edit_by_member" on public.project_file_versions;

create policy "project_file_versions_select_by_member"
  on public.project_file_versions for select
  using (
    exists (
      select 1 from public.project_files pf
      where pf.id = project_file_id
        and public.user_has_project_access(pf.project_id)
    )
  );

create policy "project_file_versions_write_by_editor"
  on public.project_file_versions for insert
  with check (
    exists (
      select 1 from public.project_files pf
      where pf.id = project_file_id
        and public.user_has_project_write_access(pf.project_id)
    )
  );

create policy "project_file_versions_update_by_editor"
  on public.project_file_versions for update
  using (
    exists (
      select 1 from public.project_files pf
      where pf.id = project_file_id
        and public.user_has_project_write_access(pf.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.project_files pf
      where pf.id = project_file_id
        and public.user_has_project_write_access(pf.project_id)
    )
  );

-- =============================================================
-- conversations: split FOR ALL into SELECT + write
-- =============================================================

drop policy if exists "conversations_access_by_membership" on public.conversations;

create policy "conversations_select_by_member"
  on public.conversations for select
  using (public.user_has_project_access(project_id));

create policy "conversations_write_by_editor"
  on public.conversations for insert
  with check (public.user_has_project_write_access(project_id));

create policy "conversations_update_by_editor"
  on public.conversations for update
  using (public.user_has_project_write_access(project_id))
  with check (public.user_has_project_write_access(project_id));

create policy "conversations_delete_by_editor"
  on public.conversations for delete
  using (public.user_has_project_write_access(project_id));

-- =============================================================
-- messages: split FOR ALL into SELECT + write
-- =============================================================

drop policy if exists "messages_access_by_membership" on public.messages;

create policy "messages_select_by_member"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and public.user_has_project_access(c.project_id)
    )
  );

create policy "messages_write_by_editor"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and public.user_has_project_write_access(c.project_id)
    )
  );

create policy "messages_update_by_editor"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and public.user_has_project_write_access(c.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and public.user_has_project_write_access(c.project_id)
    )
  );

create policy "messages_delete_by_editor"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and public.user_has_project_write_access(c.project_id)
    )
  );

-- =============================================================
-- source_materials: split FOR ALL into SELECT + write
-- =============================================================

drop policy if exists "source_materials_access_by_membership" on public.source_materials;

create policy "source_materials_select_by_member"
  on public.source_materials for select
  using (public.user_has_project_access(project_id));

create policy "source_materials_write_by_editor"
  on public.source_materials for insert
  with check (public.user_has_project_write_access(project_id));

create policy "source_materials_update_by_editor"
  on public.source_materials for update
  using (public.user_has_project_write_access(project_id))
  with check (public.user_has_project_write_access(project_id));

create policy "source_materials_delete_by_editor"
  on public.source_materials for delete
  using (public.user_has_project_write_access(project_id));

-- =============================================================
-- activity_events: restrict INSERT to editors
-- =============================================================

drop policy if exists "activity_events_insert_by_member" on public.activity_events;

create policy "activity_events_insert_by_editor"
  on public.activity_events for insert
  with check (public.user_has_project_write_access(project_id));

-- =============================================================
-- project_settings: restrict INSERT/UPDATE to editors
-- =============================================================

drop policy if exists "project_settings_insert_by_membership" on public.project_settings;
drop policy if exists "project_settings_update_by_membership" on public.project_settings;

create policy "project_settings_insert_by_editor"
  on public.project_settings for insert
  with check (public.user_has_project_write_access(project_id));

create policy "project_settings_update_by_editor"
  on public.project_settings for update
  using (public.user_has_project_write_access(project_id))
  with check (public.user_has_project_write_access(project_id));

-- =============================================================
-- storage.objects: restrict writes to editors
-- =============================================================

drop policy if exists "sources_project_access" on storage.objects;
drop policy if exists "exports_project_access" on storage.objects;

create policy "sources_read_by_member" on storage.objects
  for select using (
    bucket_id = 'sources'
    and public.user_has_project_access((string_to_array(name, '/'))[1]::uuid)
  );

create policy "sources_write_by_editor" on storage.objects
  for insert with check (
    bucket_id = 'sources'
    and public.user_has_project_write_access((string_to_array(name, '/'))[1]::uuid)
  );

create policy "sources_update_by_editor" on storage.objects
  for update
  using (
    bucket_id = 'sources'
    and public.user_has_project_write_access((string_to_array(name, '/'))[1]::uuid)
  )
  with check (
    bucket_id = 'sources'
    and public.user_has_project_write_access((string_to_array(name, '/'))[1]::uuid)
  );

create policy "sources_delete_by_editor" on storage.objects
  for delete using (
    bucket_id = 'sources'
    and public.user_has_project_write_access((string_to_array(name, '/'))[1]::uuid)
  );

create policy "exports_read_by_member" on storage.objects
  for select using (
    bucket_id = 'exports'
    and public.user_has_project_access((string_to_array(name, '/'))[1]::uuid)
  );

create policy "exports_write_by_editor" on storage.objects
  for insert with check (
    bucket_id = 'exports'
    and public.user_has_project_write_access((string_to_array(name, '/'))[1]::uuid)
  );

create policy "exports_update_by_editor" on storage.objects
  for update
  using (
    bucket_id = 'exports'
    and public.user_has_project_write_access((string_to_array(name, '/'))[1]::uuid)
  )
  with check (
    bucket_id = 'exports'
    and public.user_has_project_write_access((string_to_array(name, '/'))[1]::uuid)
  );

create policy "exports_delete_by_editor" on storage.objects
  for delete using (
    bucket_id = 'exports'
    and public.user_has_project_write_access((string_to_array(name, '/'))[1]::uuid)
  );
