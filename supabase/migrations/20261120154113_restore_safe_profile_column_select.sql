-- Grant only the profile columns required by authenticated app hydration.
-- Keep email and any future private columns inaccessible through the base table.
GRANT SELECT (id, full_name, avatar_path, about, title, is_online, last_seen_at, status, theme_preference, created_at, updated_at)
ON TABLE public.profiles TO authenticated;
