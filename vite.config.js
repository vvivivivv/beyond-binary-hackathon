import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html"),
        background: resolve(__dirname, "src/entries/background.js"),
        content: resolve(__dirname, "src/entries/content.js"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        chunkFileNames: "[name].js",
      }
    },
    outDir: "dist",
    emptyOutDir: true
  }
});