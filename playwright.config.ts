import { defineConfig } from "@playwright/test";

// Pruebas de extremo a extremo y capturas contra el entorno local
// (`npx supabase start` + `npm run dev`). No toca producción.
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
});
