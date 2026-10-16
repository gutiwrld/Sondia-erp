import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

function isoDaysAgo(days: number) {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" }),
  );
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test.beforeEach(async ({ page }) => {
  await login(page, "guzman@sondia.test");
});

test("⌘K encuentra un cliente sin acentos y abre su ficha", async ({
  page,
}) => {
  await ready(page, "/");
  await page.keyboard.press("ControlOrMeta+k");
  const search = page.getByRole("combobox", {
    name: "Buscar clientes, tareas, LPs, OBVs o personas",
  });
  await search.fill("alcaravan");
  await expect(
    page.getByRole("option", { name: /Librería Alcaraván/ }).first(),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "Librería Alcaraván" }),
  ).toBeVisible();
});

test("OBV con reunión hace 5 días: fuera de plazo, en el aviso y redactada hoy", async ({
  page,
}) => {
  // El seed de demo trae una OBV de Dani fuera de plazo.
  await ready(page, "/leinn/obvs");
  await expect(
    page.getByRole("link", { name: /OBVs\s*1 fuera de plazo/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Nueva/ }).click();
  const panel = page.getByRole("dialog", { name: "Nueva OBV" });
  await panel.getByLabel("Entrevistado").fill("Marta Prueba");
  await panel.getByLabel("Empresa").fill("Panadería E2E");
  await panel.getByLabel("Tipo").selectOption("investigacion");
  await panel.getByLabel("Reunión").fill(isoDaysAgo(5));
  await expect(panel.getByText("5 días · fuera de plazo")).toBeVisible();
  await panel.getByRole("button", { name: "Crear OBV" }).click();
  await expect(page.getByText("OBV creada")).toBeVisible();

  const row = page.getByRole("listitem").filter({ hasText: "Marta Prueba" });
  await expect(row.getByText("5 días · fuera de plazo")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /OBVs\s*2 fuera de plazo/ }),
  ).toBeVisible();

  await row.getByRole("button", { name: "Redactada hoy" }).click();
  await expect(page.getByText("OBV marcada como redactada hoy")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Por redactar" })
      .getByText("Marta Prueba"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Redactadas" }).getByText(/Marta Prueba/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /OBVs\s*1 fuera de plazo/ }),
  ).toBeVisible();
});

test("no se puede redactar una OBV antes de la reunión", async ({ page }) => {
  await ready(page, "/leinn/obvs?nueva=1");
  const panel = page.getByRole("dialog", { name: "Nueva OBV" });
  await panel.getByLabel("Entrevistado").fill("Fecha Imposible");
  await panel.getByLabel("Reunión").fill(isoDaysAgo(2));
  // Saltamos el min del campo para comprobar la validación del servidor.
  await panel
    .getByLabel("Redactada")
    .evaluate((el: HTMLInputElement) => el.removeAttribute("min"));
  await panel.getByLabel("Redactada").fill(isoDaysAgo(4));
  await panel.getByRole("button", { name: "Crear OBV" }).click();
  await expect(
    panel.getByText("No se puede redactar antes de la reunión."),
  ).toBeVisible();
});

test("LP: crear y cambiar el estado en la tabla", async ({ page }) => {
  await ready(page, "/leinn/lps");
  await page.getByRole("button", { name: /Nueva/ }).click();
  const panel = page.getByRole("dialog", { name: "Nueva LP" });
  await panel
    .getByLabel("Pregunta")
    .fill("¿Cuánto pagaría una tienda por una web con catálogo?");
  await panel.getByLabel("Número").fill("21");
  await panel.getByRole("button", { name: "Crear LP" }).click();
  await expect(page.getByText("LP creada")).toBeVisible();

  await page.getByLabel("Estado de LP 21").selectOption("entregada");
  await expect(page.getByText("LP 21 · entregada")).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Entregadas y validadas" })
      .getByText(/Cuánto pagaría una tienda/),
  ).toBeVisible();
});

test("Inicio del equipo: cobrado, pipeline y horas", async ({ page }) => {
  await ready(page, "/equipo");
  await expect(
    page.getByRole("heading", { level: 1, name: "Inicio del equipo" }),
  ).toBeVisible();
  // El seed trae el cobro de Alcaraván (175,45 €); la prueba de la Fase 3 puede haber añadido otro.
  const cobrado = page
    .getByRole("link", { name: /^Cobrado en / })
    .locator("p")
    .first();
  const euros = Number(
    (await cobrado.innerText()).replace(/[^\d,]/g, "").replace(",", "."),
  );
  expect(euros).toBeGreaterThanOrEqual(175.45);
  const pipeline = page.getByRole("table", { name: /Valor estimado/ });
  await expect(pipeline.getByRole("row")).toHaveCount(7); // cabecera + 6 etapas
  await expect(pipeline.getByRole("row", { name: /Ganado/ })).toContainText(
    "290 €",
  );
  await expect(page.getByRole("meter", { name: /Dani:/ })).toBeVisible();
});
