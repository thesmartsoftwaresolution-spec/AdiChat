-- Bind each assistant chat to a real assistant and persist AI turns through authenticated RPCs.
alter table public.conversations
  add column if not exists assistant_id uuid references public.ai_assistants(id) on delete set null;

create unique index if not exists conversations_assistant_owner_unique
  on public.conversations (created_by, assistant_id)
  where type = 'assistant' and assistant_id is not null;

create or replace function public.get_or_create_assistant_conversation(p_assistant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  assistant_row public.ai_assistants%rowtype;
  conv_id uuid;
begin
  if caller_id is null or not public.is_active_account() then
    raise exception 'Authentication required and account must be active.';
  end if;

  select * into assistant_row
  from public.ai_assistants
  where id = p_assistant_id and is_enabled = true;

  if not found or (assistant_row.owner_user_id <> caller_id and not public.is_admin()) then
    raise exception 'Assistant not found or access denied.';
  end if;

  insert into public.conversations (type, title, created_by, assistant_id)
  values ('assistant', assistant_row.name, caller_id, assistant_row.id)
  on conflict (created_by, assistant_id)
    where type = 'assistant' and assistant_id is not null
    do nothing;

  select id into conv_id
  from public.conversations
  where type = 'assistant'
    and created_by = caller_id
    and assistant_id = assistant_row.id;

  insert into public.conversation_members (conversation_id, user_id, member_role)
  values (conv_id, caller_id, 'member')
  on conflict (conversation_id, user_id) do nothing;

  return conv_id;
end;
$$;

create or replace function public.create_assistant_user_message(
  p_conversation_id uuid,
  p_assistant_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  message_id uuid;
begin
  if caller_id is null or not public.is_active_account() then
    raise exception 'Authentication required and account must be active.';
  end if;
  if length(trim(coalesce(p_body, ''))) = 0 or length(p_body) > 4000 then
    raise exception 'Prompt must contain 1 to 4000 characters.';
  end if;
  if not exists (
    select 1
    from public.conversations c
    join public.ai_assistants a on a.id = c.assistant_id
    join public.conversation_members cm on cm.conversation_id = c.id and cm.user_id = caller_id
    where c.id = p_conversation_id
      and c.type = 'assistant'
      and c.assistant_id = p_assistant_id
      and a.is_enabled = true
      and (a.owner_user_id = caller_id or public.is_admin())
  ) then
    raise exception 'Assistant conversation access denied.';
  end if;

  insert into public.messages (
    conversation_id, sender_user_id, message_type, body, delivery_status
  ) values (
    p_conversation_id, caller_id, 'text', trim(p_body), 'sent'
  ) returning id into message_id;

  update public.conversations
  set last_message_id = message_id, last_message_at = now(), updated_at = now()
  where id = p_conversation_id;

  return message_id;
end;
$$;

create or replace function public.can_request_assistant_reply()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null or not public.is_active_account() then
    return false;
  end if;
  return (
    select count(*) < 50
    from public.assistant_usage
    where user_id = caller_id
      and created_at >= now() - interval '24 hours'
      and request_status = 'success'
  );
end;
$$;

create or replace function public.record_assistant_response(
  p_conversation_id uuid,
  p_assistant_id uuid,
  p_body text,
  p_model_id text,
  p_latency_ms integer,
  p_input_units integer,
  p_output_units integer,
  p_request_id text,
  p_thinking_mode boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  message_id uuid;
begin
  if caller_id is null or not public.is_active_account() then
    raise exception 'Authentication required and account must be active.';
  end if;
  if length(trim(coalesce(p_body, ''))) = 0 or length(p_body) > 20000 then
    raise exception 'Assistant response is empty or too large.';
  end if;
  if not exists (
    select 1
    from public.conversations c
    join public.ai_assistants a on a.id = c.assistant_id
    join public.conversation_members cm on cm.conversation_id = c.id and cm.user_id = caller_id
    where c.id = p_conversation_id
      and c.type = 'assistant'
      and c.assistant_id = p_assistant_id
      and a.is_enabled = true
      and (a.owner_user_id = caller_id or public.is_admin())
  ) then
    raise exception 'Assistant conversation access denied.';
  end if;
  if (select count(*) from public.assistant_usage
      where user_id = caller_id and created_at >= now() - interval '24 hours'
        and request_status = 'success') >= 50 then
    raise exception 'Daily assistant request limit reached.';
  end if;

  insert into public.messages (
    conversation_id, sender_assistant_id, message_type, body, delivery_status, metadata
  ) values (
    p_conversation_id, p_assistant_id, 'text', trim(p_body), 'sent',
    jsonb_build_object(
      'thinking_mode', coalesce(p_thinking_mode, false),
      'model_id', p_model_id,
      'latency_ms', p_latency_ms
    )
  ) returning id into message_id;

  update public.conversations
  set last_message_id = message_id, last_message_at = now(), updated_at = now()
  where id = p_conversation_id;

  insert into public.assistant_usage (
    assistant_id, user_id, conversation_id, model_id, input_units,
    output_units, request_status, latency_ms, request_id
  ) values (
    p_assistant_id, caller_id, p_conversation_id, p_model_id,
    p_input_units, p_output_units, 'success', p_latency_ms, p_request_id
  );

  return message_id;
end;
$$;

revoke execute on function public.get_or_create_assistant_conversation(uuid) from public, anon;
revoke execute on function public.create_assistant_user_message(uuid, uuid, text) from public, anon;
revoke execute on function public.can_request_assistant_reply() from public, anon;
revoke execute on function public.record_assistant_response(uuid, uuid, text, text, integer, integer, integer, text, boolean) from public, anon;

grant execute on function public.get_or_create_assistant_conversation(uuid) to authenticated;
grant execute on function public.create_assistant_user_message(uuid, uuid, text) to authenticated;
grant execute on function public.can_request_assistant_reply() to authenticated;
grant execute on function public.record_assistant_response(uuid, uuid, text, text, integer, integer, integer, text, boolean) to authenticated;
