-- Secure runtime support for assistants participating in group conversations.
CREATE OR REPLACE FUNCTION public.get_group_assistant_context(
  p_group_id uuid,
  p_message_id uuid
)
RETURNS TABLE (
  assistant_id uuid,
  name text,
  handle text,
  description text,
  role text,
  scenario text,
  behaviour text,
  personality text,
  instructions text,
  tone text,
  language text,
  response_mode public.assistant_response_mode
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL OR NOT public.is_active_account()
     OR NOT public.is_conversation_member(p_group_id) THEN
    RAISE EXCEPTION 'Active group membership required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.groups g ON g.conversation_id = c.id
    JOIN public.messages m ON m.conversation_id = c.id
    WHERE c.id = p_group_id
      AND c.type = 'group'
      AND g.allow_ai_auto_respond = true
      AND m.id = p_message_id
      AND m.sender_user_id = caller_id
      AND m.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Group message is unavailable or AI replies are disabled.';
  END IF;

  RETURN QUERY
  SELECT a.id, a.name, coalesce(a.handle, ''), a.description, a.role,
         a.scenario, a.behaviour, a.personality, a.instructions, a.tone,
         a.language, ga.response_mode
  FROM public.group_assistants ga
  JOIN public.ai_assistants a ON a.id = ga.assistant_id
  WHERE ga.group_conversation_id = p_group_id
    AND ga.is_enabled = true
    AND a.is_enabled = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_group_assistant_response(
  p_group_id uuid,
  p_assistant_id uuid,
  p_user_message_id uuid,
  p_body text,
  p_model_id text,
  p_latency_ms integer,
  p_input_units integer,
  p_output_units integer,
  p_request_id text,
  p_thinking_mode boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  message_id uuid;
BEGIN
  IF caller_id IS NULL OR NOT public.is_active_account()
     OR NOT public.is_conversation_member(p_group_id) THEN
    RAISE EXCEPTION 'Active group membership required.';
  END IF;
  IF length(trim(coalesce(p_body, ''))) = 0 OR length(p_body) > 20000 THEN
    RAISE EXCEPTION 'Assistant response is empty or too large.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.groups g ON g.conversation_id = c.id
    JOIN public.group_assistants ga ON ga.group_conversation_id = c.id
      AND ga.assistant_id = p_assistant_id AND ga.is_enabled = true
    JOIN public.ai_assistants a ON a.id = ga.assistant_id AND a.is_enabled = true
    JOIN public.messages m ON m.id = p_user_message_id
      AND m.conversation_id = c.id AND m.sender_user_id = caller_id
      AND m.deleted_at IS NULL
    WHERE c.id = p_group_id
      AND c.type = 'group'
      AND g.allow_ai_auto_respond = true
  ) THEN
    RAISE EXCEPTION 'Assistant is not enabled for this group message.';
  END IF;

  SELECT id INTO message_id
  FROM public.messages
  WHERE conversation_id = p_group_id
    AND sender_assistant_id = p_assistant_id
    AND reply_to_message_id = p_user_message_id
    AND deleted_at IS NULL
  LIMIT 1;
  IF message_id IS NOT NULL THEN
    RETURN message_id;
  END IF;

  IF (
    SELECT count(*) FROM public.assistant_usage
    WHERE user_id = caller_id
      AND created_at >= now() - interval '24 hours'
      AND request_status = 'success'
  ) >= 50 THEN
    RAISE EXCEPTION 'Daily assistant request limit reached.';
  END IF;

  INSERT INTO public.messages (
    conversation_id, sender_assistant_id, message_type, body,
    reply_to_message_id, delivery_status, metadata
  ) VALUES (
    p_group_id, p_assistant_id, 'text', trim(p_body),
    p_user_message_id, 'sent',
    jsonb_build_object(
      'thinking_mode', coalesce(p_thinking_mode, false),
      'model_id', p_model_id,
      'latency_ms', p_latency_ms
    )
  ) RETURNING id INTO message_id;

  UPDATE public.conversations
  SET last_message_id = message_id, last_message_at = now(), updated_at = now()
  WHERE id = p_group_id;

  INSERT INTO public.assistant_usage (
    assistant_id, user_id, conversation_id, model_id, input_units,
    output_units, request_status, latency_ms, request_id
  ) VALUES (
    p_assistant_id, caller_id, p_group_id, p_model_id,
    p_input_units, p_output_units, 'success', p_latency_ms, p_request_id
  );

  RETURN message_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_group_assistant_context(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_assistant_context(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_group_assistant_response(uuid, uuid, uuid, text, text, integer, integer, integer, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_group_assistant_response(uuid, uuid, uuid, text, text, integer, integer, integer, text, boolean) TO authenticated;
