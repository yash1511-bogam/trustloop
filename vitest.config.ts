import { defineConfig } from "vitest/config";
import path from "path";

const strictCoverage = process.env.VITEST_STRICT_COVERAGE === "1";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: [
        "src/lib/prisma.ts",
        "src/lib/redis.ts",
        "src/lib/stytch.ts",
        "src/app/api/**/__tests__/**",
      ],
      thresholds: strictCoverage ? { lines: 80, branches: 70 } : undefined,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
