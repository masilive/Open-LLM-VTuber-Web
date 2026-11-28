import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer/src"),
      "@framework": path.resolve(
        __dirname,
        "./src/renderer/WebSDK/Framework/src",
      ),
      "@cubismsdksamples": path.resolve(__dirname, "./src/renderer/WebSDK/src"),
      "@motionsyncframework": path.resolve(
        __dirname,
        "./src/renderer/MotionSync/Framework/src",
      ),
      "@motionsync": path.resolve(__dirname, "./src/renderer/MotionSync/src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/renderer/src/test/setup.ts"],
    include: [
      "src/renderer/src/**/*.test.ts",
      "src/renderer/src/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: [
        "src/renderer/src/modules/**/*.ts",
        "src/renderer/src/modules/**/*.tsx",
        "src/renderer/src/components/ui/status-pill.tsx",
        "src/renderer/src/components/ui/icon-action-button.tsx",
        "src/renderer/src/components/ui/empty-state.tsx",
        "src/renderer/src/components/ui/sparkline.tsx",
        "src/renderer/src/components/ui/safe-avatar.tsx",
        "src/renderer/src/utils/startup.ts",
      ],
      exclude: [
        "src/renderer/src/**/*.test.ts",
        "src/renderer/src/**/*.test.tsx",
        "src/renderer/src/modules/**/*.abstractions.ts",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
