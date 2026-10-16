-- Buscador global.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.members (id, email, name, short_name, initials)
values ('aaaaaaaa-0000-4000-8000-0000000000b1', 'busca@sondia.test', 'Begoña Búsqueda', 'Bego', 'B');
insert into public.clients (name, city, email) values
  ('Librería Alcaraván Test', 'Urueña', 'libros@alcaravan-test.com'),
  ('Panadería Ñandú', 'León', '');
insert into public.tasks (title) values ('Llamar a Alcaraván para el horario');

select is(
  (select count(*)::int from public.search_all('alcaravan') where kind = 'cliente' and title = 'Librería Alcaraván Test'),
  1, 'Encuentra sin acentos'
);
select is(
  (select count(*)::int from public.search_all('ALCARAVÁN') where kind = 'tarea'),
  1, 'Sin distinguir mayúsculas ni acentos, también en tareas'
);
select is(
  (select count(*)::int from public.search_all('nandu') where kind = 'cliente' and title = 'Panadería Ñandú'),
  1, 'La ñ se busca como n'
);
select is(
  (select count(*)::int from public.search_all('urueña') where kind = 'cliente' and title = 'Librería Alcaraván Test'),
  1, 'Busca también por ciudad'
);
select is(
  (select count(*)::int from public.search_all('begona') where kind = 'persona'),
  1, 'Encuentra personas'
);
select is((select count(*)::int from public.search_all('a')), 0, 'Con menos de 2 letras no busca');

set local role anon;
select throws_like($$select * from public.search_all('alcaravan')$$, '%permission denied%', 'Sin sesión no se puede buscar');
reset role;

select * from finish();
rollback;
