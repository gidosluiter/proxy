import { describe, expect, it } from "vitest";
import { isPublicAddress, validateDestination } from "../server/policy";
const publicDNS = async () => [{ address: "93.184.216.34", family: 4 }];
describe("destination policy", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "172.16.0.1",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
  ])("blocks nonpublic %s", (ip) => expect(isPublicAddress(ip)).toBe(false));
  it.each(["93.184.216.34", "2606:4700:4700::1111"])("allows public %s", (ip) =>
    expect(isPublicAddress(ip)).toBe(true),
  );
  it.each([
    "http://127.0.0.1",
    "https://example.com.evil.test",
    "file:///etc/passwd",
    "https://user:pass@example.com",
    "https://example.com:8443",
    "https://example.com/login",
    "https://example.com/?token=secret",
  ])(
    "rejects unsafe %s",
    async (u) =>
      await expect(validateDestination(u, publicDNS)).rejects.toThrow(),
  );
  it("rejects mixed public/private DNS answers", async () =>
    await expect(
      validateDestination("https://example.com", async () => [
        ...(await publicDNS()),
        { address: "10.0.0.1", family: 4 },
      ]),
    ).rejects.toThrow(/private|public/i));
  it("returns a normalized URL and pinned address", async () => {
    const d = await validateDestination("https://example.com/a#b", publicDNS);
    expect(d.url.href).toBe("https://example.com/a");
    expect(d.address).toBe("93.184.216.34");
  });
});
