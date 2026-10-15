import { expect, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitMessage = { ID: string; To: { Address: string }[]; Created: string };

async function latestMessageFor(email: string, after: number): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/messages?limit=20`);
    const body = (await res.json()) as { messages: MailpitMessage[] };
    const msg = body.messages.find(
      (m) => m.To.some((t) => t.Address === email) && new Date(m.Created).getTime() >= after - 2000,
    );
    if (msg) {
      const full = await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`);
      const data = (await full.json()) as { HTML: string };
      return data.HTML;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No ha llegado el email para ${email}`);
}

/** Entra con el enlace mágico real que llega a Mailpit. */
export async function loginWithMagicLink(page: Page, email: string) {
  const before = Date.now();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText("Enlace enviado a")).toBeVisible();
  const html = await latestMessageFor(email, before);
  const href = html.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1]?.replace(/&amp;/g, "&");
  if (!href) throw new Error("El email no trae el enlace de acceso");
  const url = new URL(href);
  await page.goto(`${url.pathname}${url.search}`);
  await expect(page).toHaveURL(/\/$/);
}

/** Entra escribiendo el código de 6 cifras del email. */
export async function loginWithCode(page: Page, email: string) {
  const before = Date.now();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText("Enlace enviado a")).toBeVisible();
  const html = await latestMessageFor(email, before);
  const code = html.match(/>\s*(\d{6})\s*</)?.[1];
  if (!code) throw new Error("El email no trae el código");
  await page.getByLabel("Código").fill(code);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/);
}
