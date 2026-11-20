CREATE OR REPLACE FUNCTION public.create_assistant_user_message_with_context(
  p_conversation_id uuid,
  p_assistant_id uuid,
  p_body text,
  p_reply_to_message_id uuid DEFAULT NULL,
  p_attachment jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  message_id uuid;
  file_name text;
  object_path text;
  mime_type text;
  file_size bigint;
BEGIN
  IF caller_id IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION 'Authentication required and account must be active.';
  END IF;
  IF length(trim(coalesce(p_body, ''))) = 0 OR length(p_body) > 4000 THEN
    RAISE EXCEPTION 'Prompt must contain 1 to 4000 characters.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.ai_assistants a ON a.id = c.assistant_id
    JOIN public.conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = caller_id
    WHERE c.id = p_conversation_id AND c.type = 'assistant'
      AND c.assistant_id = p_assistant_id AND a.is_enabled = true
      AND (a.owner_user_id = caller_id OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Assistant conversation access denied.';
  END IF;

  IF p_reply_to_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.messages
    WHERE id = p_reply_to_message_id AND conversation_id = p_conversation_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Referenced message is unavailable in this conversation.';
  END IF;

  IF p_attachment IS NOT NULL THEN
    IF jsonb_typeof(p_attachment) <> 'object' THEN
      RAISE EXCEPTION 'Attachment metadata must be an object.';
    END IF;
    file_name := trim(coalesce(p_attachment->>'file_name', ''));
    object_path := coalesce(p_attachment->>'object_path', '');
    mime_type := coalesce(p_attachment->>'mime_type', '');
    IF coalesce(p_attachment->>'bucket_id', '') <> 'chat-attachments'
       OR file_name = '' OR length(file_name) > 255
       OR object_path = '' OR length(object_path) > 500
       OR object_path LIKE '%..%' OR left(object_path, 1) = '/'
       OR object_path NOT LIKE p_conversation_id::text || '/' || caller_id::text || '/%'
       OR mime_type NOT IN (
         'text/plain','text/markdown','text/csv','application/json',
         'application/xml','text/xml','text/html','text/css',
         'text/javascript','application/javascript','text/typescript',
         'application/sql','text/x-python','text/x-shellscript',
         'text/yaml','application/x-yaml'
       )
       OR coalesce(p_attachment->>'file_size_bytes','') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Attachment metadata is invalid or file type is not supported.';
    END IF;
    file_size := (p_attachment->>'file_size_bytes')::bigint;
    IF file_size < 1 OR file_size > 5242880 THEN
      RAISE EXCEPTION 'Attachments must be between 1 byte and 5 MB.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = 'chat-attachments' AND o.name = object_path
        AND (o.owner_id = caller_id::text OR o.owner = caller_id)
    ) THEN
      RAISE EXCEPTION 'Uploaded attachment was not found or is not owned by the current user.';
    END IF;
  END IF;

  INSERT INTO public.messages (
    conversation_id, sender_user_id, message_type, body,
    reply_to_message_id, delivery_status, metadata
  ) VALUES (
    p_conversation_id, caller_id,
    CASE WHEN p_attachment IS NULL THEN 'text'::public.message_type ELSE 'file'::public.message_type END,
    trim(p_body), p_reply_to_message_id, 'sent',
    CASE WHEN p_attachment IS NULL THEN '{}'::jsonb ELSE jsonb_build_object(
      'file_name', file_name, 'file_size_bytes', file_size, 'mime_type', mime_type
    ) END
  ) RETURNING id INTO message_id;

  IF p_attachment IS NOT NULL THEN
    INSERT INTO public.attachments (
      message_id, conversation_id, uploaded_by, bucket_id, object_path,
      file_name, mime_type, file_size_bytes
    ) VALUES (
      message_id, p_conversation_id, caller_id, 'chat-attachments',
      object_path, file_name, mime_type, file_size
    );
  END IF;

  UPDATE public.conversations
  SET last_message_id = message_id, last_message_at = now(), updated_at = now()
  WHERE id = p_conversation_id;
  RETURN message_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_assistant_user_message_with_context(uuid, uuid, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_assistant_user_message_with_context(uuid, uuid, text, uuid, jsonb) TO authenticated;
