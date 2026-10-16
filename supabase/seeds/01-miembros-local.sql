-- SOLO local: miembros de prueba con emails que no existen. En producción los
-- miembros se crean con los emails reales (ver README).
insert into public.members (id, email, name, short_name, initials, weekly_hours_goal) values
  ('00000000-0000-4000-8000-000000000001', 'guzman@sondia.test', 'Guzmán', 'Guzmán', 'G', 25),
  ('00000000-0000-4000-8000-000000000002', 'dani@sondia.test', 'Daniel', 'Dani', 'D', 25),
  ('00000000-0000-4000-8000-000000000003', 'hugo@sondia.test', 'Hugo', 'Hugo', 'H', 25);
