import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg"],
      manifest: false, // we ship a hand-written manifest.webmanifest in /public
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html", // client-side routes must resolve offline too
        runtimeCaching: [
          {
            // Cache Google Fonts so the display/body typefaces still render offline
            // after the first successful load.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // API calls: try the network first (fresh data), fall back to the last
            // good cached response when offline.
            urlPattern: /^http:\/\/localhost:4000\/api\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
