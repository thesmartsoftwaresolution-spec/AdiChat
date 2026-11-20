CREATE OR REPLACE FUNCTION public.create_group_with_settings(
  p_group_name text,
  p_group_description text DEFAULT NULL,
  p_member_ids uuid[] DEFAULT '{}'::uuid[],
  p_assistant_ids uuid[] DEFAULT '{}'::uuid[],
  p_only_admins_send boolean DEFAULT false,
  p_allow_ai_auto_respond boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  conv_id uuid;
  system_message_id uuid;
  clean_name text := trim(coalesce(p_group_name, ''));
  clean_description text := nullif(trim(coalesce(p_group_description, '')), '');
  configured_group_limit integer;
  effective_group_limit integer;
  requested_member_count integer;
BEGIN
  IF caller_id IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION 'Authentication required and account must be active.';
  END IF;

  IF length(clean_name) < 2 OR length(clean_name) > 50 THEN
    RAISE EXCEPTION 'Group name must be between 2 and 50 characters.';
  END IF;

  IF length(coalesce(clean_description, '')) > 500 THEN
    RAISE EXCEPTION 'Group description is too long.';
  END IF;

  SELECT CASE
    WHEN (s.value #>> '{}') ~ '^[0-9]+$' THEN (s.value #>> '{}')::integer
    ELSE NULL
  END
  INTO configured_group_limit
  FROM public.app_settings s
  WHERE s.key = 'group_size_limit';

  effective_group_limit := coalesce(configured_group_limit, 256);
  IF effective_group_limit < 2 OR effective_group_limit > 1000 THEN
    effective_group_limit := 256;
  END IF;

  SELECT count(DISTINCT requested.user_id)::integer
  INTO requested_member_count
  FROM unnest(coalesce(p_member_ids, '{}'::uuid[])) AS requested(user_id)
  WHERE requested.user_id IS NOT NULL
    AND requested.user_id <> caller_id;

  IF requested_member_count + 1 > effective_group_limit THEN
    RAISE EXCEPTION 'Group size exceeds the configured limit of % members.', effective_group_limit;
  END IF;

  IF requested_member_count = 0 THEN
    RAISE EXCEPTION 'Select at least one other active group member.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(coalesce(p_member_ids, '{}'::uuid[])) AS requested(user_id)
    LEFT JOIN public.profiles p ON p.id = requested.user_id
    WHERE requested.user_id IS NOT NULL
      AND requested.user_id <> caller_id
      AND (p.id IS NULL OR p.status <> 'active')
  ) THEN
    RAISE EXCEPTION 'All group members must have active accounts.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(coalesce(p_assistant_ids, '{}'::uuid[])) AS requested(assistant_id)
    LEFT JOIN public.ai_assistants a
      ON a.id = requested.assistant_id
     AND a.owner_user_id = caller_id
     AND a.is_enabled = true
    WHERE requested.assistant_id IS NOT NULL
      AND a.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Only your enabled AI assistants can be added to this group.';
  END IF;

  INSERT INTO public.conversations (type, title, created_by)
  VALUES ('group', clean_name, caller_id)
  RETURNING id INTO conv_id;

  INSERT INTO public.groups (
    conversation_id,
    name,
    description,
    created_by,
    only_admins_send,
    allow_ai_auto_respond
  ) VALUES (
    conv_id,
    clean_name,
    clean_description,
    caller_id,
    coalesce(p_only_admins_send, false),
    coalesce(p_allow_ai_auto_respond, true)
  );

  INSERT INTO public.conversation_members (conversation_id, user_id, member_role, last_read_at)
  VALUES (conv_id, caller_id, 'admin', now());

  INSERT INTO public.conversation_members (conversation_id, user_id, member_role)
  SELECT conv_id, requested.user_id, 'member'
  FROM (
    SELECT DISTINCT unnest(coalesce(p_member_ids, '{}'::uuid[])) AS user_id
  ) requested
  WHERE requested.user_id IS NOT NULL
    AND requested.user_id <> caller_id;

  INSERT INTO public.group_assistants (
    group_conversation_id,
    assistant_id,
    response_mode,
    added_by,
    is_enabled
  )
  SELECT conv_id, requested.assistant_id, 'mentioned_only', caller_id, true
  FROM (
    SELECT DISTINCT unnest(coalesce(p_assistant_ids, '{}'::uuid[])) AS assistant_id
  ) requested
  WHERE requested.assistant_id IS NOT NULL;

  INSERT INTO public.messages (
    conversation_id,
    sender_user_id,
    sender_assistant_id,
    message_type,
    body,
    delivery_status,
    metadata
  ) VALUES (
    conv_id,
    NULL,
    NULL,
    'system',
    'Group "' || clean_name || '" created.',
    'read',
    '{}'::jsonb
  )
  RETURNING id INTO system_message_id;

  UPDATE public.conversations
  SET last_message_id = system_message_id,
      last_message_at = now(),
      updated_at = now()
  WHERE id = conv_id;

  RETURN conv_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_group_with_settings(text, text, uuid[], uuid[], boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_with_settings(text, text, uuid[], uuid[], boolean, boolean) TO authenticated;