import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    // This allows the build to finish despite the 'eval' warnings from the AI library
    chunkSizeWarningLimit: 2000, 
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html"),
        background: resolve(__dirname, "src/entries/background.js"),
        content: resolve(__dirname, "src/entries/content.js"),
      },
      output: {
        // Keeps your main files at the root of the /dist folder
        entryFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        chunkFileNames: "[name].js",
        
        // THE FIX: Sanitizer to remove null bytes (\x00) and leading underscores (_)
        sanitizeFileName(name) {
          const MATCH_NULL_BYTE = /\x00/g;
          const MATCH_UNDERSCORE = /^_/;
          return name
            .replace(MATCH_NULL_BYTE, "v-") // Replaces hidden null bytes with 'v-'
            .replace(MATCH_UNDERSCORE, ""); // Removes leading underscores
        },
      }
    },
    sourmap: false,
    outDir: "dist",
    emptyOutDir: true,
  }
});