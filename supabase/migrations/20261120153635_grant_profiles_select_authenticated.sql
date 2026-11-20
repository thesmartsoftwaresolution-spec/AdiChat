-- Allow authenticated users to read only the profile rows permitted by RLS.
GRANT SELECT ON TABLE public.profiles TO authenticated;
