# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Auth con enlace mágico, Postgres, Row Level Security), desplegado en Vercel. Migraciones SQL versionadas en `supabase/migrations/`. Vitest para los tests de reglas de negocio y Playwright para las capturas (1440 px y 390 px, claro y oscuro). Confirmado por Guzmán el 15 oct 2026.

Repositorio: va a su propio repo de GitHub (`sondia-erp`), separado de la Porra Mundial. Pendiente de crear: la integración de Claude no tiene permiso para crear repos.

## Users

Tres personas, y solo ellas: Guzmán, Daniel (Dani) y Hugo, estudiantes de 2.º de LEINN en TeamLabs Madrid y socios de SondIA. Lo abren cada mañana en el ordenador para planificar el día y a lo largo del día desde el móvil para apuntar horas (en menos de 10 segundos) y mirar tareas. Son a la vez quien vende, quien desarrolla y quien rinde cuentas en LEINN con LPs y OBVs.

## Product Purpose

El ERP interno de SondIA: un único sitio para las horas que dedica cada uno, las tareas, las LPs y OBVs de LEINN, los clientes y leads, y los objetivos de cada semana. Sustituye a lo que hoy está repartido entre un tracker de leads, Gmail, WhatsApp, documentos sueltos y la presentación de objetivos semanales.

Funciona si cada uno sabe al entrar qué tiene que hacer hoy, el equipo sabe cuántas horas mete cada uno frente a su objetivo y quién lleva qué, y ningún lead, OBV o próxima acción se queda olvidado.

## Positioning

Herramienta hecha a la medida de tres socios que emprenden mientras estudian LEINN: mezcla en un mismo sitio el trabajo de empresa (pipeline, horas, clientes) con las obligaciones académicas del grado (LPs, OBVs y su regla de redacción en 3 días). Ningún CRM o gestor de tareas genérico tiene ese cruce.

## Operating Context

- Semanas de lunes a domingo; cada semana tiene objetivos con responsable, día y estado. Lo que no se termina se arrastra a la siguiente.
- Negocio actual: webs para negocios locales captados por cold email (web informativa 290 €, web completa 490 €). Los clientes grandes pagan un fijo más una comisión. Además, automatización de procesos con IA para pymes españolas.
- Pipeline: Lead → Contactado → Respondió → Maqueta enviada → Propuesta enviada → Negociación → Ganado / Perdido. Los datos reales incluyen también «Reunión acordada» (Red F7); se decide en `shape` cómo encaja.
- Categorías de horas: Ventas, Desarrollo, Clientes, LP/OBV, Gestión, Formación.
- LEINN: LP (número, pregunta, responsable, estado Idea / En curso / Entregada / Validada, fecha de entrega, validadores, enlace al documento). OBV (número, tipo Investigación / Validación / Seguimiento / Venta + / Venta −, persona y empresa, fecha de reunión, fecha de redacción).
- Responsabilidad compartida: en los datos hay objetivos de «Todos», «Dani y Hugo» y clientes del «Equipo»; se decide en `shape` cómo se modela.
- Zona horaria Europe/Madrid. Euros con formato español (1.234,56 €). Interfaz entera en castellano de España.

## Capabilities and Constraints

Versión 1:
1. Horas: registro rápido (fecha, duración, categoría, cliente o tarea opcional), cronómetro opcional, horas por persona y semana frente a objetivo configurable (25 h para cada uno al empezar).
2. Tareas: título, responsable, estado (Por hacer, En curso, Hecha), fecha límite, prioridad, vínculo opcional a cliente, LP u objetivo semanal. Vista lista y tablero.
3. LPs y OBVs, con aviso si una OBV lleva más de 3 días sin redactar.
4. Clientes y leads con pipeline, próxima acción con fecha, notas, historial e importación CSV (más de 300 leads).
5. Objetivos semanales con vista de la semana anterior y arrastre de lo pendiente.
6. Mi espacio: la pantalla de entrada, filtrada por la persona que ha entrado.
7. Inicio del equipo: horas por persona, valor del pipeline por etapa, cobrado este mes, entregas próximas de LP y OBV, objetivos de la semana.
8. Buscador global (⌘K / Ctrl K).

Reglas de negocio con tests obligatorios: suma de horas por semana (lunes a domingo, hora de Madrid), regla de los 3 días de las OBVs y que un lead marcado «No contactar» no pueda volver a Contactado.

Acceso: enlace mágico al email con lista cerrada de emails permitidos; RLS que solo deja entrar a los tres miembros. Todo es visible para los tres; cada registro tiene responsable.

Fuera de la v1 (dejar preparado): facturación, nóminas, contabilidad, integraciones con Gmail y WhatsApp.

Pendiente: los emails permitidos de Dani y Hugo; cómo se registra «lo cobrado» sin módulo de facturación (se decide en `shape`).

## Brand Commitments

Marca SondIA existente (vinculante, dada por Guzmán): fondo casi negro `#0d0d12`, naranja `#ff6a1a` como único acento, blanco roto `#fafaf7`. Geist para la interfaz, Geist Mono para cifras y etiquetas, Instrument Serif solo en algún titular puntual, Sora para el logotipo «sondia». Símbolo en `marca/sondia-simbolo.svg` y `.png`. Tema claro y oscuro bien resueltos; naranja reservado para la acción principal y lo que requiere atención. Sin degradados, glassmorfismo, emojis como iconos ni tarjetas idénticas con sombra. Densidad de herramienta de trabajo (tipo Linear o Attio), no de landing.

Referencias de estructura (no de estilo) en `referencias/`: barra lateral agrupada por áreas y buscador con resultados agrupados por tipo (Apollo), inicio personal con indicadores y tablas «Mis…» (Zoho), ajustes en tarjetas por grupos (Zoho).

## Evidence on Hand

Datos reales para el seed en `datos-iniciales/`:
- `leads-cold-email.csv`: 305 leads (volcado del 13 oct 2026). Estados: 251 enviado, 26 preparado (sin enviar), 22 descartado, 6 respondido. Varias notas dicen «No volver a escribir»: son candidatos a «No contactar».
- `clientes.csv`: 6 clientes en el pipeline actual (1 ganado: Librería Alcaraván, 290 €, primer pago cobrado).
- `lps-y-obvs.csv`: 4 LPs y 2 OBVs (los estados reales incluyen «Por confirmar» y «Redactada», que hay que mapear).
- `objetivos-semana.csv`: 9 objetivos de la semana del 12 oct 2026.

No hay histórico de horas ni de tareas: empiezan vacíos y las pantallas vacías tienen que explicar qué poner.

## Product Principles

1. Apuntar es más rápido que olvidarse: cualquier registro diario (horas, avance de tarea, próxima acción) se hace en segundos y desde el móvil.
2. Cada pantalla responde primero «¿qué me toca ahora?» y después «¿cómo va el equipo?».
3. Lo que caduca avisa: OBVs sin redactar, próximas acciones vencidas, tareas atrasadas y objetivos sin cerrar se ven sin buscarlos.
4. Las reglas del negocio y de LEINN viven en el sistema, no en la memoria de nadie.
5. Fiable antes que vistoso: es una herramienta de uso diario para tres personas, no una demo.
