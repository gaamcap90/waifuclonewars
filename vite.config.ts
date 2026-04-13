import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime — unlikely to change, cache-stable
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Game engine — heaviest module, split so vendor chunk stays small
          "game-engine": ["./src/hooks/useGameStateNew"],
          // i18n strings — large static data, split per build
          "i18n": ["./src/i18n/en", "./src/i18n/de", "./src/i18n/ko", "./src/i18n/pt-BR", "./src/i18n/zh-CN"],
        },
      },
    },
  },
}));
