-- Reglas de negocio y seguridad que viven en la base de datos.
-- Se ejecuta con `npm run test:db` (supabase test db) contra el Postgres local.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Datos propios del test (no dependen del seed).
insert into public.members (id, email, name, short_name, initials)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'test@sondia.test', 'Test', 'Test', 'T');

insert into public.clients (id, name, stage)
values ('bbbbbbbb-0000-4000-8000-000000000001', 'Cliente de prueba', 'contactado');

-- --- Regla «No contactar» -----------------------------------------------

update public.clients
set do_not_contact = true, do_not_contact_reason = 'Dijo que no'
where id = 'bbbbbbbb-0000-4000-8000-000000000001';

select is(
  (select stage::text from public.clients where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'perdido',
  'Al marcar «No contactar» el cliente pasa a Perdido'
);

select throws_like(
  $$update public.clients set stage = 'contactado' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  'NO_CONTACTAR%',
  'Un cliente «No contactar» no puede volver a Contactado'
);

select throws_like(
  $$update public.clients set stage = 'lead' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  'NO_CONTACTAR%',
  'Ni a Lead'
);

select throws_like(
  $$update public.clients set stage = 'respondio' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  'NO_CONTACTAR%',
  'Ni a ninguna etapa activa'
);

select throws_like(
  $$update public.clients set do_not_contact = false, stage = 'contactado'
    where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  'NO_CONTACTAR%',
  'Quitar la marca y reactivar en la misma operación está prohibido'
);

select lives_ok(
  $$update public.clients set notes = 'Nota nueva' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  'Se pueden editar otros campos de un cliente «No contactar»'
);

select is(
  (select stage::text from public.clients where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'perdido',
  'Sigue en Perdido'
);

update public.clients set do_not_contact = false where id = 'bbbbbbbb-0000-4000-8000-000000000001';
select lives_ok(
  $$update public.clients set stage = 'contactado' where id = 'bbbbbbbb-0000-4000-8000-000000000001'$$,
  'Tras quitar la marca a propósito, sí se puede reactivar'
);

insert into public.clients (id, name, stage, do_not_contact)
values ('bbbbbbbb-0000-4000-8000-000000000002', 'Creado bloqueado', 'contactado', true);
select is(
  (select stage::text from public.clients where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  'perdido',
  'Un cliente creado con «No contactar» nace en Perdido'
);

-- --- Historial automático ----------------------------------------------

select ok(
  (select count(*) from public.client_events
   where client_id = 'bbbbbbbb-0000-4000-8000-000000000001' and type = 'cambio_etapa') >= 2,
  'Los cambios de etapa quedan en el historial'
);

select is(
  (select count(*)::int from public.client_events
   where client_id = 'bbbbbbbb-0000-4000-8000-000000000001' and type = 'no_contactar'),
  2,
  'Marcar y desmarcar «No contactar» quedan en el historial'
);

-- --- Lista de emails permitidos ----------------------------------------

select throws_like(
  $$insert into auth.users (id, email, aud, role)
    values (gen_random_uuid(), 'intruso@example.com', 'authenticated', 'authenticated')$$,
  'EMAIL_NO_PERMITIDO%',
  'Auth no crea usuarios para emails fuera de la lista'
);

insert into auth.users (id, email, aud, role)
values ('cccccccc-0000-4000-8000-000000000001', 'test@sondia.test', 'authenticated', 'authenticated');
select is(
  (select user_id from public.members where email = 'test@sondia.test'),
  'cccccccc-0000-4000-8000-000000000001'::uuid,
  'El primer acceso vincula el usuario de Auth con su miembro'
);

-- --- RLS ---------------------------------------------------------------

set local role anon;
select throws_like(
  $$select count(*) from public.clients$$,
  '%permission denied%',
  'Sin sesión no se puede leer nada'
);
reset role;

-- Usuario autenticado que no es miembro (p. ej. creado antes de quitarlo de la lista).
update public.members set active = false where email = 'test@sondia.test';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.clients),
  0,
  'Un usuario que no es miembro activo no ve ningún dato'
);
reset role;

update public.members set active = true where email = 'test@sondia.test';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-4000-8000-000000000001","role":"authenticated"}', true);
select ok(
  (select count(*) from public.clients) >= 2,
  'Un miembro activo ve los datos del equipo'
);
reset role;

select * from finish();
rollback;
