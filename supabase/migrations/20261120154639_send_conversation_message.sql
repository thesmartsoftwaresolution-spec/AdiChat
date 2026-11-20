CREATE OR REPLACE FUNCTION public.send_conversation_message(
  p_conversation_id uuid,
  p_body text,
  p_message_type public.message_type DEFAULT 'text',
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_reply_to_message_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  conv public.conversations%ROWTYPE;
  message_id uuid;
  clean_body text := trim(coalesce(p_body, ''));
  clean_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
BEGIN
  IF caller_id IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION 'Authentication required and account must be active.';
  END IF;

  IF length(clean_body) < 1 OR length(clean_body) > 10000 THEN
    RAISE EXCEPTION 'Message must contain 1 to 10000 characters.';
  END IF;

  IF pg_column_size(clean_metadata) > 16384 THEN
    RAISE EXCEPTION 'Message metadata is too large.';
  END IF;

  IF p_message_type NOT IN ('text', 'image', 'file', 'voice') THEN
    RAISE EXCEPTION 'Unsupported user message type.';
  END IF;

  SELECT * INTO conv
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND OR NOT public.is_conversation_member(p_conversation_id) THEN
    RAISE EXCEPTION 'Conversation not found or access denied.';
  END IF;

  IF conv.type = 'assistant' THEN
    RAISE EXCEPTION 'Use the assistant chat endpoint for assistant conversations.';
  END IF;

  IF conv.type = 'group' THEN
    IF EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.conversation_id = p_conversation_id
        AND g.only_admins_send = true
    ) AND NOT public.is_group_admin(p_conversation_id) THEN
      RAISE EXCEPTION 'Only group admins can send messages in this group.';
    END IF;
  ELSIF conv.type = 'direct' THEN
    IF EXISTS (
      SELECT 1
      FROM public.conversation_members cm
      JOIN public.user_blocks b
        ON (b.blocker_user_id = caller_id AND b.blocked_user_id = cm.user_id)
        OR (b.blocker_user_id = cm.user_id AND b.blocked_user_id = caller_id)
      WHERE cm.conversation_id = p_conversation_id
        AND cm.user_id <> caller_id
    ) THEN
      RAISE EXCEPTION 'Cannot send a message because one participant has blocked the other.';
    END IF;
  END IF;

  IF p_reply_to_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = p_reply_to_message_id
      AND m.conversation_id = p_conversation_id
  ) THEN
    RAISE EXCEPTION 'Reply target must belong to the same conversation.';
  END IF;

  INSERT INTO public.messages (
    conversation_id,
    sender_user_id,
    message_type,
    body,
    reply_to_message_id,
    delivery_status,
    metadata
  ) VALUES (
    p_conversation_id,
    caller_id,
    p_message_type,
    clean_body,
    p_reply_to_message_id,
    'sent',
    clean_metadata
  )
  RETURNING id INTO message_id;

  UPDATE public.conversations
  SET last_message_id = message_id,
      last_message_at = now(),
      updated_at = now()
  WHERE id = p_conversation_id;

  RETURN message_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.send_conversation_message(uuid, text, public.message_type, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(uuid, text, public.message_type, jsonb, uuid) TO authenticated;