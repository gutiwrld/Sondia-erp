import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test.describe("Tareas", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "guzman@sondia.test");
  });

  test("alta rápida, editar en el panel y marcar como hecha", async ({ page }) => {
    await ready(page, "/tareas?vista=lista");
    await page.getByLabel("Nueva tarea", { exact: true }).fill("Tarea rápida e2e");
    await page.getByLabel("Nueva tarea", { exact: true }).press("Enter");
    const sinFecha = page.getByRole("region", { name: "Sin fecha" });
    await expect(sinFecha.getByText("Tarea rápida e2e")).toBeVisible();

    await sinFecha.getByRole("button", { name: "Tarea rápida e2e" }).click();
    const panel = page.getByRole("dialog", { name: "Tarea" });
    await expect(panel).toBeVisible();
    await panel.getByText("Alta", { exact: true }).click();
    await panel.getByRole("button", { name: "Hoy", exact: true }).click();
    await panel.getByLabel("Vinculada a").selectOption({ label: "Embutidos Pimar" });
    await panel.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();

    const hoy = page.getByRole("region", { name: "Hoy" });
    const row = hoy.getByRole("listitem").filter({ hasText: "Tarea rápida e2e" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Embutidos Pimar")).toBeVisible();

    // Aparece en Mi espacio.
    await ready(page, "/");
    await expect(page.getByRole("link", { name: /Tarea rápida e2e/ })).toBeVisible();

    await ready(page, "/tareas?vista=lista");
    await page.getByRole("checkbox", { name: "Marcar como hecha: Tarea rápida e2e" }).click();
    await expect(page.getByText("Tarea hecha")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: "Hoy" }).getByText("Tarea rápida e2e")).toHaveCount(0);
    await page.getByRole("button", { name: /Hechas/ }).click();
    await expect(page.getByRole("checkbox", { name: "Reabrir: Tarea rápida e2e" })).toBeVisible();
  });

  test("nueva tarea con T para otra persona y filtro por responsable", async ({ page }) => {
    await ready(page, "/tareas?vista=lista");
    await page.keyboard.press("t");
    const panel = page.getByRole("dialog", { name: "Nueva tarea" });
    await expect(panel).toBeVisible();
    await panel.getByLabel("Qué hay que hacer").fill("Preparar la maqueta de Red F7 (e2e)");
    await panel.getByRole("checkbox", { name: /Dani/ }).click();
    await panel.getByRole("checkbox", { name: /Guzmán/ }).click(); // quitarme
    await panel.getByRole("button", { name: "Crear tarea" }).click();
    await expect(page.getByText("Tarea creada")).toBeVisible();

    // No es mía: no sale en «Yo», sí en Dani.
    await expect(page.getByText("Preparar la maqueta de Red F7 (e2e)")).toHaveCount(0);
    await page.getByRole("button", { name: "Dani", exact: true }).click();
    await expect(page.getByText("Preparar la maqueta de Red F7 (e2e)")).toBeVisible();
  });

  test("tablero: arrastrar a En curso", async ({ page }) => {
    await ready(page, "/tareas?vista=tablero");
    const card = page.getByRole("listitem").filter({ hasText: "Pedir a Carlos Deza el enlace de su carta" });
    const enCurso = page.getByRole("region", { name: "En curso" });
    await card.dragTo(enCurso);
    await expect(enCurso.getByText("Pedir a Carlos Deza el enlace de su carta")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("region", { name: "En curso" }).getByText("Pedir a Carlos Deza el enlace de su carta"),
    ).toBeVisible();
  });
});

test.describe("Objetivos", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "dani@sondia.test");
  });

  test("añadir, cambiar estado, editar y borrar", async ({ page }) => {
    await ready(page, "/objetivos?semana=2026-10-12");
    const form = page.getByRole("form", { name: "Añadir objetivo" });
    await form.getByLabel("Nuevo objetivo").fill("Llamar a 20 leads respondidos (e2e)");
    await form.getByRole("checkbox", { name: "martes" }).click();
    await form.getByRole("checkbox", { name: "jueves" }).click();
    await form.getByRole("button", { name: "Todos" }).click();
    await form.getByRole("button", { name: "Añadir" }).click();
    await expect(page.getByText("Objetivo añadido")).toBeVisible();

    const varios = page.getByRole("region", { name: "Varios días" });
    const row = varios.getByRole("listitem").filter({ hasText: "Llamar a 20 leads respondidos (e2e)" });
    await expect(row).toBeVisible();
    await expect(row.getByText("mar y jue")).toBeVisible();

    await row.getByLabel(/Estado de/).selectOption("hecho");
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Varios días" }).getByRole("listitem").filter({ hasText: "Llamar a 20 leads" }).getByLabel(/Estado de/),
    ).toHaveValue("hecho");

    const again = page.getByRole("region", { name: "Varios días" }).getByRole("listitem").filter({ hasText: "Llamar a 20 leads" });
    await again.hover();
    await again.getByRole("button", { name: "Editar objetivo" }).click();
    await page.getByRole("form", { name: "Editar objetivo" }).getByLabel("Objetivo").fill("Llamar a 25 leads respondidos (e2e)");
    await page.getByRole("form", { name: "Editar objetivo" }).getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Llamar a 25 leads respondidos (e2e)")).toBeVisible();

    const edited = page.getByRole("listitem").filter({ hasText: "Llamar a 25 leads respondidos (e2e)" });
    await edited.hover();
    await edited.getByRole("button", { name: "Borrar objetivo" }).click();
    await edited.getByRole("button", { name: "Pulsa otra vez para borrar" }).click();
    await expect(page.getByText("Objetivo borrado")).toBeVisible();
    await expect(page.getByText("Llamar a 25 leads respondidos (e2e)")).toHaveCount(0);
  });

  test("pasar lo pendiente a la semana siguiente", async ({ page }) => {
    await ready(page, "/objetivos?semana=2026-10-19");
    await expect(page.getByText(/La semana pasada quedaron \d+ objetivos sin terminar/)).toBeVisible();
    await page.getByRole("button", { name: "Pasarlos a esta semana" }).click();
    await expect(page.getByText(/objetivos pasados a esta semana/)).toBeVisible();
    await expect(page.getByText("Cerrar un cliente nuevo")).toBeVisible();
    await expect(page.getByText("viene de la semana pasada").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Pasarlos a esta semana" })).toHaveCount(0);

    await ready(page, "/objetivos?semana=2026-10-12");
    await expect(page.getByText("Arrastrado").first()).toBeVisible();
  });
});

test("Mi espacio: objetivos arriba y acciones con clientes al fondo", async ({ page }) => {
  await login(page, "guzman@sondia.test");
  await ready(page, "/");
  await expect(page.getByRole("link", { name: /Objetivos de la semana \d/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Próximas acciones con clientes/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Próximas acciones/ })).toHaveCount(0);
});
