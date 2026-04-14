import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    css: false,
    include: [
      "__tests__/**/*.test.{ts,tsx}",
      "components/__tests__/**/*.test.{ts,tsx}",
      "lib/__tests__/**/*.test.{ts,tsx}",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
