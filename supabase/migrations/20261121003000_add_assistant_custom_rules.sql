-- Add owner-managed, assistant-level behavior rules without changing existing assistant records.
ALTER TABLE public.ai_assistants
  ADD COLUMN IF NOT EXISTS custom_rules text;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_assistants_custom_rules_length_chk'
      AND conrelid = 'public.ai_assistants'::regclass
  ) THEN
    ALTER TABLE public.ai_assistants
      ADD CONSTRAINT ai_assistants_custom_rules_length_chk
      CHECK (custom_rules IS NULL OR char_length(custom_rules) <= 12000);
  END IF;
END;
$migration$;

-- The return shape changes by one nullable assistant-owned field, so recreate this RPC.
DROP FUNCTION public.get_group_assistant_context(uuid, uuid);

CREATE FUNCTION public.get_group_assistant_context(
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
  custom_rules text,
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
         a.scenario, a.behaviour, a.personality, a.instructions,
         a.custom_rules, a.tone, a.language, ga.response_mode
  FROM public.group_assistants ga
  JOIN public.ai_assistants a ON a.id = ga.assistant_id
  WHERE ga.group_conversation_id = p_group_id
    AND ga.is_enabled = true
    AND a.is_enabled = true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_group_assistant_context(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_assistant_context(uuid, uuid) TO authenticated;
