import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/browse?**", async (route) => {
    const u = new URL(route.request().url()).searchParams.get("url")!;
    if (u.includes("/fail"))
      return route.fulfill({
        status: 502,
        json: { error: "The website took too long to respond." },
      });
    return route.fulfill({
      json: {
        url: u,
        title: u.includes("/next") ? "Next page" : "Example Domain",
        html: `<div class="fp-document"><h1>${u.includes("/next") ? "Next page" : "Example Domain"}</h1><a href="/browse?url=${encodeURIComponent("https://example.com/next")}">Next document</a><a data-direct="true" href="https://web.whatsapp.com/">Direct chat</a></div>`,
      },
    });
  });
});
test("dashboard, proxy navigation, tabs and browser controls work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your internet. In flow." }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Enter a URL or search" })
    .fill("example.com");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(
    page
      .locator("public-document")
      .getByRole("heading", { name: "Example Domain" }),
  ).toBeVisible();
  await page
    .locator("public-document")
    .getByRole("link", { name: "Next document" })
    .click();
  await expect(
    page.locator("public-document").getByRole("heading", { name: "Next page" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page
      .locator("public-document")
      .getByRole("heading", { name: "Example Domain" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(
    page.locator("public-document").getByRole("heading", { name: "Next page" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reload", exact: true }).click();
  await expect(
    page.locator("public-document").getByRole("heading", { name: "Next page" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New tab", exact: true }).click();
  await expect(page.getByRole("tab")).toHaveCount(2);
  await page.getByRole("button", { name: "Browser home" }).click();
  await expect(
    page.getByRole("heading", { name: "Your internet. In flow." }),
  ).toBeVisible();
});
test("social links are honest and custom shortcuts persist", async ({
  page,
}) => {
  await page.goto("/");
  const chat = page.getByRole("link", {
    name: "Open WhatsApp directly",
    exact: true,
  });
  await expect(chat).toHaveAttribute("href", "https://web.whatsapp.com/");
  await expect(chat).toHaveAttribute("target", "_blank");
  await page.getByRole("button", { name: "Add shortcut", exact: true }).click();
  await page.getByLabel("Shortcut name").fill("My docs");
  await page.getByLabel("Shortcut URL").fill("https://example.com/docs");
  await page
    .getByRole("button", { name: "Save shortcut", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Browse My docs" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Browse My docs" }),
  ).toBeVisible();
});
test("settings, error fallback and mobile layout work", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Light theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Reduce motion").check();
  await page.reload();
  await expect(page.getByLabel("Reduce motion")).toBeChecked();
  await page.goto(
    "/browse?url=" + encodeURIComponent("https://example.com/fail"),
  );
  await expect(
    page.getByRole("heading", { name: "This page needs another route" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open website directly", exact: true }),
  ).toHaveAttribute("href", "https://example.com/fail");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("long public documents can scroll to the bottom", async ({ page }) => {
  await page.route("**/api/browse?**", (route) =>
    route.fulfill({
      json: {
        url: "https://example.com/",
        title: "Tall page",
        html:
          '<div class="fp-document">' +
          Array.from({ length: 100 }, (_, i) => `<p>Paragraph ${i}</p>`).join(
            "",
          ) +
          '<a href="#top">Document bottom</a></div>',
      },
    }),
  );
  await page.goto("/browse?url=" + encodeURIComponent("https://example.com/"));
  const bottom = page
    .locator("public-document")
    .getByRole("link", { name: "Document bottom" });
  await bottom.scrollIntoViewIfNeeded();
  await expect(bottom).toBeInViewport();
});
test("redirects synchronize address, route and favorite state without extra requests", async ({
  page,
}) => {
  let count = 0;
  await page.route("**/api/browse?**", (route) => {
    count++;
    return route.fulfill({
      json: {
        url: "https://example.com/final",
        title: "Final document",
        html: '<div class="fp-document"><h1>Final document</h1></div>',
      },
    });
  });
  await page.goto(
    "/browse?url=" + encodeURIComponent("https://example.com/redirect"),
  );
  await expect(
    page
      .locator("public-document")
      .getByRole("heading", { name: "Final document" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/url=https%3A%2F%2Fexample.com%2Ffinal/);
  await expect(page.getByLabel("Browser address")).toHaveValue(
    "https://example.com/final",
  );
  expect(count).toBe(1);
  await page
    .getByRole("button", { name: "Favorite current page", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Favorite current page", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("favoriting a recent public page keeps it available in Favorites", async ({
  page,
}) => {
  await page.goto("/browse?url=" + encodeURIComponent("https://example.com/"));
  await expect(
    page
      .locator("public-document")
      .getByRole("heading", { name: "Example Domain" }),
  ).toBeVisible();
  await page.goto("/recent");
  await page
    .getByRole("button", { name: "Favorite Example Domain", exact: true })
    .click();
  await page.goto("/favorites");
  await expect(
    page.getByRole("button", { name: "Browse Example Domain", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Browse Example Domain", exact: true }),
  ).toBeVisible();
});
test("editing the address preserves the current document state", async ({
  page,
}) => {
  await page.route("**/api/browse?**", (route) =>
    route.fulfill({
      json: {
        url: "https://example.com/",
        title: "Details",
        html: '<div class="fp-document"><details><summary>More information</summary>Details remain expanded</details></div>',
      },
    }),
  );
  await page.goto("/browse?url=" + encodeURIComponent("https://example.com/"));
  await page.locator("public-document").getByText("More information").click();
  await page.getByLabel("Browser address").fill("https://example.com/next");
  await expect(
    page.locator("public-document").locator("details"),
  ).toHaveAttribute("open", "");
});
