import { expect, test, type Page } from "@playwright/test";
import { loginWithMagicLink } from "./helpers";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test.beforeEach(async ({ page }) => {
  await loginWithMagicLink(page, "guzman@sondia.test");
});

test("Leads: filtros con los datos reales", async ({ page }) => {
  await ready(page, "/clientes/leads");
  await expect(page.getByText(/285 de 306/)).toBeVisible(); // 26 por contactar + 259 contactados
  await page.getByLabel("Qué ver").selectOption("no_contactar");
  await expect(page.getByText(/^8 de 306$/)).toBeVisible();
  await page.getByLabel("Qué ver").selectOption("prospeccion");
  await page.getByRole("checkbox", { name: "Email rebotado" }).check();
  await expect(page.getByText(/^8 de 306$/)).toBeVisible();
});

test("pipeline: columnas con totales y arrastrar a Negociación", async ({ page }) => {
  await ready(page, "/clientes");
  const propuesta = page.getByRole("region", { name: "Propuesta enviada" });
  await expect(propuesta.getByText("980 €")).toBeVisible();
  await expect(page.getByText("Abierto")).toBeVisible();

  const card = propuesta.getByRole("listitem").filter({ hasText: "Embutidos Pimar" });
  const negociacion = page.getByRole("region", { name: "Negociación" });
  await card.dragTo(negociacion);
  await expect(page.getByText("Embutidos Pimar: movido a negociación")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Negociación" }).getByText("Embutidos Pimar")).toBeVisible();
});

test("ficha: próxima acción, historial y cobro", async ({ page }) => {
  await ready(page, "/clientes");
  await page.getByRole("link", { name: /Librería Alcaraván/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Librería Alcaraván" })).toBeVisible();
  await expect(page.getByText("F260046").first()).toBeVisible();
  await expect(page.getByText("175,45 €").first()).toBeVisible();

  const next = page.getByRole("form", { name: "Próxima acción" });
  await next.getByLabel("Qué hay que hacer").fill("Publicar la web y pedir el pago final");
  await next.getByRole("button", { name: "Mañana" }).click();
  await next.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Próxima acción guardada")).toBeVisible();

  const composer = page.getByRole("form", { name: "Añadir al historial" });
  await composer.getByLabel("Qué ha pasado").fill("Jesús confirma el horario de la librería (e2e)");
  await composer.getByLabel("Tipo").selectOption("llamada");
  await composer.getByRole("button", { name: "Añadir" }).click();
  await expect(page.getByText("Añadido al historial")).toBeVisible();
  await expect(page.getByText("Jesús confirma el horario de la librería (e2e)")).toBeVisible();

  await page.getByRole("button", { name: "Registrar cobro" }).click();
  const pay = page.getByRole("form", { name: "Registrar cobro" });
  await pay.getByLabel("Importe (€)").fill("114,55");
  await pay.getByLabel("Concepto").fill("Pago final (e2e)");
  await pay.getByRole("button", { name: "Guardar cobro" }).click();
  await expect(page.getByText("Cobro de 114,55 € registrado")).toBeVisible();
  await expect(page.getByText("290,00 € de 290 €")).toBeVisible();
});

test("No contactar: marcar, no se puede reactivar, quitar la marca", async ({ page }) => {
  await ready(page, "/clientes/leads");
  await page.getByLabel("Buscar por nombre, email, ciudad o web").fill("Cuchillería Barbero");
  await page.getByRole("link", { name: "Cuchillería Barbero" }).click();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Marcar como «No contactar»" }).click();
  const form = page.getByRole("form", { name: "Marcar como No contactar" });
  await form.getByLabel(/Por qué/).fill("Contestó que no le interesa (e2e)");
  await form.getByRole("button", { name: "Marcar «No contactar»" }).click();
  await expect(page.getByRole("status").getByText("Contestó que no le interesa (e2e)")).toBeVisible();
  await expect(page.getByLabel("Etapa")).toHaveValue("perdido");
  await expect(page.getByLabel("Etapa")).toBeDisabled();

  // Desde Leads, una acción masiva tampoco lo reactiva.
  await ready(page, "/clientes/leads");
  await page.getByLabel("Qué ver").selectOption("no_contactar");
  await page.getByLabel("Seleccionar Cuchillería Barbero").check();
  await page.getByLabel("Mover a la etapa").selectOption("contactado");
  await expect(page.getByText("0 movidos a Contactado · 1 «No contactar» se quedan como están")).toBeVisible();

  // Quitar la marca exige confirmarlo.
  await page.getByRole("link", { name: "Cuchillería Barbero" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Quitar la marca…" }).click();
  await page.getByRole("button", { name: "Sí, quitar la marca" }).click();
  await expect(page.getByText(/Marca «No contactar» quitada/)).toBeVisible();
  await expect(page.getByLabel("Etapa")).toBeEnabled();
  await expect(page.getByText("Quitada la marca «No contactar»")).toBeVisible();
});

test("importar CSV: vista previa, duplicados y No contactar", async ({ page }) => {
  await ready(page, "/clientes/importar");
  const csv = [
    "nombre;email;ciudad;estado;nota",
    "Clínica Dental Sonrisa (e2e);hola@sonrisa-e2e.es;Valladolid;enviado;",
    "Embutidos Pimar;;Valencia;respondido;",
    "Hostal El Mirador (e2e);mirador@e2e.es;Soria;descartado;Contestó que no. No volver a escribir.",
  ].join("\n");
  await page.locator('input[type="file"]').setInputFiles({ name: "prueba.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.getByText("Columnas de prueba.csv")).toBeVisible();
  const resumen = page.getByRole("region", { name: "Resumen" });
  await expect(resumen).toContainText("2 nuevos");
  await expect(resumen).toContainText("1 ya existen");
  await expect(resumen).toContainText("1 entrarán como «No contactar»");

  await page.getByRole("button", { name: "Importar 2 nuevos" }).click();
  await expect(page.getByText("Importación terminada")).toBeVisible();
  await expect(page.getByText(/2 creados/)).toBeVisible();

  await ready(page, "/clientes/leads");
  await page.getByLabel("Qué ver").selectOption("no_contactar");
  await expect(page.getByRole("link", { name: "Hostal El Mirador (e2e)" })).toBeVisible();
});

test("exportar CSV", async ({ page }) => {
  const res = await page.request.get("/clientes/exportar");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const body = await res.text();
  expect(body).toContain("nombre;etapa;no_contactar");
  expect(body).toContain("Librería Alcaraván;Ganado");
});

test("nuevo cliente desde el pipeline", async ({ page }) => {
  await ready(page, "/clientes");
  await page.getByRole("button", { name: /Nuevo/ }).click();
  const form = page.getByRole("form", { name: "Nuevo cliente" });
  await form.getByLabel("Nombre del negocio").fill("Academia Ritmo (e2e)");
  await form.getByLabel("Etapa").selectOption("reunion");
  await form.getByLabel("Valor (€)").fill("1.200");
  await form.getByRole("button", { name: "Crear cliente" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Academia Ritmo (e2e)" })).toBeVisible();
  await expect(page.getByText("Valor 1.200 €")).toBeVisible();

  // Duplicado: mismo nombre.
  await ready(page, "/clientes");
  await page.getByRole("button", { name: /Nuevo/ }).click();
  await page.getByRole("form", { name: "Nuevo cliente" }).getByLabel("Nombre del negocio").fill("Academia Ritmo (e2e)");
  await page.getByRole("form", { name: "Nuevo cliente" }).getByRole("button", { name: "Crear cliente" }).click();
  await expect(page.getByText("Ya existe «Academia Ritmo (e2e)»")).toBeVisible();
});
