CREATE OR REPLACE FUNCTION public.update_group_settings(
  p_group_id uuid,
  p_group_name text,
  p_group_description text,
  p_only_admins_send boolean,
  p_allow_ai_auto_respond boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  clean_name text := trim(coalesce(p_group_name, ''));
  clean_description text := nullif(trim(coalesce(p_group_description, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION 'Authentication required and account must be active.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_group_id AND type = 'group'
  ) THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;
  IF NOT public.is_group_admin(p_group_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only group admins can edit group settings.';
  END IF;
  IF length(clean_name) < 2 OR length(clean_name) > 50 THEN
    RAISE EXCEPTION 'Group name must be between 2 and 50 characters.';
  END IF;
  IF length(coalesce(clean_description, '')) > 500 THEN
    RAISE EXCEPTION 'Group description is too long.';
  END IF;

  UPDATE public.groups
  SET name = clean_name,
      description = clean_description,
      only_admins_send = coalesce(p_only_admins_send, false),
      allow_ai_auto_respond = coalesce(p_allow_ai_auto_respond, true),
      updated_at = now()
  WHERE conversation_id = p_group_id;

  UPDATE public.conversations
  SET title = clean_name,
      updated_at = now()
  WHERE id = p_group_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_group_assistants(
  p_group_id uuid,
  p_selections jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  selection jsonb;
  requested_assistant_id uuid;
  requested_mode public.assistant_response_mode;
BEGIN
  IF caller_id IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION 'Authentication required and account must be active.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_group_id AND type = 'group'
  ) THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;
  IF NOT public.is_group_admin(p_group_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only group admins can manage group assistants.';
  END IF;
  IF jsonb_typeof(coalesce(p_selections, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Assistant selections must be an array.';
  END IF;
  IF jsonb_array_length(coalesce(p_selections, '[]'::jsonb)) > 100 THEN
    RAISE EXCEPTION 'Too many assistant selections.';
  END IF;

  FOR selection IN SELECT value FROM jsonb_array_elements(coalesce(p_selections, '[]'::jsonb))
  LOOP
    IF coalesce((selection->>'enabled')::boolean, false) THEN
      requested_assistant_id := (selection->>'assistant_id')::uuid;
      requested_mode := coalesce((selection->>'response_mode')::public.assistant_response_mode, 'mentioned_only');

      IF NOT EXISTS (
        SELECT 1 FROM public.ai_assistants a
        WHERE a.id = requested_assistant_id
          AND a.owner_user_id = caller_id
          AND a.is_enabled = true
      ) THEN
        RAISE EXCEPTION 'Only your enabled AI assistants can be added to this group.';
      END IF;
    END IF;
  END LOOP;

  DELETE FROM public.group_assistants
  WHERE group_conversation_id = p_group_id;

  INSERT INTO public.group_assistants (
    group_conversation_id,
    assistant_id,
    response_mode,
    added_by,
    is_enabled
  )
  SELECT
    p_group_id,
    (selection->>'assistant_id')::uuid,
    coalesce((selection->>'response_mode')::public.assistant_response_mode, 'mentioned_only'),
    caller_id,
    true
  FROM jsonb_array_elements(coalesce(p_selections, '[]'::jsonb)) AS entries(selection)
  WHERE coalesce((selection->>'enabled')::boolean, false)
  ON CONFLICT (group_conversation_id, assistant_id)
  DO UPDATE SET
    response_mode = EXCLUDED.response_mode,
    added_by = EXCLUDED.added_by,
    is_enabled = true,
    updated_at = now();
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_group_settings(uuid, text, text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_group_settings(uuid, text, text, boolean, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_group_assistants(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_group_assistants(uuid, jsonb) TO authenticated;