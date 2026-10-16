-- SOLO local: miembros de prueba con emails que no existen. En producción los
-- miembros se crean con los emails reales (ver README).
insert into public.members (id, email, name, short_name, initials, weekly_hours_goal) values
  ('00000000-0000-4000-8000-000000000001', 'guzman@sondia.test', 'Guzmán', 'Guzmán', 'G', 25),
  ('00000000-0000-4000-8000-000000000002', 'dani@sondia.test', 'Daniel', 'Dani', 'D', 25),
  ('00000000-0000-4000-8000-000000000003', 'hugo@sondia.test', 'Hugo', 'Hugo', 'H', 25);

-- Cuentas de acceso de prueba, con la contraseña local «sondia-local».
-- La contraseña real del equipo NO va en el repositorio: se pone con
-- `npm run cuentas` o desde el panel de Supabase (ver README).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select '00000000-0000-0000-0000-000000000000', m.id, 'authenticated', 'authenticated', m.email,
  extensions.crypt('sondia-local', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from public.members m;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u;
