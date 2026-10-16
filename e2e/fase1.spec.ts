import { expect, test } from "@playwright/test";
import { LOCAL_PASSWORD, login } from "./helpers";

test.describe("Acceso", () => {
  test("sin sesión manda a /login", async ({ page }) => {
    await page.goto("/horas");
    await expect(page).toHaveURL(/\/login\?next=%2Fhoras/);
  });

  test("contraseña incorrecta", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("guzman@sondia.test");
    await page.getByLabel("Contraseña", { exact: true }).fill("no-es-esta");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("un email sin cuenta no entra aunque acierte la contraseña", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("intruso@example.com");
    await page.getByLabel("Contraseña", { exact: true }).fill(LOCAL_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
  });

  test("entra con email y contraseña y vuelve a la página que pedía", async ({ page }) => {
    await page.goto("/horas");
    await page.getByLabel("Email").fill("dani@sondia.test");
    await page.getByLabel("Contraseña", { exact: true }).fill(LOCAL_PASSWORD);
    await page.getByRole("button", { name: "Mostrar contraseña" }).click();
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/horas$/);
  });

  test("entra y ve su Mi espacio", async ({ page }) => {
    await login(page, "guzman@sondia.test");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Guzmán");
  });

  test("cambiar la contraseña desde Ajustes", async ({ page }) => {
    await login(page, "hugo@sondia.test");
    await page.goto("/ajustes");
    await page.getByLabel("Contraseña nueva").fill("hugo-nueva-123");
    await page.getByLabel("Repítela").fill("hugo-nueva-12");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("Las dos contraseñas no coinciden.")).toBeVisible();
    await page.getByLabel("Repítela").fill("hugo-nueva-123");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("Contraseña cambiada")).toBeVisible();

    await page.context().clearCookies();
    await login(page, "hugo@sondia.test", "hugo-nueva-123");
    // La deja como estaba para el resto de pruebas.
    await page.goto("/ajustes");
    await page.getByLabel("Contraseña nueva").fill(LOCAL_PASSWORD);
    await page.getByLabel("Repítela").fill(LOCAL_PASSWORD);
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("Contraseña cambiada")).toBeVisible();
  });
});

test.describe("Horas", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "hugo@sondia.test");
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
