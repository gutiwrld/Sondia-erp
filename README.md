# SondIA ERP

Herramienta interna de SondIA (Guzmán, Dani y Hugo): horas, tareas, LPs y OBVs, clientes y leads, y objetivos semanales.

- `PRODUCT.md`: contexto de producto. `DESIGN.md`: sistema de diseño. `docs/propuesta-shape.md`: arquitectura y modelo de datos.
- `datos-iniciales/`, `marca/`, `referencias/`: material de partida.
- `docs/capturas/`: capturas de revisión de cada fase (1440 px y 390 px, claro y oscuro).

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Acceso, layout, Mi espacio, Horas, Ajustes de equipo, esquema completo | Hecha |
| 2 | Tareas (lista y tablero) y Objetivos semanales con arrastre | Hecha |
| 3 | Pipeline, Leads, ficha de cliente, cobros, importador y exportador CSV, seed real | Hecha |
| 4 | LPs y OBVs con el aviso de los 3 días, Inicio del equipo, buscador ⌘K | Hecha |

## Stack

Next.js 16 (App Router, sin Cache Components) · TypeScript · Tailwind 4 · Supabase (Auth con email y contraseña, Postgres, RLS) · Vercel. Tests: Vitest (reglas), pgTAP (base de datos) y Playwright (extremo a extremo y capturas).

## Desarrollo local

Necesitas Node 22 y Docker.

```bash
npm install
npx supabase start          # Postgres y Auth en local
cp .env.example .env.local  # y pega la PUBLISHABLE_KEY que imprime el comando anterior
npm run dev                 # http://localhost:3000
```

El seed local son tres ficheros en `supabase/seeds/`:
- `01-miembros-local.sql`: tres miembros de prueba (`guzman@sondia.test`, `dani@sondia.test`, `hugo@sondia.test`) con la contraseña `sondia-local`. Solo local.
- `02-datos-reales.sql`: los datos reales de `datos-iniciales/` (305 leads, pipeline, cobro de Alcaraván, LPs, OBVs y objetivos). Lo genera `npm run seed:generar`; no se edita a mano.
- `03-demo-local.sql`: fechas de próxima acción, tareas y horas de ejemplo. Solo local.

```bash
npm test            # reglas de negocio (Vitest)
npm run test:db     # reglas en la base de datos (pgTAP)
npx supabase db reset && npx playwright test  # extremo a extremo (con la app en marcha; capturas aparte)
CAPTURAS_FASE=fase-4 npx playwright test e2e/capturas.spec.ts  # capturas → docs/capturas/fase-4
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
   Solo esos emails pueden tener cuenta: un trigger rechaza cualquier otro.
3. **Datos reales.** Con los miembros ya creados, pega en el SQL Editor el contenido de `supabase/seeds/02-datos-reales.sql` y ejecútalo. Carga los 305 leads (con la regla de los descartados aplicada), el pipeline, el primer cobro de Alcaraván (175,45 €, factura F260046), las LPs, las OBVs y los objetivos de la semana del 12 oct. Ejecútalo una sola vez.
4. **Sin altas públicas.** Authentication → Sign In / Providers: desactiva *Allow new users to sign up* y deja activado el proveedor *Email* (sin *Confirm email*). Así nadie puede crearse una cuenta desde fuera.
5. **Cuentas con contraseña.** La contraseña del equipo no está en el repositorio. Dos formas de ponerla:
   - Desde tu ordenador, con la clave secreta (Project Settings → API Keys):
     ```bash
     SUPABASE_URL=https://TU_REF.supabase.co SUPABASE_SECRET_KEY=sb_secret_… ERP_PASSWORD='…' npm run cuentas
     ```
     Crea la cuenta de cada miembro activo, o le cambia la contraseña si ya existe.
   - O a mano: Authentication → Users → *Add user* → *Create new user*, con el email, la contraseña y *Auto Confirm User* marcado.

   Cada uno puede cambiar la suya después en Ajustes → Tu contraseña.
6. **URL.** Authentication → URL Configuration: *Site URL* = la URL de Vercel.
7. **Vercel.** Importa el repo y define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. La clave secreta **no** va en Vercel.
