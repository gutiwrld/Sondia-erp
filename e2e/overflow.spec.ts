import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Ninguna pantalla puede tener scroll horizontal a 390 px.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("sin desbordamiento horizontal en el móvil", async ({ page }) => {
  await login(page, "guzman@sondia.test");
  for (const path of ["/", "/horas", "/ajustes", "/tareas?vista=lista", "/tareas?vista=tablero", "/objetivos", "/clientes", "/clientes/leads", "/clientes/importar", "/mas", "/leinn/lps", "/leinn/obvs", "/equipo", "ficha"]) {
    if (path === "ficha") {
      await page.goto("/clientes");
      await page.getByRole("link", { name: /Librería Alcaraván/ }).click();
      await page.getByRole("heading", { level: 1, name: "Librería Alcaraván" }).waitFor();
    } else await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Con la emulación móvil el viewport crece con el contenido: se compara con los 390 px reales.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - 390);
    expect(overflow, `${path} desborda ${overflow}px`).toBeLessThanOrEqual(0);
  }
});
