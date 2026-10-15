---
name: SondIA ERP
description: La herramienta diaria de Guzmán, Dani y Hugo para horas, tareas, LPs/OBVs, clientes y objetivos.
colors:
  # Marca (vinculante)
  ink: "#0d0d12"
  ember: "#ff6a1a"
  bone: "#fafaf7"
  # Tema oscuro (por defecto)
  dark-bg: "#0d0d12"
  dark-surface: "#15151c"
  dark-surface-raised: "#1c1c25"
  dark-line: "#26262f"
  dark-line-strong: "#34343f"
  dark-text: "#ececE6"
  dark-text-muted: "#9a9aa5"
  dark-text-faint: "#6e6e79"
  dark-accent: "#ff6a1a"
  dark-accent-text: "#ff8a4c"
  dark-accent-soft: "#2a1810"
  dark-positive: "#4fbf85"
  dark-danger: "#ff6b5e"
  # Tema claro
  light-bg: "#fafaf7"
  light-surface: "#ffffff"
  light-surface-sunken: "#f2f2ed"
  light-line: "#e6e6e0"
  light-line-strong: "#d4d4cc"
  light-text: "#0d0d12"
  light-text-muted: "#5f5f69"
  light-text-faint: "#8b8b94"
  light-accent: "#ff6a1a"
  light-accent-text: "#b4470f"
  light-accent-soft: "#fff0e6"
  light-positive: "#23774a"
  light-danger: "#c4321f"
typography:
  logo:
    fontFamily: "Sora, Geist, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.02em"
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
  figure:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.1
    fontFeature: "tnum"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  full: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
components:
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.ink}"
    typography: "{typography.heading}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 12px"
  button-secondary-dark:
    backgroundColor: "{colors.dark-surface-raised}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 12px"
  button-secondary-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 12px"
  input-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 10px"
  input-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "0 10px"
  table-row:
    height: "36px"
    padding: "0 12px"
  sidebar:
    width: "232px"
  chip:
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    height: "20px"
    padding: "0 6px"
---

# Design System: SondIA ERP

> Estado: **semilla de marca** (15 oct 2026). Tokens fijados desde la identidad existente de SondIA antes de escribir código. Al cerrar la Fase 1 se revisa en modo escaneo contra lo construido y se completa `.impeccable/design.json`.

## Overview

**Creative North Star: «El cuaderno de taller»**

Una herramienta de trabajo, no un escaparate. Superficies planas casi negras (o blanco roto en claro), líneas finas que separan en lugar de cajas que encierran, cifras en Geist Mono alineadas como en un libro de cuentas y un único color que habla: el naranja de SondIA aparece donde hay que actuar o donde algo se está pasando de fecha. Si una pantalla tiene más de dos cosas naranjas, una sobra.

La densidad es la de Linear o Attio: filas de 36 px, texto base de 14 px, mucha información visible sin hacer scroll en 1440 px, y en el móvil lo justo para apuntar horas y mirar tareas con el pulgar.

**Key Characteristics:**
- Un acento, con significado: acción principal o atención requerida.
- Plano: se separa con líneas y tono de superficie, no con sombras.
- Cifras en mono tabular; etiquetas de estado en mono pequeño.
- Oscuro y claro diseñados por igual; el oscuro es el de la marca.

## Colors

Un negro tinta con un punto de violeta, un blanco hueso cálido y un naranja brasa como única voz.

- **Ink `#0d0d12`**: fondo del tema oscuro y texto principal del claro.
- **Ember `#ff6a1a`**: botón principal, foco, indicador de navegación activa, avisos (OBV sin redactar, próxima acción vencida, horas por debajo del ritmo). Como relleno lleva siempre texto Ink (6,8:1); **nunca texto blanco sobre naranja** (2,7:1).
- **Ember como texto**: en oscuro `#ff8a4c` (7,8:1 sobre surface); en claro `#b4470f` (5,2:1 sobre bone). El `#ff6a1a` puro sobre claro no llega a 3:1 y no se usa para texto.
- **Bone `#fafaf7`**: fondo del tema claro.
- **Positivo** (Hecha, Ganado, objetivo cumplido) y **Peligro** (error, Perdido, «No contactar») son funcionales, poco saturados y nunca compiten con el naranja.
- Responsables (Guzmán, Dani, Hugo) se distinguen por iniciales en un avatar neutro, no por color.

## Typography

- **Geist** para toda la interfaz. Escala corta: 18 / 14 / 13, pesos 400 y 600.
- **Geist Mono** para horas, euros, fechas en tablas, números de LP/OBV y etiquetas de estado. Siempre `tabular-nums`.
- **Instrument Serif** solo en un titular puntual por pantalla como mucho (p. ej. el saludo de Mi espacio). Nunca en tablas ni botones.
- **Sora** solo en el logotipo «sondia».
- Formato: `1.234,56 €`, `7,5 h`, fechas `lun 13 oct`. Todo en castellano de España.

## Layout

- Barra lateral fija de 232 px agrupada por áreas (Mi trabajo, Comercial, LEINN, Equipo), plegable a iconos. Contenido con ancho fluido y tablas a todo el ancho.
- Cabecera de página de 48 px: título, filtros y la acción principal a la derecha.
- Ritmo de 4 px; separación habitual de 12 y 16 px; secciones a 24–32 px.
- Móvil (< 768 px): la barra lateral pasa a barra inferior con 4 destinos y un botón central para «Apuntar horas»; las tablas se convierten en listas de dos líneas. Objetivos táctiles de 44 px como mínimo.

## Elevation & Depth

Plano. La profundidad se marca con el tono de la superficie (bg → surface → surface-raised) y líneas de 1 px. Solo los elementos flotantes (menú, ⌘K, diálogos, toasts) llevan una sombra corta y un borde.

## Shapes

Radios pequeños: 4 px en chips, 6 px en botones e inputs, 8 px en paneles y diálogos. Avatares redondos. Sin tarjetas con sombra repetidas en rejilla.

## Components

- **Botón principal**: relleno Ember, texto Ink, 32 px. Uno por vista.
- **Botón secundario**: superficie elevada con línea de 1 px; fantasma para acciones de fila.
- **Tabla**: filas de 36 px, cabecera en `label` mono, hover con superficie elevada, acciones al pasar el ratón (siempre visibles en táctil).
- **Chip de estado**: mono 11 px, fondo tenue y texto del color funcional; el naranja solo para lo que requiere atención.
- **Indicador (KPI)**: cifra en `figure` mono, etiqueta encima, comparación debajo; sin caja ni sombra, separados por líneas.
- **Barra de progreso de horas**: 4 px, línea en neutro, avance en texto principal y el tramo que falta respecto al ritmo esperado en Ember.
- **Foco**: anillo de 2 px Ember con separación de 2 px, en todos los elementos interactivos.

## Do's and Don'ts

- **Sí**: un único naranja con significado por zona; cifras alineadas a la derecha en mono; estados vacíos que digan qué poner y den el botón para hacerlo.
- **Sí**: diseñar cada pantalla en oscuro y en claro, y a 1440 px y 390 px.
- **No**: degradados, glassmorfismo, emojis como iconos, tarjetas idénticas con sombra, texto blanco sobre naranja, naranja puro como texto en tema claro.
- **No**: Instrument Serif en más de un sitio por pantalla, ni Sora fuera del logotipo.
