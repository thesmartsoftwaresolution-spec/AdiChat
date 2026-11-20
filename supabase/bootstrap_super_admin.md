# Super Admin One-Time Bootstrap Procedure (Adeel Bhatti)

1. **Create & Verify Standard Account**
   - Adeel Bhatti registers via the public `/sign-up` flow and verifies email confirmation in Supabase Auth.
   - Do NOT rely on display name alone. Record the exact `auth.users.id` UUID and verified email from Supabase Auth Dashboard.

2. **Execute One-Time Operator SQL (Supabase SQL Editor / Trusted Server Migration)**
   ```sql
   DO $$
   DECLARE
     target_uid uuid := 'REPLACE_WITH_CONFIRMED_ADEEL_UUID';
     target_email text := 'adeel@adichat.internal';
     already_consumed boolean;
   BEGIN
     SELECT consumed INTO already_consumed FROM public.bootstrap_state WHERE id = 1;
     IF COALESCE(already_consumed, false) THEN
       RAISE EXCEPTION 'Super Admin bootstrap already consumed and disabled.';
     END IF;

     IF NOT EXISTS (
       SELECT 1 FROM auth.users WHERE id = target_uid AND lower(email) = lower(target_email) AND email_confirmed_at IS NOT NULL
     ) THEN
       RAISE EXCEPTION 'Target verified Auth user not found.';
     END IF;

     INSERT INTO public.user_roles (user_id, role, granted_by)
     VALUES (target_uid, 'super_admin', target_uid)
     ON CONFLICT (user_id, role) DO NOTHING;

     INSERT INTO public.audit_logs (actor_user_id, action, target_type, target_id, details)
     VALUES (target_uid, 'bootstrap_super_admin', 'user', target_uid::text, jsonb_build_object('verified_email', target_email));

     INSERT INTO public.bootstrap_state (id, consumed, consumed_at, consumed_by_user_id)
     VALUES (1, true, now(), target_uid)
     ON CONFLICT (id) DO UPDATE SET consumed = true, consumed_at = now(), consumed_by_user_id = target_uid;
   END $$;
   ```

3. **Verify Enforcement**
   - Confirm Adeel Bhatti can access `/admin`.
   - Confirm any ordinary `user` account receives `403` / permission denial on `/admin/*` and cannot write `public.user_roles`.
