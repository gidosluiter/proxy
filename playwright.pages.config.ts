import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "pages.spec.ts",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173/proxy/",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
  },
  webServer: {
    command: "npm run build:pages && node scripts/serve-pages.mjs",
    url: "http://127.0.0.1:4173/proxy/",
    reuseExistingServer: false,
    timeout: 60000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
