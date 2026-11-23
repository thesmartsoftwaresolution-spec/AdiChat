-- Per-member chat clearing and explicit conversation-wide deletion.
-- "Delete for me" hides all messages at/before cleared_at only for that member.
-- "Delete for everyone" is a separately confirmed, participant-authorized purge.

begin;

alter table public.conversation_members
  add column if not exists cleared_at timestamptz;

drop policy if exists messages_member_select on public.messages;
create policy messages_member_select
  on public.messages
  for select
  to authenticated
  using (
    public.is_conversation_member(conversation_id)
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = (select auth.uid())
        and (cm.cleared_at is null or messages.created_at > cm.cleared_at)
    )
  );

create or replace function public.clear_conversation_for_me(p_conversation_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_active_account() then
    return false;
  end if;

  update public.conversation_members
  set cleared_at = clock_timestamp()
  where conversation_id = p_conversation_id
    and user_id = auth.uid();

  return found;
end;
$$;

revoke all on function public.clear_conversation_for_me(uuid) from public, anon;
grant execute on function public.clear_conversation_for_me(uuid) to authenticated;

create or replace function public.delete_conversation_for_everyone(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type public.conversation_type;
  v_member boolean;
begin
  if auth.uid() is null or not public.is_active_account() then
    return false;
  end if;

  select c.type
    into v_type
  from public.conversations c
  where c.id = p_conversation_id;

  if not found then
    return false;
  end if;

  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
  ) into v_member;

  if not v_member then
    return false;
  end if;

  if v_type = 'group'::public.conversation_type
     and not (public.is_group_admin(p_conversation_id) or public.is_admin()) then
    return false;
  end if;

  delete from public.message_receipts
  where message_id in (
    select m.id from public.messages m where m.conversation_id = p_conversation_id
  );

  delete from public.attachments
  where conversation_id = p_conversation_id;

  delete from public.messages
  where conversation_id = p_conversation_id;

  delete from public.assistant_usage
  where conversation_id = p_conversation_id;

  delete from public.group_assistants
  where group_conversation_id = p_conversation_id;

  delete from public.groups
  where conversation_id = p_conversation_id;

  delete from public.conversation_members
  where conversation_id = p_conversation_id;

  delete from public.conversations
  where id = p_conversation_id;

  return true;
end;
$$;

revoke all on function public.delete_conversation_for_everyone(uuid) from public, anon;
grant execute on function public.delete_conversation_for_everyone(uuid) to authenticated;

commit;
