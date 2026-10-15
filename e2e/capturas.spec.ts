import { test, type Browser } from "@playwright/test";
import { loginWithMagicLink } from "./helpers";

// Capturas de revisión: 1440 px y 390 px, tema claro y oscuro.
// `npm run screenshots -- e2e/capturas.spec.ts` → docs/capturas/<fase>/
const FASE = process.env.CAPTURAS_FASE ?? "fase-1";
const OUT = `docs/capturas/${FASE}`;

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900, isMobile: false },
  { name: "390", width: 390, height: 844, isMobile: true },
] as const;
const SCHEMES = ["light", "dark"] as const;

const PAGES = [
  { path: "/", name: "mi-espacio" },
  { path: "/horas", name: "horas" },
  { path: "/tareas?vista=lista", name: "tareas-lista" },
  { path: "/tareas?vista=tablero", name: "tareas-tablero" },
  { path: "/objetivos", name: "objetivos" },
  { path: "/ajustes", name: "ajustes" },
];

async function context(browser: Browser, vp: (typeof VIEWPORTS)[number], scheme: (typeof SCHEMES)[number]) {
  return browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.isMobile ? 2 : 1,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    colorScheme: scheme,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  });
}

test("capturas", async ({ browser }) => {
  test.skip(Boolean(process.env.CAPTURAS_VACIO), "Con CAPTURAS_VACIO solo van las de primer uso");
  test.setTimeout(240_000);
  for (const vp of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      const suffix = `${vp.name}-${scheme === "light" ? "claro" : "oscuro"}`;

      const anon = await context(browser, vp, scheme);
      const loginPage = await anon.newPage();
      await loginPage.goto("/login");
      await loginPage.screenshot({ path: `${OUT}/login-${suffix}.png`, fullPage: true });
      await anon.close();

      const ctx = await context(browser, vp, scheme);
      const page = await ctx.newPage();
      await loginWithMagicLink(page, "guzman@sondia.test");
      for (const p of PAGES) {
        await page.goto(p.path);
        await page.waitForLoadState("networkidle");
        await page.screenshot({ path: `${OUT}/${p.name}-${suffix}.png`, fullPage: true });
      }

      // Panel de una tarea abierto.
      await page.goto("/tareas?vista=lista");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Llamar a Embutidos Pimar para cerrar la propuesta" }).click();
      await page.getByRole("dialog", { name: "Tarea" }).waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/tarea-panel-${suffix}.png` });

      // Registro rápido abierto sobre Mi espacio.
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      if (vp.isMobile) await page.getByRole("button", { name: "Apuntar horas" }).last().click();
      else await page.keyboard.press("h");
      const dialog = page.getByRole("dialog", { name: "Apuntar horas" });
      await dialog.waitFor();
      await dialog.getByLabel("Duración").fill("1h30");
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/registro-rapido-${suffix}.png` });
      await ctx.close();
    }
  }
});

// Primer uso: se ejecuta con CAPTURAS_VACIO=1 sobre una base de datos vacía.
test("capturas de primer uso", async ({ browser }) => {
  test.skip(!process.env.CAPTURAS_VACIO, "Solo con CAPTURAS_VACIO=1");
  for (const [vp, scheme] of [
    [VIEWPORTS[0], "dark"],
    [VIEWPORTS[1], "light"],
  ] as const) {
    const suffix = `${vp.name}-${scheme === "light" ? "claro" : "oscuro"}`;
    const ctx = await context(browser, vp, scheme);
    const page = await ctx.newPage();
    await loginWithMagicLink(page, "hugo@sondia.test");
    for (const p of PAGES.filter((x) => ["mi-espacio", "tareas-lista", "objetivos"].includes(x.name))) {
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `${OUT}/vacio-${p.name}-${suffix}.png`, fullPage: true });
    }
    await ctx.close();
  }
});
