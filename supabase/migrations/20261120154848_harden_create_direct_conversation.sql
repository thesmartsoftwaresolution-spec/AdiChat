CREATE OR REPLACE FUNCTION public.create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  pair_key text;
  conv_id uuid;
BEGIN
  IF caller_id IS NULL OR caller_id = other_user_id OR NOT public.is_active_account() THEN
    RAISE EXCEPTION 'Valid active account and distinct participant required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = other_user_id
      AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Target user is not available.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_blocks
    WHERE (blocker_user_id = caller_id AND blocked_user_id = other_user_id)
       OR (blocker_user_id = other_user_id AND blocked_user_id = caller_id)
  ) THEN
    RAISE EXCEPTION 'Cannot start conversation due to block settings.';
  END IF;

  pair_key := least(caller_id::text, other_user_id::text) || ':' ||
              greatest(caller_id::text, other_user_id::text);

  INSERT INTO public.conversations (type, created_by, direct_pair_key)
  VALUES ('direct', caller_id, pair_key)
  ON CONFLICT (direct_pair_key) DO NOTHING
  RETURNING id INTO conv_id;

  IF conv_id IS NULL THEN
    SELECT id INTO conv_id
    FROM public.conversations
    WHERE direct_pair_key = pair_key;
  END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id, member_role)
  VALUES
    (conv_id, caller_id, 'member'),
    (conv_id, other_user_id, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN conv_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_direct_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated;