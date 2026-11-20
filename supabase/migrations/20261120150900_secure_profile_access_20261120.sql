-- Tighten public profile directory and remove anonymous access to SECURITY DEFINER helpers.
drop view if exists public.profile_directory;
create view public.profile_directory with (security_invoker = true) as
select id, full_name, avatar_path, about, title, is_online, last_seen_at
from public.profiles
where status = 'active';
grant select on public.profile_directory to authenticated;
revoke insert, update, delete on public.profile_directory from authenticated;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_directory on public.profiles
  for select to authenticated
  using (status = 'active' or id = (select auth.uid()) or (select public.is_admin()));

revoke select on public.profiles from authenticated;
grant select (id, full_name, avatar_path, about, title, is_online, last_seen_at, status, theme_preference)
  on public.profiles to authenticated;

drop policy if exists developer_profile_public_read on public.developer_profile;
create policy developer_profile_public_read on public.developer_profile
  for select to anon using (is_visible = true);
create policy developer_profile_authenticated_read on public.developer_profile
  for select to authenticated using (is_visible = true or (select public.is_admin()));

drop policy if exists announcements_read on public.announcements;
create policy announcements_public_read on public.announcements
  for select to anon using (status = 'published');
create policy announcements_authenticated_read on public.announcements
  for select to authenticated using (status = 'published' or (select public.is_admin()));

revoke execute on all functions in schema public from anon;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
grant execute on function public.is_active_account() to authenticated;

alter function public.set_updated_at() set search_path = public;
revoke all on public.bootstrap_state from anon, authenticated;
