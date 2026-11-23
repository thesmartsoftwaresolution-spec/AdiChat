-- Preserve assistant-authored chat history when its assistant is deleted.
-- The assistant FK is cleared before the parent row is removed; the original
-- message body/type remain unchanged and attribution is retained in metadata.

begin;

alter table public.messages
  drop constraint if exists messages_sender_identity_chk;

alter table public.messages
  add constraint messages_sender_identity_chk
  check (
    (
      message_type = 'system'::public.message_type
      and sender_user_id is null
      and sender_assistant_id is null
    )
    or (
      (sender_user_id is not null) <> (sender_assistant_id is not null)
    )
    or (
      sender_user_id is null
      and sender_assistant_id is null
      and message_type <> 'system'::public.message_type
      and metadata ? 'deleted_assistant_id'
    )
  );

create or replace function public.preserve_assistant_messages_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.messages
  set sender_assistant_id = null,
      metadata = metadata || jsonb_build_object(
        'deleted_assistant_id', old.id,
        'deleted_assistant_name', old.name
      )
  where sender_assistant_id = old.id;

  return old;
end;
$$;

revoke all on function public.preserve_assistant_messages_before_delete() from public, anon, authenticated;

drop trigger if exists preserve_assistant_messages_before_delete on public.ai_assistants;

create trigger preserve_assistant_messages_before_delete
before delete on public.ai_assistants
for each row
execute function public.preserve_assistant_messages_before_delete();

commit;
