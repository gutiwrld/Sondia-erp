import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts"],
    // Las pruebas de fechas no deben depender de la zona del ordenador.
    env: { TZ: "America/New_York" },
  },
});
