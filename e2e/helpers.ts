import { expect, type Page } from "@playwright/test";

/** Contraseña de las cuentas de prueba locales (supabase/seeds/01-miembros-local.sql). */
export const LOCAL_PASSWORD = process.env.E2E_PASSWORD ?? "sondia-local";

/** Entra con email y contraseña desde /login. */
export async function login(page: Page, email: string, password = LOCAL_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
}
