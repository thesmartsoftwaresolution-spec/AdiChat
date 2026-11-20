REVOKE SELECT ON TABLE public.profiles FROM authenticated;
GRANT SELECT (created_at, updated_at) ON TABLE public.profiles TO authenticated;