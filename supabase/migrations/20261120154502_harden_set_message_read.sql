CREATE OR REPLACE FUNCTION public.set_message_read(conv_id uuid, last_msg_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  receipts_on boolean := true;
BEGIN
  IF caller_id IS NULL
     OR NOT public.is_active_account()
     OR NOT public.is_conversation_member(conv_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF last_msg_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = last_msg_id
      AND m.conversation_id = conv_id
  ) THEN
    RAISE EXCEPTION 'Message does not belong to this conversation.';
  END IF;

  UPDATE public.conversation_members
  SET last_read_at = now()
  WHERE conversation_id = conv_id
    AND user_id = caller_id;

  SELECT read_receipts_enabled INTO receipts_on
  FROM public.user_settings
  WHERE user_id = caller_id;

  IF COALESCE(receipts_on, true) AND last_msg_id IS NOT NULL THEN
    INSERT INTO public.message_receipts (message_id, user_id, delivered_at, read_at)
    VALUES (last_msg_id, caller_id, now(), now())
    ON CONFLICT (message_id, user_id)
    DO UPDATE SET read_at = now();
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_message_read(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_message_read(uuid, uuid) TO authenticated;