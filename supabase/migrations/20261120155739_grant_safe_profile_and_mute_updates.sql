-- Least-privilege client updates for own profile and own mute preference.
GRANT UPDATE (full_name, about, title, theme_preference, avatar_path)
ON TABLE public.profiles TO authenticated;

GRANT UPDATE (muted_until)
ON TABLE public.conversation_members TO authenticated;

-- A group admin may manage group assistant settings only for assistants they own.
DROP POLICY IF EXISTS group_assistants_group_admin_update ON public.group_assistants;
CREATE POLICY group_assistants_group_admin_update
ON public.group_assistants
FOR UPDATE TO authenticated
USING (
  public.is_group_admin(group_conversation_id)
  OR public.is_admin()
)
WITH CHECK (
  (public.is_group_admin(group_conversation_id) OR public.is_admin())
  AND EXISTS (
    SELECT 1
    FROM public.ai_assistants a
    WHERE a.id = group_assistants.assistant_id
      AND a.owner_user_id = auth.uid()
  )
);