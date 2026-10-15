# SondIA ERP

Herramienta interna de SondIA (Guzmán, Dani y Hugo): horas, tareas, LPs y OBVs, clientes y leads, y objetivos semanales.

- `PRODUCT.md`: contexto de producto. `DESIGN.md`: sistema de diseño. `docs/propuesta-shape.md`: arquitectura y modelo de datos.
- `datos-iniciales/`, `marca/`, `referencias/`: material de partida.
- `docs/capturas/`: capturas de revisión de cada fase (1440 px y 390 px, claro y oscuro).

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Acceso, layout, Mi espacio, Horas, Ajustes de equipo, esquema completo | Hecha |
| 2 | Tareas y Objetivos semanales | Pendiente |
| 3 | Pipeline, Leads, ficha de cliente, cobros, importador CSV y seed real | Pendiente |
| 4 | LPs y OBVs, Inicio del equipo, buscador ⌘K | Pendiente |

## Stack

Next.js 16 (App Router, sin Cache Components) · TypeScript · Tailwind 4 · Supabase (Auth con enlace mágico, Postgres, RLS) · Vercel. Tests: Vitest (reglas), pgTAP (base de datos) y Playwright (extremo a extremo y capturas).

## Desarrollo local

Necesitas Node 22 y Docker.

```bash
npm install
npx supabase start          # Postgres, Auth y Mailpit en local
cp .env.example .env.local  # y pega la PUBLISHABLE_KEY que imprime el comando anterior
npm run dev                 # http://localhost:3000
```

El seed local (`supabase/seed.sql`) crea tres miembros de prueba: `guzman@sondia.test`, `dani@sondia.test` y `hugo@sondia.test`. Los emails de acceso no salen de tu ordenador: ábrelos en Mailpit, http://127.0.0.1:54324.

```bash
npm test            # reglas de negocio (Vitest)
npm run test:db     # reglas en la base de datos (pgTAP)
npx playwright test e2e/fase1.spec.ts         # extremo a extremo (con la app en marcha)
npx playwright test e2e/capturas.spec.ts      # capturas → docs/capturas/fase-1
npm run typecheck && npm run lint
```

Si Docker no puede descargar imágenes de `public.ecr.aws`, usa Docker Hub: `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start`.

## Puesta en producción (lo que tienes que hacer tú)

1. **Supabase.** Crea un proyecto (región UE, por ejemplo Fráncfort) y aplica las migraciones:
   ```bash
   npx supabase link --project-ref TU_REF
   npx supabase db push
   ```
2. **Emails permitidos.** En el SQL Editor de Supabase:
   ```sql
   insert into public.members (email, name, short_name, initials, weekly_hours_goal) values
     ('email-de-guzman@…', 'Guzmán', 'Guzmán', 'G', 25),
     ('email-de-dani@…',   'Daniel', 'Dani',   'D', 25),
     ('email-de-hugo@…',   'Hugo',   'Hugo',   'H', 25);
   ```
   Solo esos emails pueden pedir el enlace. Después se gestionan desde Ajustes.
3. **Plantilla del email.** Authentication → Email Templates → *Magic Link* y *Confirm signup*: pega el contenido de `supabase/templates/magic_link.html` (asunto: «Tu enlace para entrar en SondIA»). Así el enlace funciona aunque lo abras en otro navegador y el email trae el código de 6 cifras.
4. **URLs.** Authentication → URL Configuration: *Site URL* = la URL de Vercel; añade `https://TU-DOMINIO/auth/confirm` a *Redirect URLs*.
5. **SMTP.** El correo de Supabase por defecto está limitado a unos pocos emails por hora. Configura un SMTP propio (Resend, Brevo o el de vuestro dominio) en Authentication → SMTP.
6. **Vercel.** Importa el repo y define `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `NEXT_PUBLIC_SITE_URL`.
