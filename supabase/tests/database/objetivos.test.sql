-- Arrastre de objetivos de una semana a la siguiente.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.members (id, email, name, short_name, initials)
values ('aaaaaaaa-0000-4000-8000-0000000000a1', 'obj@sondia.test', 'Obj', 'Obj', 'O');

insert into public.weekly_goals (id, week_start, title, days, status, position) values
  ('dddddddd-0000-4000-8000-000000000001', date '2030-01-07', 'Pendiente', '{1}', 'pendiente', 1),
  ('dddddddd-0000-4000-8000-000000000002', date '2030-01-07', 'En curso', '{2,4}', 'en_curso', 2),
  ('dddddddd-0000-4000-8000-000000000003', date '2030-01-07', 'Hecho', '{}', 'hecho', 3),
  ('dddddddd-0000-4000-8000-000000000004', date '2030-01-07', 'No hecho', '{}', 'no_hecho', 4);
insert into public.weekly_goal_owners (weekly_goal_id, member_id)
values ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-0000000000a1');

select is(public.carry_over_goals(date '2030-01-14'), 2, 'Arrastra solo lo pendiente y lo que estaba en curso');

select is(
  (select array_agg(title order by position) from public.weekly_goals where week_start = date '2030-01-14'),
  array['Pendiente', 'En curso'],
  'Los copia en la semana nueva, en el mismo orden'
);

select ok(
  (select bool_and(status = 'pendiente' and carried_from_id is not null)
   from public.weekly_goals where week_start = date '2030-01-14'),
  'Las copias empiezan como pendientes y recuerdan de dónde vienen'
);

select is(
  (select days from public.weekly_goals where week_start = date '2030-01-14' and title = 'En curso'),
  '{2,4}'::smallint[],
  'Conservan los días'
);

select is(
  (select count(*)::int from public.weekly_goal_owners o
   join public.weekly_goals g on g.id = o.weekly_goal_id
   where g.week_start = date '2030-01-14' and g.title = 'En curso'),
  1,
  'Conservan los responsables'
);

select is(
  (select array_agg(status::text order by position) from public.weekly_goals where week_start = date '2030-01-07'),
  array['arrastrado', 'arrastrado', 'hecho', 'no_hecho'],
  'Los originales quedan como arrastrados; lo hecho y lo no hecho no se toca'
);

select is(public.carry_over_goals(date '2030-01-14'), 0, 'Volver a arrastrar no duplica nada');

select throws_like(
  $$select public.carry_over_goals(date '2030-01-15')$$,
  'SEMANA_NO_VALIDA%',
  'Solo se arrastra a un lunes'
);

set local role anon;
select throws_like(
  $$select public.carry_over_goals(date '2030-01-21')$$,
  '%permission denied%',
  'Sin sesión no se puede arrastrar'
);
reset role;

select * from finish();
rollback;
