-- Buscador global (⌘K): clientes, tareas, LPs, OBVs y personas, sin distinguir
-- mayúsculas ni acentos. Se ejecuta con los permisos de quien llama (RLS).

create function public.f_unaccent(text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce($1, '')))
$$;

create function public.search_all(p_query text, p_limit integer default 6)
returns table (kind text, id uuid, title text, subtitle text, rank real)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select public.f_unaccent(btrim(p_query)) as term
  ),
  hits as (
    select 'cliente'::text as kind, c.id, c.name as title,
           concat_ws(' · ', nullif(c.sector, ''), nullif(c.city, '')) as subtitle,
           extensions.similarity(public.f_unaccent(c.name), q.term) as rank
    from public.clients c, q
    where public.f_unaccent(c.name || ' ' || c.email || ' ' || c.website || ' ' || c.contact_name || ' ' || c.city) like '%' || q.term || '%'
    union all
    select 'tarea', t.id, t.title,
           case t.status when 'hecha' then 'Hecha' when 'en_curso' then 'En curso' else 'Por hacer' end,
           extensions.similarity(public.f_unaccent(t.title), q.term)
    from public.tasks t, q
    where public.f_unaccent(t.title || ' ' || t.description) like '%' || q.term || '%'
    union all
    select 'lp', l.id, l.title,
           coalesce('LP ' || l.number, 'LP sin número'),
           extensions.similarity(public.f_unaccent(l.title), q.term)
    from public.learning_paths l, q
    where public.f_unaccent(l.title || ' ' || coalesce(l.number::text, '')) like '%' || q.term || '%'
    union all
    select 'obv', o.id, concat_ws(' · ', nullif(o.interviewee, ''), nullif(o.company, '')),
           coalesce('OBV ' || o.number, 'OBV') || ' · ' || to_char(o.meeting_date, 'DD/MM'),
           extensions.similarity(public.f_unaccent(o.interviewee || ' ' || o.company), q.term)
    from public.obvs o, q
    where public.f_unaccent(o.interviewee || ' ' || o.company || ' ' || o.notes) like '%' || q.term || '%'
    union all
    select 'persona', m.id, m.name, m.email,
           extensions.similarity(public.f_unaccent(m.name), q.term)
    from public.members m, q
    where m.active and public.f_unaccent(m.name || ' ' || m.short_name || ' ' || m.email) like '%' || q.term || '%'
  ),
  ranked as (
    select h.*, row_number() over (
      partition by h.kind
      order by (public.f_unaccent(h.title) like (select term from q) || '%') desc, h.rank desc, h.title
    ) as n
    from hits h
  )
  select kind, id, title, subtitle, rank from ranked
  where n <= least(greatest(p_limit, 1), 20) and length((select term from q)) >= 2
  order by kind, n
$$;

revoke execute on function public.search_all(text, integer) from anon, public;
grant execute on function public.search_all(text, integer) to authenticated;
