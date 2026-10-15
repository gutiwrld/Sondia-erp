import { expect, test } from "@playwright/test";
import { loginWithMagicLink } from "./helpers";

// Ninguna pantalla puede tener scroll horizontal a 390 px.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test("sin desbordamiento horizontal en el móvil", async ({ page }) => {
  await loginWithMagicLink(page, "guzman@sondia.test");
  for (const path of ["/", "/horas", "/ajustes"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} desborda ${overflow}px`).toBeLessThanOrEqual(0);
  }
});
