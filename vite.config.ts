import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// 1. Remove the cloudflare plugin
// import { cloudflare } from "@cloudflare/vite-plugin"; 
import { mochaPlugins } from "@getmocha/vite-plugins";

export default defineConfig({
  // 2. Remove cloudflare() from here
  plugins: [...mochaPlugins(process.env as any), react()], 
  server: {
    allowedHosts: true,
    // 3. Add this proxy configuration
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Port from server/index.js
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});