-- SOLO local: datos de demostración para que las pantallas no salgan vacías.
-- Fechas de próxima acción, tareas y horas inventadas sobre los clientes reales.

update public.clients set next_action_date = current_date where name = 'Librería Alcaraván';
update public.clients set next_action_date = current_date - 1 where name = 'Hotel Restaurante Gurutze-Berri';
update public.clients set next_action_date = current_date + 1 where name = 'Embutidos Pimar';
update public.clients set next_action_date = current_date + 2 where name = 'La Gallareta / Distribución Mena de la Fuente';
update public.clients set next_action_date = current_date + 3 where name = 'Mesón Asador Valderrey';
update public.clients set next_action_date = current_date + 5 where name = 'Red F7';
update public.clients set next_action_date = current_date + 1 where name = 'Cervantes College';

-- Tareas de demostración (sacadas de las próximas acciones reales)
with t (title, status, priority, due, client, owners) as (values
  ('Llamar a Embutidos Pimar para cerrar la propuesta', 'por_hacer', 'alta', current_date, (select id from public.clients where name = 'Embutidos Pimar'), 'G'),
  ('Pedir a Carlos Deza el enlace de su carta en Gourmeats', 'por_hacer', 'media', current_date, (select id from public.clients where name = 'Mesón Asador Valderrey'), 'G'),
  ('Seguimiento de la propuesta a Gurutze-Berri', 'en_curso', 'alta', current_date - 1, (select id from public.clients where name = 'Hotel Restaurante Gurutze-Berri'), 'G'),
  ('Preparar la reunión con Red F7', 'por_hacer', 'media', current_date + 4, (select id from public.clients where name = 'Red F7'), 'GDH'),
  ('Montar la web de Sondia en dominio propio', 'en_curso', 'media', current_date + 1, null, 'DH')
), ins as (
  insert into public.tasks (title, status, priority, due_date, client_id)
  select title, status::public.task_status, priority::public.task_priority, due, client from t
  returning id, title
)
insert into public.task_owners (task_id, member_id)
select ins.id, m.id from ins join t on t.title = ins.title
join public.members m on position(m.initials in t.owners) > 0;

-- Horas de demostración de la semana actual (lunes = inicio de semana)
with wk as (select (current_date - (extract(isodow from current_date)::int - 1)) as monday),
e (member, day_offset, minutes, category, note) as (values
  ('G', 0, 150, 'ventas', 'Tanda 7 de cold email'),
  ('G', 0, 90, 'clientes', 'Maqueta de Valderrey'),
  ('G', 1, 120, 'clientes', 'Propuesta de Gurutze-Berri'),
  ('G', 1, 60, 'gestion', 'Objetivos de la semana'),
  ('G', 2, 180, 'desarrollo', 'Web de Alcaraván'),
  ('G', 2, 45, 'lp_obv', 'LP de cold email'),
  ('G', 3, 75, 'ventas', 'Seguimiento de propuestas'),
  ('D', 0, 240, 'desarrollo', 'Web de Sondia'),
  ('D', 1, 210, 'desarrollo', 'Web de Sondia'),
  ('D', 2, 120, 'formacion', 'Next.js y Supabase'),
  ('D', 3, 180, 'desarrollo', 'Web de Sondia'),
  ('H', 0, 120, 'ventas', 'Búsqueda de leads'),
  ('H', 1, 90, 'desarrollo', 'Web de Sondia'),
  ('H', 2, 60, 'gestion', 'Dominios')
)
insert into public.time_entries (member_id, date, minutes, category, note, created_by)
select m.id, wk.monday + e.day_offset, e.minutes, e.category::public.hour_category, e.note, m.id
from e cross join wk join public.members m on m.initials = e.member
where wk.monday + e.day_offset <= current_date;
