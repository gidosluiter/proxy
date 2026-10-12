// Optional real-model check. Seed browser cache with TLS-verified local model files;
// inference uses the real production module worker and WASM, never a fixture worker.
import { chromium } from "playwright";
import express from "express";
import { resolve } from "node:path";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { createApp } from "../server/app.ts";
const root = process.env.FLOWCHAT_MODEL_DIR;
if (!root)
  throw new Error(
    "Set FLOWCHAT_MODEL_DIR to the verified Qwen model files. See docs/chat-validation.md.",
  );
const hash = createHash("sha256");
for await (const chunk of createReadStream(
  resolve(root, "onnx/model_quantized.onnx"),
))
  hash.update(chunk);
if (
  hash.digest("hex") !==
  "41834041ab1b29eff9fc592f1a29a1844133aea35832ea9fa91682be13016100"
)
  throw new Error("Model integrity mismatch");
const app = createApp();
app.use("/__verify_model", express.static(resolve(root)));
const server = await new Promise((r) => {
  const s = app.listen(4181, "127.0.0.1", () => r(s));
});
const browser = await chromium.launchPersistentContext(
  "/tmp/flowchat-real-browser",
  {
    viewport: { width: 1440, height: 900 },
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  },
);
try {
  const page = await browser.newPage();
  page.on("console", (m) => {
    if (m.type() === "error")
      console.log(JSON.stringify({ browserError: m.text().slice(0, 500) }));
  });
  page.on("pageerror", (e) =>
    console.log(JSON.stringify({ pageError: e.message.slice(0, 500) })),
  );
  page.on("requestfailed", (r) =>
    console.log(
      JSON.stringify({
        failed: new URL(r.url()).pathname,
        error: r.failure()?.errorText,
      }),
    ),
  );
  await page.goto("http://127.0.0.1:4181/");
  await page.evaluate(() => localStorage.removeItem("flowchat.v1"));
  await page.reload();
  await page.screenshot({ path: "/tmp/flowchat-desktop.png" });
  await page.evaluate(async () => {
    const cache = await caches.open("transformers-cache");
    const base =
      "https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/22942cb7d7ba4cc81bb4673549ca4d4614469b5e/";
    for (const file of [
      "config.json",
      "generation_config.json",
      "tokenizer_config.json",
      "tokenizer.json",
      "onnx/model_quantized.onnx",
    ]) {
      if (await cache.match(base + file)) continue;
      console.log("Seeding " + file);
      const response = await fetch("/__verify_model/" + file);
      if (!response.ok) throw new Error("Cache seed failed");
      await cache.put(base + file, response);
    }
  });
  console.log(JSON.stringify({ cacheSeeded: true }));
  await page
    .getByRole("textbox", { name: "Bericht" })
    .fill("What is 2 + 2? Answer with only the number.");
  await page.getByRole("button", { name: "Bericht verzenden" }).click();
  await page.waitForFunction(
    () =>
      !!document.querySelector("article.assistant .reply-actions") ||
      !!document.querySelector('[role="alert"]'),
    {},
    { timeout: 180000 },
  );
  const alert = page.getByRole("alert");
  if (await alert.count()) throw new Error(await alert.innerText());
  const first = await page
    .locator("article.assistant .markdown")
    .last()
    .innerText();
  if (!/\b4\b/.test(first))
    throw new Error("Unexpected arithmetic answer: " + first);
  console.log(JSON.stringify({ realWasmAnswer: first }));
  await page
    .getByRole("textbox", { name: "Bericht" })
    .fill("Hoeveel is 2 plus 2? Geef alleen het getal.");
  await page.getByRole("button", { name: "Bericht verzenden" }).click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll("article.assistant .reply-actions").length ===
        2 || !!document.querySelector('[role="alert"]'),
    {},
    { timeout: 120000 },
  );
  if (await alert.count()) throw new Error(await alert.innerText());
  const second = await page
    .locator("article.assistant .markdown")
    .last()
    .innerText();
  if (!/\b4\b/.test(second))
    throw new Error("Unexpected Dutch arithmetic answer: " + second);
  console.log(JSON.stringify({ realDutchAnswer: second }));
  await page.screenshot({ path: "/tmp/flowchat-real-chat.png" });
  await page
    .getByRole("textbox", { name: "Bericht" })
    .fill("Schrijf een lang verhaal over een robot.");
  await page.getByRole("button", { name: "Bericht verzenden" }).click();
  await page.getByRole("button", { name: "Genereren stoppen" }).click();
  if (
    !(await page.locator("article.assistant").last().innerText()).includes(
      "Gestopt",
    )
  )
    throw new Error("Stop failed");
  console.log(JSON.stringify({ realStop: true }));
  const mobile = await browser.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("http://127.0.0.1:4181/");
  await mobile.screenshot({ path: "/tmp/flowchat-mobile.png" });
  if (
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    )
  )
    throw new Error("Mobile overflow");
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
