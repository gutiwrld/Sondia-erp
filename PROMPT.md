Vamos a construir el ERP interno de SondIA: la herramienta donde Dani, Hugo y yo (Guzmán) llevamos las horas que dedicamos al proyecto, las tareas, nuestras LPs y OBVs, los clientes y los objetivos de cada semana. Es una herramienta de uso diario para nosotros tres, no una demo. Tiene que ser rápida, fiable y agradable de abrir cada mañana.

## Qué es SondIA

- Somos tres estudiantes de 2º de LEINN (TeamLabs Madrid): Guzmán, Daniel (Dani) y Hugo.
- SondIA automatiza procesos de pymes españolas con IA y software a medida. Ahora mismo, además, vendemos webs a negocios locales captados por cold email (web informativa por 290 € y web completa por 490 €). Los clientes grandes pagan un fijo más una comisión.
- Hoy todo está repartido entre un tracker de leads, Gmail, WhatsApp, documentos sueltos y la presentación de objetivos semanales. No sabemos cuántas horas metemos cada uno ni quién lleva qué.

## Qué tiene que resolver

1. **Horas.** Cada uno apunta en menos de 10 segundos lo que ha dedicado: fecha, duración, categoría (Ventas, Desarrollo, Clientes, LP/OBV, Gestión, Formación) y, si aplica, el cliente o la tarea. Ver por semana cuántas horas lleva cada uno frente a su objetivo semanal (configurable por persona; ahora unas 25 h para Dani). Cronómetro opcional de inicio y parada.
2. **Tareas.** Título, responsable, estado (Por hacer, En curso, Hecha), fecha límite, prioridad, y vínculo opcional a un cliente, una LP o un objetivo de la semana. Vista lista y vista tablero.
3. **LPs y OBVs.** Las Learning Paths y las Out of the Building Visits de LEINN. LP: número, pregunta o título, responsable, estado (Idea, En curso, Entregada, Validada), fecha de entrega, validadores y enlace al documento. OBV: número, tipo (Investigación, Validación, Seguimiento, Venta + o Venta −), persona y empresa entrevistada, fecha de la reunión y fecha de redacción. Avisar si una OBV no se ha redactado en 3 días, que es la regla de LEINN.
4. **Clientes y leads.** Un pipeline con etapas: Lead, Contactado, Respondió, Maqueta enviada, Propuesta enviada, Negociación, Ganado y Perdido. Para cada uno: contacto, sector, ciudad, valor en euros, responsable, próxima acción con fecha, notas e historial. Importar desde CSV, porque ya tenemos más de 300 leads. Regla de negocio: un lead que ha dicho que no se marca como «No contactar» y no se puede volver a mover a Contactado.
5. **Objetivos semanales.** Los objetivos de cada semana (lunes a domingo) con responsable, día y estado. Que se pueda ver la semana anterior y arrastrar lo que no se terminó.
6. **Mi espacio.** Cada uno tiene su página personal: mis horas de esta semana frente a mi objetivo, mis tareas para hoy y las atrasadas, mis LPs y OBVs, mis próximas acciones con clientes y mis objetivos de la semana. Es la pantalla que se abre al entrar.
7. **Inicio del equipo.** Horas por persona esta semana, valor del pipeline por etapa, lo cobrado este mes, entregas de LP y OBV próximas y objetivos de la semana con su estado.
8. **Buscador global** (⌘K / Ctrl K) para saltar a cualquier cliente, tarea, LP o persona.

Fuera del alcance de la versión 1: facturación, nóminas, contabilidad e integraciones con Gmail o WhatsApp. Déjalo preparado para añadirlo más adelante.

## Usuarios y acceso

- Solo tres personas: Guzmán, Dani y Hugo. Acceso con enlace mágico al email, con una lista de emails permitidos y nadie más.
- Todo es visible para los tres. Cada registro tiene un responsable, y «Mi espacio» filtra por la persona que ha entrado.
- Uso en ordenador y en móvil (apuntar horas y mirar tareas desde el móvil tiene que ser cómodo).

## Técnica (propuesta, dime si ves algo mejor)

- Next.js (App Router) con TypeScript, Tailwind y Supabase (Auth, Postgres, Row Level Security). Despliegue en Vercel.
- Modelo de datos: `members`, `time_entries`, `tasks`, `learning_paths`, `obvs`, `clients`, `client_events` (historial), `weekly_goals`. Usa migraciones SQL versionadas y RLS que solo deje entrar a los tres miembros.
- Fechas y horas en zona Europe/Madrid. Moneda en euros con formato español (1.234,56 €). Toda la interfaz en castellano de España.
- Importador CSV para clientes y leads, y un script de seed con los datos de la carpeta `datos-iniciales/`.

## Material en esta carpeta

- `marca/`: el símbolo de SondIA en SVG y PNG.
- `referencias/`: tres capturas que me gustan, **solo como referencia de estructura, no de estilo**:
  - `apollo-navegacion-y-buscador.png`: barra lateral agrupada por áreas (Prospectar, Interactuar, Cerrar…) y el buscador global con resultados agrupados por tipo.
  - `zoho-inicio-personal.png`: el inicio personal con indicadores arriba («Mis tratos abiertos», «Mis leads») y tablas de «Mis tareas» y «Mis reuniones».
  - `zoho-ajustes.png`: una página de ajustes en tarjetas por grupos.
- `datos-iniciales/`: datos reales para el seed. Son `leads-cold-email.csv` (305 leads: 279 ya contactados y 26 preparados sin enviar), `clientes.csv` (pipeline actual), `lps-y-obvs.csv` y `objetivos-semana.csv` (semana del 12 de octubre). El tracker de leads es un volcado del 13 de octubre.

## Identidad visual

La marca de SondIA ya existe: fondo casi negro `#0d0d12`, naranja `#ff6a1a` como único acento, blanco roto `#fafaf7`, Geist para la interfaz, Geist Mono para cifras y etiquetas, Instrument Serif solo en algún titular puntual y Sora para el logotipo «sondia». Al ser una herramienta diaria, necesita tema claro y oscuro bien resueltos, con el naranja reservado para la acción principal y lo que requiere atención. Nada de degradados, glassmorfismo, emojis como iconos ni tarjetas idénticas con sombra en todas partes. La densidad de información tiene que ser la de una buena herramienta de trabajo (tipo Linear o Attio), no la de una landing.

## Cómo trabajar (con Impeccable)

Usa la skill **Impeccable** en todo el proceso. Si no está instalada en el proyecto, instálala con `npx impeccable install` y recarga.

1. **Contexto.** Ejecuta `/impeccable init` y usa este documento para rellenar `PRODUCT.md` (quiénes somos, para qué es, quién lo usa y en qué contexto). Pregúntame solo lo que falte. Después crea el `DESIGN.md` con los tokens de la marca de arriba.
2. **Planificar antes de programar.** Con `/impeccable shape`, propónme la arquitectura de información (navegación lateral, pantallas y qué hay en cada una) y el modelo de datos. Espera mi OK antes de construir.
3. **Construir por fases.** Con `/impeccable craft`, una fase cada vez y enseñándome capturas al acabar cada una:
   - Fase 1: auth, layout con barra lateral, Mi espacio y Horas (lo que vamos a usar desde el primer día).
   - Fase 2: Tareas y Objetivos semanales.
   - Fase 3: Clientes con pipeline, importador CSV y seed.
   - Fase 4: LPs y OBVs, Inicio del equipo y buscador ⌘K.
4. **Revisar.** Al final de cada fase, pasa `/impeccable critique` (jerarquía y claridad), `/impeccable audit` (accesibilidad, rendimiento y responsive) y `/impeccable harden` (estados vacíos, errores, textos largos y datos raros). Usa `/impeccable onboard` para el primer uso y para que las pantallas vacías expliquen qué poner, y `/impeccable adapt` para revisar el móvil. Termina con `/impeccable polish`.
5. **Comprobar.** Haz capturas con Playwright a 1440 px y a 390 px en claro y oscuro, revísalas tú mismo y corrige antes de enseñármelas. Escribe tests para las reglas de negocio: suma de horas por semana, la regla de los 3 días de las OBVs y que no se pueda reactivar un lead marcado «No contactar».

Al terminar cada fase dame un resumen corto de lo hecho, lo que queda pendiente y qué tengo que configurar yo (claves de Supabase, emails permitidos, despliegue).

Empieza por el paso 1.
