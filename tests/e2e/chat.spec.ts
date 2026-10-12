import { test, expect } from "@playwright/test";
import { fixtureModel, showSidebar } from "./chat-fixture";
test("chat homepage provides a real model start and mobile navigation", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Waar kan ik je mee helpen?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download AI-model" }),
  ).toBeVisible();
  await expect(
    page.getByText("Qwen2.5 · lokaal op je apparaat", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Bericht" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Menu openen" }).click();
  await page.getByRole("button", { name: "Instellingen", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Instellingen" }),
  ).toBeVisible();
  await page
    .getByRole("dialog", { name: "Instellingen" })
    .getByRole("button", { name: "Licht thema" })
    .click();
  await page.getByRole("button", { name: "Instellingen sluiten" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("streamed conversations persist, safe Markdown does not fetch images, and rename/delete work", async ({
  page,
}) => {
  await fixtureModel(page);
  const remote: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("private.png")) remote.push(r.url());
  });
  await page.goto("./");
  await page
    .getByRole("textbox", { name: "Bericht" })
    .fill("Wat is twee plus twee?");
  await page.getByRole("button", { name: "Bericht verzenden" }).click();
  await expect(
    page.getByRole("article", { name: "AI-antwoord" }),
  ).toContainText("Een helder antwoord.");
  await expect(
    page.getByRole("button", { name: "Antwoord opnieuw genereren" }),
  ).toBeEnabled();
  expect(remote).toEqual([]);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => "hacked" in window)).toBe(false);
  await page.reload();
  await expect(
    page.getByRole("article", { name: "AI-antwoord" }),
  ).toContainText("Een helder antwoord.");
  await page.getByRole("button", { name: "Gesprek hernoemen" }).click();
  await page.getByRole("textbox", { name: "Gesprekstitel" }).fill("Mijn idee");
  await page.getByRole("button", { name: "Opslaan", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mijn idee", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Gesprek verwijderen" }).click();
  await page.getByRole("button", { name: "Verwijderen", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Waar kan ik je mee helpen?" }),
  ).toBeVisible();
});
test("stop cancels work and switching chats prevents stale content", async ({
  page,
}) => {
  await fixtureModel(page);
  await page.goto("./");
  await page.getByRole("textbox", { name: "Bericht" }).fill("STOP");
  await page.getByRole("button", { name: "Bericht verzenden" }).click();
  await expect(
    page.getByRole("button", { name: "Genereren stoppen" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Genereren stoppen" }).click();
  await expect(
    page.getByText("Gestopt voordat er een antwoord was."),
  ).toBeVisible();
  await showSidebar(page);
  await page
    .getByRole("button", { name: "Nieuw gesprek", exact: false })
    .click();
  await page.waitForTimeout(3200);
  await expect(page.getByRole("article")).toHaveCount(0);
  await showSidebar(page);
  await page
    .getByRole("navigation", { name: "Gesprekken" })
    .getByRole("button", { name: "STOP" })
    .click();
  await expect(
    page.getByText("Gestopt voordat er een antwoord was."),
  ).toBeVisible();
});
test("model failure has a usable retry without duplicating the question", async ({
  page,
}) => {
  await fixtureModel(page, true);
  await page.goto("./");
  await page.getByRole("textbox", { name: "Bericht" }).fill("Hallo");
  await page.getByRole("button", { name: "Bericht verzenden" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "De AI kon niet antwoorden",
  );
  await page
    .getByRole("button", { name: "Opnieuw proberen", exact: true })
    .click();
  await expect(
    page.getByRole("article", { name: "AI-antwoord" }),
  ).toContainText("Een helder antwoord.");
  await expect(page.getByRole("article", { name: "Jouw bericht" })).toHaveCount(
    1,
  );
});
test("settings trap keyboard focus and corrupted storage recovers", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("flowchat.v1", "broken"));
  await page.goto("./");
  await showSidebar(page);
  await page.getByRole("button", { name: "Instellingen", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Instellingen" });
  await dialog.locator("a").last().focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
test("another tab changing theme cannot erase an existing conversation", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await fixtureModel(page);
  await page.goto("./");
  await other.goto("./");
  await page
    .getByRole("textbox", { name: "Bericht" })
    .fill("Bewaar dit gesprek");
  await page.getByRole("button", { name: "Bericht verzenden" }).click();
  await expect(
    page.getByRole("article", { name: "AI-antwoord" }),
  ).toContainText("Een helder antwoord.");
  await other.getByRole("button", { name: "Licht thema", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("article", { name: "Jouw bericht" }),
  ).toContainText("Bewaar dit gesprek");
});
test("delete-all confirmation keeps keyboard focus when replacing settings", async ({
  page,
}) => {
  await page.goto("./");
  await showSidebar(page);
  await page.getByRole("button", { name: "Instellingen", exact: true }).click();
  await page
    .getByRole("button", { name: "Alles verwijderen", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Verwijderen bevestigen" });
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBe(true);
  await dialog
    .getByRole("button", { name: "Verwijderen", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBe(true);
});
