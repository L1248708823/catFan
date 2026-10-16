import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const API_TARGET = "http://127.0.0.1:3000";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "catFan 猫咪喂养计算",
        short_name: "catFan",
        description: "计算猫咪每日喂食量，记录体重与喂养历史。",
        lang: "zh-CN",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#f6f5ee",
        background_color: "#f6f5ee",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // 清单与图标由插件加入缓存，这里补齐应用代码、样式和本地字体。
        globPatterns: ["**/*.{js,css,html,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // 开发期把 /api 转给本地后端。生产由 nginx 反代，前端和接口同源，不需要 CORS。
  server: {
    port: 5173,
    proxy: { "/api": API_TARGET },
  },
  // preview 的代理要单独写一份：server.proxy 不作用于 preview。
  preview: {
    proxy: { "/api": API_TARGET },
  },
});
