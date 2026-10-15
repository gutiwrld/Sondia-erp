import { expect, test } from "@playwright/test";
import { loginWithCode, loginWithMagicLink } from "./helpers";

test.describe("Acceso", () => {
  test("sin sesión manda a /login", async ({ page }) => {
    await page.goto("/horas");
    await expect(page).toHaveURL(/\/login\?next=%2Fhoras/);
  });

  test("un email fuera de la lista no recibe enlace", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("intruso@example.com");
    await page.getByRole("button", { name: "Enviar enlace" }).click();
    await expect(page.getByText("Este email no tiene acceso al ERP de SondIA.")).toBeVisible();
  });

  test("entra con el enlace mágico", async ({ page }) => {
    await loginWithMagicLink(page, "guzman@sondia.test");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Guzmán");
  });

  test("entra con el código de 6 cifras", async ({ page }) => {
    await loginWithCode(page, "dani@sondia.test");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Dani");
  });
});

test.describe("Horas", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithMagicLink(page, "hugo@sondia.test");
  });

  test("apuntar horas con H, ver la entrada y deshacer", async ({ page }) => {
    await page.goto("/horas");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("h");
    const dialog = page.getByRole("dialog", { name: "Apuntar horas" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Duración").fill("1h30");
    await expect(dialog.getByText("1 h 30 min")).toBeVisible();
    await dialog.getByText("Formación", { exact: true }).click();
    await dialog.getByLabel("Nota").fill("Prueba e2e de horas");
    await dialog.getByLabel("Nota").press("Enter");
    await expect(page.getByText("Apuntadas 1 h 30 min de Formación")).toBeVisible();
    await expect(dialog).toBeHidden();
    const row = page.getByRole("listitem").filter({ hasText: "Prueba e2e de horas" });
    await expect(row).toBeVisible();
    await expect(row.getByText("1:30")).toBeVisible();

    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(page.getByText("Entrada borrada")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Prueba e2e de horas" })).toHaveCount(0);
  });

  test("una duración no válida no se guarda", async ({ page }) => {
    await page.goto("/horas");
    const form = page.getByRole("form", { name: "Apuntar horas" });
    await form.getByLabel("Duración").fill("abc");
    await form.getByText("Ventas", { exact: true }).click();
    await form.getByRole("button", { name: "Apuntar" }).click();
    await expect(form.getByText("Escribe cuánto tiempo: 1,5 · 1h30 · 90m.")).toBeVisible();
  });

  test("cronómetro: iniciar, sobrevivir a recargar, parar y guardar", async ({ page }) => {
    await page.goto("/horas");
    const form = page.getByRole("form", { name: "Apuntar horas" });
    await form.getByText("Desarrollo", { exact: true }).click();
    await form.getByLabel("Nota").fill("Cronómetro e2e");
    await form.getByRole("button", { name: "Iniciar cronómetro" }).click();
    await expect(page.getByText("Cronómetro en marcha").first()).toBeVisible();

    // Sigue en marcha tras recargar (se guarda en la base de datos).
    await page.reload();
    await expect(page.getByText("Cronómetro en marcha").first()).toBeVisible();
    await page.getByRole("button", { name: "Parar y guardar" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Guardar el cronómetro" });
    await expect(dialog).toBeVisible();
    // Ha pasado menos de un minuto: la duración se escribe a mano.
    await dialog.getByLabel("Duración").fill("15m");
    await expect(dialog.getByLabel("Nota")).toHaveValue("Cronómetro e2e");
    await dialog.getByRole("button", { name: "Guardar horas" }).click();
    await expect(page.getByText("Apuntadas 15 min de Desarrollo")).toBeVisible();
    await expect(page.getByText("Cronómetro en marcha")).toHaveCount(0);
    await expect(page.getByRole("listitem").filter({ hasText: "Cronómetro e2e" })).toBeVisible();
  });
});
