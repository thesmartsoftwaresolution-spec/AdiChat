-- Ensure privileged helpers require an active account.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT CASE
    WHEN public.is_active_account() THEN coalesce(
      (
        SELECT role
        FROM public.user_roles
        WHERE user_id = auth.uid()
        ORDER BY CASE role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          ELSE 3
        END
        LIMIT 1
      ),
      'user'::public.app_role
    )
    ELSE 'user'::public.app_role
  END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT public.is_active_account() AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT public.is_active_account() AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT public.is_active_account() AND EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = conv_id
      AND user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_group_admin(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT public.is_active_account() AND EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = conv_id
      AND user_id = auth.uid()
      AND member_role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.add_group_members(group_id uuid, member_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  target_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION 'Authentication required and account must be active.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = group_id AND type = 'group'
  ) THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  IF NOT public.is_group_admin(group_id) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: only group admins can add members.';
  END IF;

  FOREACH target_id IN ARRAY coalesce(member_ids, '{}'::uuid[]) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = target_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'All added members must have active accounts.';
    END IF;

    INSERT INTO public.conversation_members (conversation_id, user_id, member_role)
    VALUES (group_id, target_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_group_member(group_id uuid, target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  target_role public.group_member_role;
  other_admins integer;
  other_members integer;
BEGIN
  IF caller_id IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION 'Authentication required and account must be active.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = group_id AND type = 'group'
  ) THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  IF caller_id <> target_user_id
     AND NOT public.is_group_admin(group_id)
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: group admin access required.';
  END IF;

  SELECT member_role INTO target_role
  FROM public.conversation_members
  WHERE conversation_id = group_id
    AND user_id = target_user_id;

  IF target_role = 'admin' THEN
    SELECT count(*) INTO other_admins
    FROM public.conversation_members
    WHERE conversation_id = group_id
      AND member_role = 'admin'
      AND user_id <> target_user_id;

    SELECT count(*) INTO other_members
    FROM public.conversation_members
    WHERE conversation_id = group_id
      AND user_id <> target_user_id;

    IF other_admins = 0 AND other_members > 0 THEN
      RAISE EXCEPTION 'Promote another group admin before leaving or removing the last admin.';
    END IF;
  END IF;

  DELETE FROM public.conversation_members
  WHERE conversation_id = group_id
    AND user_id = target_user_id;
END;
$function$;

-- Harden the remaining SECURITY DEFINER functions against search_path shadowing.
ALTER FUNCTION public.add_group_members(uuid, uuid[]) SET search_path = pg_catalog, public;
ALTER FUNCTION public.admin_resolve_report(uuid, public.report_status, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.admin_update_app_settings(text, jsonb) SET search_path = pg_catalog, public;
ALTER FUNCTION public.admin_update_user_status(uuid, public.user_status, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.can_request_assistant_reply() SET search_path = pg_catalog, public;
ALTER FUNCTION public.create_assistant_user_message(uuid, uuid, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.create_group(text, text, uuid[]) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_or_create_assistant_conversation(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_active_account() SET search_path = pg_catalog, public;
ALTER FUNCTION public.record_assistant_response(uuid, uuid, text, text, integer, integer, integer, text, boolean) SET search_path = pg_catalog, public;

-- The app now uses create_group_with_settings; disable the legacy less-validated RPC.
REVOKE EXECUTE ON FUNCTION public.create_group(text, text, uuid[]) FROM PUBLIC, anon, authenticated;