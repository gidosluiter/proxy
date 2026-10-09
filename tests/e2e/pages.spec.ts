import { test, expect } from "@playwright/test";
test("Pages assets, hash navigation and preferences survive reload", async ({
  page,
}) => {
  const api: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.includes("/api/")) api.push(r.url());
  });
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Your internet. In flow." }),
  ).toBeVisible();
  await expect(
    page.getByText("Direct access mode", { exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".brand img")
      .evaluate((i: HTMLImageElement) => i.naturalWidth),
  ).toBeGreaterThan(0);
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/proxy\/#\/settings$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your flow, your way." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Light theme", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(api).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Pages shortcuts and search use real direct destinations", async ({
  page,
  context,
}) => {
  await context.route("https://example.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Direct destination</h1>",
    }),
  );
  await page.goto("./");
  await page
    .getByRole("combobox", { name: "Enter a URL or search" })
    .fill("example.com");
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  const target = await popup;
  await target.waitForLoadState();
  expect(target.url()).toBe("https://example.com/");
  await expect(
    target.getByRole("heading", { name: "Direct destination" }),
  ).toBeVisible();
  await target.close();
  await expect(
    page.getByRole("link", { name: "Open WhatsApp directly", exact: true }),
  ).toHaveAttribute("href", "https://web.whatsapp.com/");
  await page.getByRole("button", { name: "Add shortcut", exact: true }).click();
  await page.getByLabel("Shortcut name").fill("My example");
  await page.getByLabel("Shortcut URL").fill("https://example.com/");
  await page
    .getByRole("button", { name: "Save shortcut", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open My example directly" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Open My example directly" }),
  ).toHaveAttribute("target", "_blank");
});
test("Pages explains backend limits in dialogs, settings and browser deep links", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Add shortcut", exact: true }).click();
  await expect(
    page.getByText("Approved public domains use the proxy.", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Websites open directly on GitHub Pages.", { exact: true }),
  ).toBeVisible();
  await page.goto("./#/settings");
  await expect(
    page.getByText("GitHub Pages edition:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("In the full Node deployment", { exact: false }),
  ).toBeVisible();
  await page.goto(
    "./#/browse?url=" + encodeURIComponent("https://example.com/"),
  );
  await expect(
    page.getByRole("link", { name: "Open website directly", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Scripts and forms removed", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toHaveCount(0);
});
