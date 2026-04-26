-- Aggregate helper for project chat list: last message time per conversation.
create or replace function public.chat_last_message_times(p_conversation_ids uuid[])
returns table (conversation_id uuid, last_message_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select m.conversation_id, max(m.created_at) as last_message_at
  from public.messages m
  where p_conversation_ids is not null
    and cardinality(p_conversation_ids) > 0
    and m.conversation_id = any(p_conversation_ids)
  group by m.conversation_id;
$$;

revoke all on function public.chat_last_message_times(uuid[]) from public;
grant execute on function public.chat_last_message_times(uuid[]) to authenticated, service_role;
