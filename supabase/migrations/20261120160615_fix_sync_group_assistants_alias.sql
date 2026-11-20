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
  selection_item jsonb;
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

  FOR selection_item IN SELECT value FROM jsonb_array_elements(coalesce(p_selections, '[]'::jsonb))
  LOOP
    IF coalesce((selection_item->>'enabled')::boolean, false) THEN
      requested_assistant_id := (selection_item->>'assistant_id')::uuid;
      requested_mode := coalesce((selection_item->>'response_mode')::public.assistant_response_mode, 'mentioned_only');

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
    (entry_item->>'assistant_id')::uuid,
    coalesce((entry_item->>'response_mode')::public.assistant_response_mode, 'mentioned_only'),
    caller_id,
    true
  FROM jsonb_array_elements(coalesce(p_selections, '[]'::jsonb)) AS entries(entry_item)
  WHERE coalesce((entry_item->>'enabled')::boolean, false)
  ON CONFLICT (group_conversation_id, assistant_id)
  DO UPDATE SET
    response_mode = EXCLUDED.response_mode,
    added_by = EXCLUDED.added_by,
    is_enabled = true,
    updated_at = now();
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_group_assistants(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_group_assistants(uuid, jsonb) TO authenticated;