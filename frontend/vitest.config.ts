import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import os from "os";
import path from "path";

const coverageDirectory = process.env.COVERAGE_DIR ?? path.join(os.tmpdir(), "triton-schedule-frontend-coverage");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: coverageDirectory,
      reporter: ["text-summary", "json", "lcov", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      },
      all: false,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/setup.ts",
        "src/main.tsx",
        "src/App.tsx",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}"
      ]
    }
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
