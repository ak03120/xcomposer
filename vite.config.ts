import { defineConfig } from "vite"
import { fileURLToPath, URL } from "node:url"
import vue from "@vitejs/plugin-vue"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8788",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("md-"),
        },
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "xcomposer",
        short_name: "xcomposer",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
})
