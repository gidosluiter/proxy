import { createServer } from "vite";
import { it, expect } from "vitest";
it("Vite reloads legacy nested routes into the legacy entry", async () => {
  const vite = await createServer({
    configFile: "vite.config.ts",
    server: { port: 0, host: "127.0.0.1" },
    logLevel: "silent",
  });
  try {
    await vite.listen();
    const address = vite.httpServer!.address();
    if (typeof address !== "object" || !address)
      throw new Error("No Vite port");
    for (const path of [
      "/legacy/settings",
      "/legacy/browse?url=https%3A%2F%2Fexample.com",
    ]) {
      const html = await (
        await fetch(`http://127.0.0.1:${address.port}${path}`, {
          headers: { accept: "text/html" },
        })
      ).text();
      expect(html).toContain("/client/legacy.tsx");
      expect(html).not.toContain("/client/main.tsx");
    }
  } finally {
    await vite.close();
  }
}, 15000);
