-- Rename public.conversations -> public.chats.
-- Messages RLS subqueries reference the table by name; refresh those policies after rename.

drop policy if exists "messages_select_by_member" on public.messages;
drop policy if exists "messages_write_by_editor" on public.messages;
drop policy if exists "messages_update_by_editor" on public.messages;
drop policy if exists "messages_delete_by_editor" on public.messages;
drop policy if exists "messages_access_by_membership" on public.messages;

drop policy if exists "conversations_select_by_member" on public.conversations;
drop policy if exists "conversations_write_by_editor" on public.conversations;
drop policy if exists "conversations_update_by_editor" on public.conversations;
drop policy if exists "conversations_delete_by_editor" on public.conversations;
drop policy if exists "conversations_access_by_membership" on public.conversations;

alter table public.conversations rename to chats;

create policy "chats_select_by_member"
  on public.chats for select
  using (public.user_has_project_access(project_id));

create policy "chats_write_by_editor"
  on public.chats for insert
  with check (public.user_has_project_write_access(project_id));

create policy "chats_update_by_editor"
  on public.chats for update
  using (public.user_has_project_write_access(project_id))
  with check (public.user_has_project_write_access(project_id));

create policy "chats_delete_by_editor"
  on public.chats for delete
  using (public.user_has_project_write_access(project_id));

create policy "messages_select_by_member"
  on public.messages for select
  using (
    exists (
      select 1 from public.chats c
      where c.id = conversation_id
        and public.user_has_project_access(c.project_id)
    )
  );

create policy "messages_write_by_editor"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.chats c
      where c.id = conversation_id
        and public.user_has_project_write_access(c.project_id)
    )
  );

create policy "messages_update_by_editor"
  on public.messages for update
  using (
    exists (
      select 1 from public.chats c
      where c.id = conversation_id
        and public.user_has_project_write_access(c.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.chats c
      where c.id = conversation_id
        and public.user_has_project_write_access(c.project_id)
    )
  );

create policy "messages_delete_by_editor"
  on public.messages for delete
  using (
    exists (
      select 1 from public.chats c
      where c.id = conversation_id
        and public.user_has_project_write_access(c.project_id)
    )
  );
