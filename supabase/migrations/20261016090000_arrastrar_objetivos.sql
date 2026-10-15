-- Arrastrar a una semana los objetivos que quedaron sin terminar en la anterior.
--  * Copia los objetivos «Pendiente» y «En curso» de la semana anterior, con sus
--    días y responsables, como «Pendiente» y marcados como arrastrados.
--  * El original queda en «Arrastrado» para que la semana pasada cuente bien.
--  * Es idempotente: un objetivo ya arrastrado no se vuelve a copiar.
-- Se ejecuta con los permisos de quien llama, así que la RLS sigue aplicando.
create function public.carry_over_goals(p_to_week date) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_from_week date := p_to_week - 7;
  v_count integer := 0;
  v_next_position integer;
  r record;
  v_new_id uuid;
begin
  if extract(isodow from p_to_week) <> 1 then
    raise exception 'SEMANA_NO_VALIDA: % no es lunes', p_to_week using errcode = 'P0001';
  end if;

  select coalesce(max(position), 0) into v_next_position
  from public.weekly_goals where week_start = p_to_week;

  for r in
    select g.* from public.weekly_goals g
    where g.week_start = v_from_week
      and g.status in ('pendiente', 'en_curso')
      and not exists (select 1 from public.weekly_goals c where c.carried_from_id = g.id)
    order by g.position, g.created_at
  loop
    v_next_position := v_next_position + 1;
    insert into public.weekly_goals (week_start, title, days, status, carried_from_id, position)
    values (p_to_week, r.title, r.days, 'pendiente', r.id, v_next_position)
    returning id into v_new_id;

    insert into public.weekly_goal_owners (weekly_goal_id, member_id)
    select v_new_id, o.member_id from public.weekly_goal_owners o where o.weekly_goal_id = r.id;

    update public.weekly_goals set status = 'arrastrado' where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.carry_over_goals(date) from anon, public;
grant execute on function public.carry_over_goals(date) to authenticated;
