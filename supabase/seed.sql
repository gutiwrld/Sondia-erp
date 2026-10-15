-- Seed SOLO para desarrollo local (`supabase db reset`). No se ejecuta en producción.
-- Miembros con emails de prueba, los datos reales pequeños de datos-iniciales/
-- (objetivos, clientes, LPs y OBVs) y unas horas y tareas de demostración para
-- que las pantallas no salgan vacías. El seed real con los 305 leads llega en la Fase 3.

insert into public.members (id, email, name, short_name, initials, weekly_hours_goal) values
  ('00000000-0000-4000-8000-000000000001', 'guzman@sondia.test', 'Guzmán', 'Guzmán', 'G', 25),
  ('00000000-0000-4000-8000-000000000002', 'dani@sondia.test', 'Daniel', 'Dani', 'D', 25),
  ('00000000-0000-4000-8000-000000000003', 'hugo@sondia.test', 'Hugo', 'Hugo', 'H', 25);

-- Clientes (datos-iniciales/clientes.csv)
insert into public.clients (id, name, sector, city, contact_name, stage, service, value_eur, pricing, next_action, next_action_date, notes, source) values
  ('10000000-0000-4000-8000-000000000001', 'Librería Alcaraván', 'Librería', 'Urueña (Valladolid)', 'Jesús Martínez', 'ganado', 'Web informativa de una página', 290, 'fijo', 'Confirmar horario y dominio y publicar la web', current_date, 'Primer pago cobrado. Dos versiones de web enviadas para elegir.', 'cold_email'),
  ('10000000-0000-4000-8000-000000000002', 'Hotel Restaurante Gurutze-Berri', 'Hotel y restaurante', 'Gipuzkoa', 'Xabier y Gorka Zapirain', 'propuesta_enviada', 'Web completa', 490, 'fijo', 'Seguimiento de la propuesta', current_date - 1, 'Maqueta y propuesta enviadas el 8 oct.', 'cold_email'),
  ('10000000-0000-4000-8000-000000000003', 'Embutidos Pimar', 'Obrador de embutidos', 'Valencia', '', 'propuesta_enviada', 'Web completa', 490, 'fijo', 'Llamada para cerrar', current_date + 1, 'Maqueta y propuesta enviadas el 9 oct.', 'cold_email'),
  ('10000000-0000-4000-8000-000000000004', 'La Gallareta / Distribución Mena de la Fuente', 'Legumbres y gourmet', 'El Barco de Ávila', 'José Manuel Mena', 'negociacion', 'Webs + ventas online (fijo + comisión)', null, 'fijo_comision', 'Propuesta escrita del piloto de Navidad', current_date + 2, 'Reunión el 5 oct. Quiere solo comisión: pendiente de negociar.', 'cold_email'),
  ('10000000-0000-4000-8000-000000000005', 'Mesón Asador Valderrey', 'Restaurante', 'Tordesillas', 'Carlos Deza', 'maqueta_enviada', 'Web completa', 490, 'fijo', 'Pedir el enlace de su carta', current_date + 3, 'Maqueta hecha el 7 oct.', 'cold_email'),
  ('10000000-0000-4000-8000-000000000006', 'Red F7', 'Ligas de fútbol 7', 'Madrid', 'Israel', 'reunion', 'Automatización de procesos', null, null, 'Preparar reunión', current_date + 5, 'Unos 420 equipos y procesos manuales por email y WhatsApp.', 'referido');

insert into public.client_owners (client_id, member_id)
select c.id, '00000000-0000-4000-8000-000000000001' from public.clients c where c.name <> 'Red F7'
union all
select c.id, m.id from public.clients c cross join public.members m where c.name = 'Red F7';

-- Un lead que dijo que no, para probar la regla «No contactar».
insert into public.clients (name, sector, city, province, stage, do_not_contact, do_not_contact_reason, notes, source) values
  ('Ibermonesterio', 'Embutidos', 'Monesterio', 'Badajoz', 'contactado', true, 'Contestaron «no»', 'Contestaron "no". No volver a escribir.', 'cold_email');

-- Sin cobros de ejemplo: el importe real del primer pago de Alcaraván está pendiente de confirmar.

-- LPs y OBVs (datos-iniciales/lps-y-obvs.csv)
insert into public.learning_paths (number, title, owner_id, status, due_date, notes) values
  (9, '¿Cómo llevar a cabo un prototipo que permita probar el producto y crear comunidad? (Zafira)', '00000000-0000-4000-8000-000000000001', 'idea', null, ''),
  (10, '¿Cómo aplicar el marco de Bill Aulet a Aliva?', '00000000-0000-4000-8000-000000000001', 'idea', null, ''),
  (12, '¿Cómo prototipar una web-app de simulacro y comunidad? (Zafira)', '00000000-0000-4000-8000-000000000001', 'idea', null, 'Entrega prevista: mayo de 2026'),
  (null, '¿Cómo construir un sistema de captación por cold email que convierta y sea legal?', '00000000-0000-4000-8000-000000000001', 'en_curso', date '2026-11-06', 'Falta el número y los resultados del experimento');

insert into public.obvs (type, owner_id, interviewee, company, client_id, meeting_date, written_date) values
  ('venta_positiva', '00000000-0000-4000-8000-000000000001', 'Jesús Martínez', 'Librería Alcaraván', '10000000-0000-4000-8000-000000000001', date '2026-10-05', date '2026-10-05'),
  ('validacion', '00000000-0000-4000-8000-000000000001', 'José Manuel Mena', 'La Gallareta', '10000000-0000-4000-8000-000000000004', date '2026-10-05', date '2026-10-05');

-- Objetivos de la semana del 12 oct (datos-iniciales/objetivos-semana.csv)
with g (pos, title, days, owners, carried) as (values
  (1, 'Plan de acción Community Points', '{1}'::smallint[], 'GDH', true),
  (2, 'Dominios y Claude Teams', '{1}', 'G', true),
  (3, 'Confirmar con Jesús el horario y el acceso al dominio alcaravan.com', '{1}', 'G', false),
  (4, 'Publicar la web de Librería Alcaraván y cobrar el pago final', '{3}', 'G', false),
  (5, 'Caso de éxito de Alcaraván: antes y después y la opinión de Jesús', '{4}', 'G', false),
  (6, 'Web de Sondia en dominio propio, con el primer caso publicado', '{5}', 'DH', false),
  (7, '500 contactos nuevos de lunes a viernes', '{5}', 'GDH', false),
  (8, 'Cerrar un cliente nuevo', '{5}', 'GDH', false),
  (9, 'Seguimiento de propuestas abiertas (Gurutze-Berri, Valderrey, La Gallareta, Red F7)', '{2,4}', 'G', false)
), ins as (
  insert into public.weekly_goals (week_start, title, days, position)
  select date '2026-10-12', title, days, pos from g order by pos
  returning id, position
)
insert into public.weekly_goal_owners (weekly_goal_id, member_id)
select ins.id, m.id
from ins join g on g.pos = ins.position
join public.members m on position(m.initials in g.owners) > 0;

-- Tareas de demostración (sacadas de las próximas acciones reales)
with t (title, status, priority, due, client, owners) as (values
  ('Llamar a Embutidos Pimar para cerrar la propuesta', 'por_hacer', 'alta', current_date, '10000000-0000-4000-8000-000000000003', 'G'),
  ('Pedir a Carlos Deza el enlace de su carta en Gourmeats', 'por_hacer', 'media', current_date, '10000000-0000-4000-8000-000000000005', 'G'),
  ('Seguimiento de la propuesta a Gurutze-Berri', 'en_curso', 'alta', current_date - 1, '10000000-0000-4000-8000-000000000002', 'G'),
  ('Preparar la reunión con Red F7', 'por_hacer', 'media', current_date + 4, '10000000-0000-4000-8000-000000000006', 'GDH'),
  ('Montar la web de Sondia en dominio propio', 'en_curso', 'media', current_date + 1, null, 'DH')
), ins as (
  insert into public.tasks (title, status, priority, due_date, client_id)
  select title, status::public.task_status, priority::public.task_priority, due, client::uuid from t
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
