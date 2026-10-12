import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  plugins: [
    {
      name: "legacy-history-fallback",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const path = (req.url || "").split("?")[0];
          if (
            [
              "/legacy",
              "/legacy/browse",
              "/legacy/settings",
              "/legacy/favorites",
              "/legacy/recent",
            ].includes(path)
          )
            req.url = "/legacy/index.html";
          next();
        });
      },
    },
  ],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:3000" } },
  build: {
    // Readable bundles keep upstream public Gist IDs out of minified
    // lines containing model names that trigger GitHub key-pattern false positives.
    minify: false,
    outDir: "dist/client",
    rollupOptions: {
      input: {
        chat: resolve("index.html"),
        legacy: resolve("legacy/index.html"),
      },
    },
  },
});
