# Propuesta: arquitectura de información y modelo de datos

> `/impeccable shape` · 15 oct 2026 · Pendiente del OK de Guzmán. No se escribe código hasta entonces.

## 1. Trabajo y público

- **Quién entra:** Guzmán, Dani y Hugo. Por la mañana en el ordenador para ver qué les toca hoy; durante el día desde el móvil para apuntar horas y mirar tareas.
- **Modo:** Operate (herramienta de trabajo). Se escanea, se apunta y se sale. La marca vive en los detalles (un único naranja con significado, cifras en mono), no en la composición.
- **Éxito:** al abrir, cada uno ve en 5 segundos sus horas frente a su objetivo, qué tiene para hoy y qué se le está pasando de fecha. Apuntar horas cuesta menos de 10 segundos.

## 2. Navegación

Barra lateral fija (232 px, plegable a iconos), agrupada por áreas como en la referencia de Apollo:

```
sondia                                   [⌘K Buscar]
[ + Apuntar horas ]            ← acción principal, atajo H

MI TRABAJO
  Mi espacio                   ← pantalla de entrada
  Horas
  Tareas
  Objetivos de la semana

COMERCIAL
  Pipeline                     ← tablero desde «Respondió»
  Leads                        ← tabla de prospección (305)

LEINN
  Learning Paths
  OBVs                         ← contador naranja si hay alguna por redactar

EQUIPO
  Inicio del equipo
  Ajustes

────────────
(GV) Guzmán · tema claro/oscuro · salir
```

**Móvil (< 768 px):** barra inferior con Mi espacio · Tareas · **[+ Horas]** (botón central) · Clientes · Más (el resto). El buscador se abre desde la cabecera.

**Atajos:** ⌘K / Ctrl K buscador · H apuntar horas · T nueva tarea · G luego M/H/T/O/P/L para saltar de sección.

## 3. Pantallas

### Mi espacio (`/`)
La pantalla de entrada, filtrada por quien ha entrado. Estructura de la referencia de Zoho: indicadores arriba y listas «Mis…» debajo.

1. **Cabecera:** «Buenos días, Guzmán» (el único Instrument Serif de la app) y la fecha: «miércoles 15 de octubre · semana 42».
2. **Fila de indicadores** (sin cajas, separados por líneas):
   - Horas esta semana: `14,5 / 25 h`, con barra y ritmo esperado (en naranja si vas por detrás).
   - Tareas para hoy, más las atrasadas.
   - OBVs por redactar (naranja si alguna pasa de 3 días).
   - Próximas acciones con clientes en los próximos 7 días (naranja si alguna ha vencido).
3. **Hoy:** mis tareas que vencen hoy y las atrasadas primero. Se marcan como hechas con un clic.
4. **Mis próximas acciones con clientes:** cliente, acción, fecha y etapa. Clic → ficha.
5. **Mis objetivos de la semana:** con el estado, que se cambia aquí mismo.
6. **Mis LPs y OBVs:** entregas próximas y OBVs pendientes, con los días que quedan.
7. **Mi semana en horas:** mini barras de lunes a domingo y reparto por categoría.

En el móvil el orden es el mismo, en una columna, con «+ Apuntar horas» siempre a mano.

### Horas (`/horas`)
- **Barra de registro rápido** arriba, toda en una fila:
  - Duración: acepta `1,5`, `1h30` o `90m`.
  - Categoría: 6 botones, se recuerda la última.
  - Cliente o tarea: opcional, con autocompletado.
  - Fecha: hoy por defecto.
  - Nota, y **Enter** para guardar.
- **Cronómetro:** iniciar y parar. Sigue corriendo si cierras la pestaña o cambias de dispositivo, porque se guarda en la base de datos. Al pararlo te propone la entrada ya rellena.
- **Semana:** selector ← semana → (lunes a domingo). Bloque «Equipo» con una barra por persona frente a su objetivo.
- **Lista de entradas** agrupada por día, con total diario. Filtros por persona (por defecto «Yo»), categoría y cliente. Se edita en línea.
- **Reparto por categoría** de la semana.

### Tareas (`/tareas`)
- Conmutador **Lista / Tablero**, que se recuerda.
- **Lista** agrupada por fecha: Atrasadas, Hoy, Esta semana, Más adelante y Sin fecha. Columnas: título, responsables, prioridad, fecha límite y vínculo (cliente, LP u objetivo).
- **Tablero:** Por hacer · En curso · Hecha, arrastrando las tarjetas. «Hecha» solo muestra las de los últimos 7 días.
- **Filtros:** responsable (por defecto «Yo»), prioridad y cliente. Alta rápida en línea: escribes el título y pulsas Enter.
- **Detalle:** panel lateral con descripción, responsables, fecha, prioridad, vínculos y horas apuntadas a esa tarea.

### Objetivos de la semana (`/objetivos`)
- Navegador de semana: «Semana del 12 al 18 de octubre», con ← y →.
- Objetivos agrupados por día (Lunes… Domingo, más «Varios días» y «Sin día»). Cada uno con responsables, estado (Pendiente, En curso, Hecho, No hecho) y tareas vinculadas.
- **Arrastrar lo pendiente:** al abrir una semana nueva, un aviso dice «La semana pasada quedaron 3 objetivos sin terminar» con el botón «Pasarlos a esta semana». Se copian con la marca «viene de la semana pasada» y el original queda como «Arrastrado».
- Vista resumen: 6 de 9 hechos y avance por persona.

### Pipeline (`/clientes`)
- Tablero con las columnas **Respondió · Reunión · Maqueta enviada · Propuesta enviada · Negociación · Ganado**. Lead y Contactado no se muestran aquí (son cientos y viven en Leads). Perdido se ve con un filtro.
- Cabecera de cada columna: número de clientes y valor total (`1.470 €`).
- Tarjeta: nombre, servicio, valor, responsables y próxima acción con fecha (naranja si ha vencido).
- Cambiar de etapa arrastrando o desde la ficha. Cada cambio queda en el historial.

### Leads (`/clientes/leads`)
- Tabla densa de los 305 leads, con columnas nombre, sector, ciudad, etapa, email, web, tanda, cuenta de envío y nota.
- **Filtros guardables:** etapa, sector, provincia, tanda, «Email rebotado» y «No contactar» (ocultos por defecto).
- **Acciones masivas:** cambiar etapa, asignar responsable, marcar «No contactar».
- Botón **Importar CSV**.

### Ficha de cliente (`/clientes/[id]`)
- **Cabecera:** nombre, etapa (selector), valor, responsables, y la marca «No contactar» si la tiene.
- **Columna izquierda:**
  - Próxima acción con fecha, editable arriba del todo.
  - Datos de contacto, sector, ciudad, web y servicio.
  - Notas.
- **Columna derecha:** historial con cambios de etapa, notas, llamadas, emails, maquetas, propuestas y cobros. Arriba, un campo para añadir una nota o un evento.
- **Pestañas:** Tareas · Horas dedicadas · Cobros · OBVs vinculadas.

### Learning Paths (`/leinn/lps`)
- Tabla con: n.º, pregunta, responsable, estado (Idea, En curso, Entregada, Validada), fecha de entrega, validadores y enlace al documento.
- Orden por fecha de entrega. Las que vencen en 7 días o menos van marcadas.

### OBVs (`/leinn/obvs`)
- Arriba, si las hay: **«Por redactar»**, con días desde la reunión (`2 días · quedan 1`, o `5 días · fuera de plazo` en naranja).
- Tabla con: n.º, tipo, persona entrevistada, empresa (enlazada al cliente si existe), responsable, fecha de reunión, fecha de redacción y LP vinculada.

### Inicio del equipo (`/equipo`)
- Horas por persona esta semana frente a su objetivo: tres barras alineadas.
- Valor del pipeline por etapa: barras horizontales con euros.
- Cobrado este mes, con la comparación con el mes anterior.
- Entregas de LP y OBV de los próximos 14 días.
- Objetivos de la semana con su estado y el avance total.

### Ajustes (`/ajustes`)
Tarjetas por grupos, como la referencia de Zoho:
- **Equipo:** miembros, emails permitidos y objetivo semanal de horas de cada uno.
- **Datos:** importar CSV y exportar CSV.
- **Preferencias:** tema y vista por defecto de tareas.
- **Próximamente:** facturación, Gmail y WhatsApp, deshabilitados y con explicación.

### Buscador ⌘K
Resultados agrupados por tipo, como en Apollo: **Clientes · Tareas · LPs · OBVs · Personas**. Debajo, **Acciones** (Apuntar horas, Nueva tarea, Nuevo cliente, Ir a…). Se navega con el teclado y busca sin distinguir acentos («gurutze» encuentra «Gurutze-Berri»).

### Acceso (`/login`)
Un campo de email y «Enviar enlace». Si el email no está en la lista: «Este email no tiene acceso al ERP de SondIA». No se envía nada a emails desconocidos.

## 4. Modelo de datos

Todas las tablas llevan `id uuid`, `created_at` y `updated_at`. RLS en todas: solo pasa quien está en `members`. Las fechas de calendario son `date` y se calculan en Europe/Madrid; los instantes son `timestamptz`.

| Tabla | Campos principales |
|---|---|
| `members` | `user_id` (auth), `email` único (es la lista de emails permitidos), `name`, `short_name`, `initials`, `weekly_hours_goal` (25), `active` |
| `time_entries` | `member_id`, `date`, `minutes` (1–1440), `category`, `client_id?`, `task_id?`, `note`, `started_at?`/`ended_at?` (si viene del cronómetro) |
| `timers` | `member_id` (uno activo por persona), `started_at`, `category?`, `client_id?`, `task_id?`, `note` |
| `tasks` | `title`, `description`, `status`, `priority` (Baja, Media, Alta), `due_date?`, `client_id?`, `learning_path_id?`, `weekly_goal_id?`, `position`, `completed_at?`, `created_by` |
| `task_owners` | `task_id`, `member_id` |
| `weekly_goals` | `week_start` (siempre lunes), `title`, `days smallint[]` (1–7, vacío = sin día), `status`, `carried_from_id?`, `position` |
| `weekly_goal_owners` | `weekly_goal_id`, `member_id` |
| `clients` | `name`, `sector`, `city`, `province`, `website`, `email`, `phone`, `contact_name`, `stage`, `service`, `value_eur numeric(10,2)?`, `pricing` (Fijo, Fijo + comisión, Solo comisión), `next_action`, `next_action_date?`, `notes`, `do_not_contact` + `do_not_contact_reason`, `lost_reason`, `email_bounced`, `source` (cold email, referido…), `send_account`, `email_subject`, `batch` |
| `client_owners` | `client_id`, `member_id` |
| `client_events` | `client_id`, `member_id`, `type` (nota, cambio de etapa, email, llamada, reunión, maqueta, propuesta, cobro, importación, No contactar), `body`, `from_stage?`, `to_stage?`, `occurred_at` |
| `payments` | `client_id`, `amount_eur`, `paid_on`, `concept`, `invoice_ref?`, `member_id` |
| `learning_paths` | `number?`, `title`, `owner_id`, `status`, `due_date?`, `validators`, `doc_url`, `notes` |
| `obvs` | `number?`, `type` (Investigación, Validación, Seguimiento, Venta +, Venta −), `owner_id`, `interviewee`, `company`, `client_id?`, `learning_path_id?`, `meeting_date`, `written_date?`, `doc_url`, `notes` |

**Responsables:** tareas, objetivos y clientes admiten varios (tablas `*_owners`). Horas, LPs, OBVs y cobros tienen una sola persona.

**«Lo cobrado este mes»** sale de la tabla `payments`: la suma de `paid_on` del mes en curso. Se registra desde la ficha del cliente («Registrar cobro»). Admite pagos parciales (Alcaraván: primer pago y pago final) y deja la puerta abierta a la facturación de la v2 (`invoice_ref`).

**Leads y clientes son la misma tabla.** Un lead que responde no se «convierte»: avanza de etapa y conserva su historial. Pipeline y Leads son dos vistas de `clients`.

**Búsqueda:** una función SQL `search_all(q)` con `unaccent` y trigramas, que devuelve resultados agrupados por tipo.

## 5. Reglas de negocio (con tests)

1. **Horas por semana:** la semana va de lunes 00:00 a domingo 23:59, hora de Madrid. Se suma por la columna `date`, así que una entrada del cronómetro que cruza la medianoche cuenta en el día en que empezó. El ritmo esperado es objetivo × días laborables transcurridos ÷ 5, y el fin de semana cuenta como el 100 %. Hay tests para el cambio de hora de octubre y para entradas del domingo por la noche.
2. **OBV en 3 días:** el plazo es la fecha de la reunión + 3 días naturales. Si sigue sin redactar después de ese día, queda fuera de plazo y se avisa. Si se redacta tarde, queda marcada como «redactada fuera de plazo».
3. **No contactar:** al marcar un cliente como «No contactar» pasa a Perdido y queda bloqueado. Mientras tenga la marca, la base de datos rechaza cualquier cambio a Lead, Contactado o a una etapa activa. La regla vive en un trigger, así que la interfaz, el importador o un script no pueden saltársela. Solo se desbloquea quitando la marca a propósito: hay que confirmarlo y queda registrado en el historial.

## 6. Cómo entran los datos reales (seed)

- **Miembros:** Guzmán, Dani y Hugo, con 25 h cada uno. Los emails, en cuanto me los pases.
- **Leads (305):**
  - preparado (sin enviar) → **Lead**.
  - enviado → **Contactado**.
  - respondido → **Respondió**, o la etapa de `clientes.csv` si el lead está allí.
  - descartado se reparte en tres:
    - dijeron que no («No volver a escribir», «No insistir»): **Perdido + No contactar**.
    - negocio cerrado, vendido o dueño jubilado: **Perdido**, con el motivo.
    - email rebotado: siguen en **Contactado**, con `email_bounced` y la próxima acción «Llamar al …» que ya viene en la nota.
  - Los 6 respondidos los reviso uno a uno. Cervantes College, por ejemplo, ya tiene web nueva, así que pasa a Perdido con ese motivo.
- **Clientes (6):** se cruzan con los leads por nombre o web, sin duplicar. Gana la etapa de `clientes.csv` y «Reunión acordada» pasa a **Reunión**. «Equipo» son los tres responsables. Alcaraván entra con un cobro de 290 € del primer pago (o la cantidad que me digas, si fue un anticipo).
- **LPs:** «Por confirmar» → **Idea** y «En curso» → **En curso**. La LP de cold email queda sin número, con su nota.
- **OBVs:** «Redactada» con fecha 5 oct → reunión y redacción el 5 oct. El tipo sale de la nota: «Venta (+)» → Venta +.
- **Objetivos (9):** semana del 12 oct. «Martes y jueves» → días 2 y 4. «Todos» → los tres. «Dani y Hugo» → los dos. Los que dicen «viene de la semana pasada» quedan marcados como arrastrados.
- **Horas y tareas:** empiezan vacías. Las pantallas vacías explican qué poner y tienen el botón para hacerlo (`/impeccable onboard`).

## 7. Técnica

- Next.js (App Router, última estable) + TypeScript estricto + Tailwind, con los tokens de `DESIGN.md` como variables CSS para el tema claro y el oscuro.
- Supabase: Auth con enlace mágico y lista cerrada (se comprueba antes de enviar y RLS con `is_member()`), migraciones en `supabase/migrations/` y seed en `supabase/seed/`.
- Server Components para leer y Server Actions para escribir, con actualizaciones optimistas en lo diario (apuntar horas, marcar tareas, cambiar estados).
- `Intl` con `es-ES` y `Europe/Madrid` en un único módulo de formato (`1.234,56 €`, `7,5 h`, `lun 13 oct`).
- Iconos: Lucide. Fuentes Geist, Geist Mono, Instrument Serif y Sora servidas desde el propio proyecto.
- Tests: Vitest para las reglas de negocio y el parser de duraciones; tests SQL del trigger de «No contactar»; Playwright para las capturas a 1440 y 390 px, en claro y oscuro.
- **El esquema completo se crea en la Fase 1**, aunque las pantallas lleguen después. Así, desde el primer día las horas se pueden vincular a clientes y tareas.

## 8. Fases

1. Auth, layout con barra lateral y barra móvil, Mi espacio, Horas con cronómetro, Ajustes → Equipo, y el esquema completo.
2. Tareas (lista y tablero) y Objetivos semanales con arrastre.
3. Pipeline, Leads, ficha de cliente, cobros, importador CSV y seed.
4. LPs y OBVs, Inicio del equipo y buscador ⌘K.

## 9. Fuera de alcance y decisiones abiertas

- Fuera de la v1: facturación, nóminas, contabilidad, Gmail y WhatsApp. Quedan preparados `payments.invoice_ref`, `client_events.type = email` y el apartado «Próximamente» de Ajustes.
- **Abierto:** los emails de Dani, Hugo y Guzmán para la lista de acceso.
- **Abierto:** el importe del primer pago de Alcaraván.
- **Abierto:** el proyecto de Supabase y de Vercel, que los crea Guzmán. Hasta entonces pruebo migraciones, RLS y triggers contra un Postgres local, y la interfaz contra él.
