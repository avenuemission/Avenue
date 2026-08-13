import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// fileURLToPath keeps this correct on Windows, where a bare URL pathname
// comes back as /C:/... and breaks module resolution.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
