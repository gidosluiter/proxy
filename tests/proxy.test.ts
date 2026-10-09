import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";
import { createEngine, type Transport } from "../server/proxy";
const dns = async () => [{ address: "93.184.216.34", family: 4 }];
const response = (
  body: string,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/html", ...headers },
  });
const fixture: Transport = async (url) => {
  if (url.pathname === "/redirect")
    return response("", 302, { location: "/next" });
  if (url.pathname === "/evil")
    return response("", 302, { location: "http://169.254.169.254/" });
  if (url.pathname === "/loop") return response("", 302, { location: "/loop" });
  if (url.pathname === "/private.css")
    return response("p{color:red}", 200, {
      "content-type": "text/css",
      "cache-control": "private",
      "set-cookie": "session=no",
    });
  if (url.pathname === "/public.css")
    return response("p{color:red}", 200, {
      "content-type": "text/css",
      "cache-control": "public, max-age=300",
    });
  if (url.pathname === "/big") return response("a".repeat(2000));
  return response(
    '<title>Fixture</title><h1>Public page</h1><a href="/next">Next page</a>',
  );
};
const app = () =>
  createApp(createEngine({ resolve: dns, transport: fixture, maxBytes: 1024 }));
describe("proxy HTTP integration", () => {
  it("fetches real upstream markup through its transport and rewrites navigation", async () => {
    const r = await request(app())
      .get("/api/browse")
      .query({ url: "https://example.com/" });
    expect(r.status).toBe(200);
    expect(r.body.html).toContain("Public page");
    expect(r.body.html).toContain("/browse?url=");
    expect(r.headers["cache-control"]).toContain("no-store");
  });
  it("follows validated redirects", async () => {
    const r = await request(app())
      .get("/api/browse")
      .query({ url: "https://example.com/redirect" });
    expect(r.body.url).toBe("https://example.com/next");
  });
  it.each(["/evil", "/loop", "/big"])(
    "rejects unsafe or unbounded responses %s",
    async (path) => {
      const r = await request(app())
        .get("/api/browse")
        .query({ url: "https://example.com" + path });
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.body.error).toBeTruthy();
    },
  );
  it("rejects unsupported domains and POST", async () => {
    expect(
      (
        await request(app())
          .get("/api/browse")
          .query({ url: "https://web.whatsapp.com" })
      ).status,
    ).toBe(403);
    expect(
      (await request(app()).post("/api/browse").send({ password: "x" })).status,
    ).toBe(405);
  });
  it("rejects HTML served as a resource", async () => {
    const r = await request(app())
      .get("/api/resource")
      .query({ url: "https://example.com/" });
    expect(r.status).toBe(415);
  });
  it("does not cache cookie-bearing or private resources", async () => {
    const engine = createEngine({ resolve: dns, transport: fixture });
    await engine.resource("https://example.com/private.css");
    expect(engine.cacheSize()).toBe(0);
    await engine.resource("https://example.com/public.css");
    expect(engine.cacheSize()).toBe(1);
  });
  it("returns health and compatibility metadata", async () => {
    expect((await request(app()).get("/api/health")).body.ok).toBe(true);
    expect(
      (await request(app()).get("/api/config")).body.allowedDomains,
    ).toContain("example.com");
  });
});
it("bounds stalled DNS and releases the concurrency slot", async () => {
  let stalled = true;
  const engine = createEngine({
    resolve: async () => (stalled ? new Promise(() => {}) : dns()),
    transport: fixture,
    timeoutMs: 30,
  });
  const result = await Promise.race([
    engine.browse("https://example.com/").then(
      () => "unexpected success",
      () => "bounded rejection",
    ),
    new Promise((r) => setTimeout(() => r("still pending"), 100)),
  ]);
  expect(result).toBe("bounded rejection");
  stalled = false;
  expect((await engine.browse("https://example.com/")).title).toBe("Fixture");
});
