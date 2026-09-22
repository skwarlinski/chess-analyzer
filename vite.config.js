import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import crossOriginIsolation from "vite-plugin-cross-origin-isolation";

export default defineConfig({
  base: "/chess-analyzer/",
  plugins: [react(), crossOriginIsolation()],
  optimizeDeps: {
    exclude: ["stockfish"],
  },
});