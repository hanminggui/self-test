import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import * as path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "./src/frontend",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src/frontend"),
    },
  },
});
