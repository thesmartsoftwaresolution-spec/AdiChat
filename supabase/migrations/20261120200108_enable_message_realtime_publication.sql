-- Enable live message and conversation synchronization for authenticated clients.
-- Existing table RLS policies remain responsible for row visibility.
do $$
declare
  v_publication_exists boolean;
begin
  select exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) into v_publication_exists;

  if not v_publication_exists then
    raise exception 'Expected Supabase publication supabase_realtime does not exist';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end
$$;
