import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // npm run local の専用フォルダ（最新 main の複製）のテストは流さない
    exclude: ["**/node_modules/**", ".local-run/**"],
  },
});
