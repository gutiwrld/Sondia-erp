-- SondIA ERP · esquema inicial
-- Todas las tablas del modelo acordado en docs/propuesta-shape.md, aunque sus
-- pantallas lleguen en fases posteriores. Fechas de calendario en `date`
-- (calculadas en Europe/Madrid por la app); instantes en `timestamptz`.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.hour_category as enum (
  'ventas', 'desarrollo', 'clientes', 'lp_obv', 'gestion', 'formacion'
);
create type public.task_status as enum ('por_hacer', 'en_curso', 'hecha');
create type public.task_priority as enum ('baja', 'media', 'alta');
create type public.goal_status as enum ('pendiente', 'en_curso', 'hecho', 'no_hecho', 'arrastrado');
create type public.client_stage as enum (
  'lead', 'contactado', 'respondio', 'reunion', 'maqueta_enviada',
  'propuesta_enviada', 'negociacion', 'ganado', 'perdido'
);
create type public.pricing_model as enum ('fijo', 'fijo_comision', 'solo_comision');
create type public.client_event_type as enum (
  'nota', 'cambio_etapa', 'email', 'llamada', 'reunion', 'maqueta',
  'propuesta', 'cobro', 'importacion', 'no_contactar'
);
create type public.lp_status as enum ('idea', 'en_curso', 'entregada', 'validada');
create type public.obv_type as enum (
  'investigacion', 'validacion', 'seguimiento', 'venta_positiva', 'venta_negativa'
);

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Miembros (y lista de emails permitidos)
-- ---------------------------------------------------------------------------

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null unique check (email = lower(btrim(email)) and email like '%@%'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  short_name text not null check (char_length(btrim(short_name)) between 1 and 30),
  initials text not null check (char_length(initials) between 1 and 3),
  weekly_hours_goal numeric(4, 1) not null default 25 check (weekly_hours_goal between 0 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();

comment on table public.members is
  'Los miembros del equipo. La columna email es la lista cerrada de emails que pueden entrar.';

-- Miembro de la sesión actual (null si no es miembro activo).
create function public.current_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.members m
  where m.user_id = (select auth.uid()) and m.active
$$;

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.user_id = (select auth.uid()) and m.active
  )
$$;

-- Solo se pueden crear usuarios de Auth para emails de la lista.
create function public.enforce_member_allowlist() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.members m
    where m.email = lower(btrim(new.email)) and m.active
  ) then
    raise exception 'EMAIL_NO_PERMITIDO' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function public.link_member_to_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.members set user_id = new.id
  where email = lower(btrim(new.email)) and user_id is null;
  return new;
end;
$$;

create trigger enforce_member_allowlist before insert on auth.users
  for each row execute function public.enforce_member_allowlist();
create trigger link_member_to_user after insert on auth.users
  for each row execute function public.link_member_to_user();

-- ---------------------------------------------------------------------------
-- Clientes y leads (misma tabla; Pipeline y Leads son vistas)
-- ---------------------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  sector text not null default '',
  city text not null default '',
  province text not null default '',
  website text not null default '',
  email text not null default '',
  phone text not null default '',
  contact_name text not null default '',
  stage public.client_stage not null default 'lead',
  service text not null default '',
  value_eur numeric(10, 2) check (value_eur is null or value_eur >= 0),
  pricing public.pricing_model,
  next_action text not null default '',
  next_action_date date,
  notes text not null default '',
  do_not_contact boolean not null default false,
  do_not_contact_reason text not null default '',
  do_not_contact_at timestamptz,
  lost_reason text not null default '',
  email_bounced boolean not null default false,
  source text not null default '',
  send_account text not null default '',
  email_subject text not null default '',
  batch text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create index clients_stage_idx on public.clients (stage);
create index clients_next_action_date_idx on public.clients (next_action_date) where next_action_date is not null;
create index clients_name_trgm_idx on public.clients using gin (name extensions.gin_trgm_ops);

create table public.client_owners (
  client_id uuid not null references public.clients (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (client_id, member_id)
);
create index client_owners_member_idx on public.client_owners (member_id);

create table public.client_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  type public.client_event_type not null,
  body text not null default '',
  from_stage public.client_stage,
  to_stage public.client_stage,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index client_events_client_idx on public.client_events (client_id, occurred_at desc);

-- Regla «No contactar»:
--  * Al marcarlo, el cliente pasa a Perdido.
--  * Mientras esté marcado, solo puede estar en Perdido.
--  * Quitar la marca es un paso aparte: no se puede cambiar de etapa en la misma operación.
create function public.enforce_client_rules() returns trigger
language plpgsql as $$
begin
  if new.do_not_contact then
    if tg_op = 'INSERT' or not old.do_not_contact then
      new.stage := 'perdido';
      new.do_not_contact_at := coalesce(new.do_not_contact_at, now());
    elsif new.stage <> 'perdido' then
      raise exception 'NO_CONTACTAR: % está marcado como «No contactar» y no puede volver a %',
        new.name, new.stage
        using errcode = 'P0001',
              hint = 'Quita antes la marca «No contactar» si de verdad hay que reactivarlo.';
    end if;
  elsif tg_op = 'UPDATE' and old.do_not_contact then
    if new.stage <> old.stage then
      raise exception 'NO_CONTACTAR: quita la marca y cambia la etapa en dos pasos'
        using errcode = 'P0001';
    end if;
    new.do_not_contact_at := null;
  end if;
  return new;
end;
$$;

create trigger clients_enforce_rules before insert or update on public.clients
  for each row execute function public.enforce_client_rules();

-- Historial automático de cambios de etapa y de la marca «No contactar».
create function public.log_client_changes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.client_events (client_id, member_id, type, from_stage, to_stage)
    values (new.id, public.current_member_id(), 'cambio_etapa', old.stage, new.stage);
  end if;
  if new.do_not_contact is distinct from old.do_not_contact then
    insert into public.client_events (client_id, member_id, type, body)
    values (
      new.id, public.current_member_id(), 'no_contactar',
      case when new.do_not_contact
        then 'Marcado como «No contactar»' || coalesce(nullif(': ' || new.do_not_contact_reason, ': '), '')
        else 'Quitada la marca «No contactar»' end
    );
  end if;
  return new;
end;
$$;

create trigger clients_log_changes after update on public.clients
  for each row execute function public.log_client_changes();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  member_id uuid references public.members (id) on delete set null,
  amount_eur numeric(10, 2) not null check (amount_eur > 0),
  paid_on date not null,
  concept text not null default '',
  invoice_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create index payments_paid_on_idx on public.payments (paid_on);
create index payments_client_idx on public.payments (client_id);

-- ---------------------------------------------------------------------------
-- LEINN: Learning Paths y OBVs
-- ---------------------------------------------------------------------------

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  number integer check (number is null or number > 0),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  owner_id uuid not null references public.members (id) on delete restrict,
  status public.lp_status not null default 'idea',
  due_date date,
  validators text not null default '',
  doc_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger learning_paths_updated_at before update on public.learning_paths
  for each row execute function public.set_updated_at();
create index learning_paths_owner_idx on public.learning_paths (owner_id);

create table public.obvs (
  id uuid primary key default gen_random_uuid(),
  number integer check (number is null or number > 0),
  type public.obv_type not null,
  owner_id uuid not null references public.members (id) on delete restrict,
  interviewee text not null default '',
  company text not null default '',
  client_id uuid references public.clients (id) on delete set null,
  learning_path_id uuid references public.learning_paths (id) on delete set null,
  meeting_date date not null,
  written_date date,
  doc_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obvs_written_after_meeting check (written_date is null or written_date >= meeting_date)
);
create trigger obvs_updated_at before update on public.obvs
  for each row execute function public.set_updated_at();
create index obvs_owner_idx on public.obvs (owner_id);
create index obvs_pending_idx on public.obvs (meeting_date) where written_date is null;

-- ---------------------------------------------------------------------------
-- Objetivos semanales
-- ---------------------------------------------------------------------------

create table public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  week_start date not null check (extract(isodow from week_start) = 1),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  days smallint[] not null default '{}' check (days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  status public.goal_status not null default 'pendiente',
  carried_from_id uuid references public.weekly_goals (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger weekly_goals_updated_at before update on public.weekly_goals
  for each row execute function public.set_updated_at();
create index weekly_goals_week_idx on public.weekly_goals (week_start, position);

create table public.weekly_goal_owners (
  weekly_goal_id uuid not null references public.weekly_goals (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (weekly_goal_id, member_id)
);
create index weekly_goal_owners_member_idx on public.weekly_goal_owners (member_id);

-- ---------------------------------------------------------------------------
-- Tareas
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  description text not null default '',
  status public.task_status not null default 'por_hacer',
  priority public.task_priority not null default 'media',
  due_date date,
  client_id uuid references public.clients (id) on delete set null,
  learning_path_id uuid references public.learning_paths (id) on delete set null,
  weekly_goal_id uuid references public.weekly_goals (id) on delete set null,
  position integer not null default 0,
  completed_at timestamptz,
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create index tasks_status_due_idx on public.tasks (status, due_date);

create function public.set_task_completed_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'hecha' and (tg_op = 'INSERT' or old.status <> 'hecha') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'hecha' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;
create trigger tasks_completed_at before insert or update on public.tasks
  for each row execute function public.set_task_completed_at();

create table public.task_owners (
  task_id uuid not null references public.tasks (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (task_id, member_id)
);
create index task_owners_member_idx on public.task_owners (member_id);

-- ---------------------------------------------------------------------------
-- Horas y cronómetro
-- ---------------------------------------------------------------------------

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  date date not null,
  minutes integer not null check (minutes between 1 and 1440),
  category public.hour_category not null,
  client_id uuid references public.clients (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  note text not null default '' check (char_length(note) <= 500),
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_entries_range check (started_at is null or ended_at is null or ended_at > started_at)
);
create trigger time_entries_updated_at before update on public.time_entries
  for each row execute function public.set_updated_at();
create index time_entries_member_date_idx on public.time_entries (member_id, date);
create index time_entries_date_idx on public.time_entries (date);

-- Un cronómetro activo por persona; se guarda en la base de datos para que
-- siga corriendo al cerrar la pestaña o cambiar de dispositivo.
create table public.timers (
  member_id uuid primary key references public.members (id) on delete cascade,
  started_at timestamptz not null default now(),
  category public.hour_category,
  client_id uuid references public.clients (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: solo entran los miembros activos. Todo es visible para
-- los tres; cada registro tiene responsable.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'members', 'clients', 'client_owners', 'client_events', 'payments',
    'learning_paths', 'obvs', 'weekly_goals', 'weekly_goal_owners',
    'tasks', 'task_owners', 'time_entries', 'timers'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "solo miembros" on public.%I for all to authenticated
         using ((select public.is_member())) with check ((select public.is_member()))',
      t
    );
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

revoke execute on function public.current_member_id() from anon, public;
revoke execute on function public.is_member() from anon, public;
grant execute on function public.current_member_id() to authenticated;
grant execute on function public.is_member() to authenticated;
