import { expect, it } from "vitest";
import { parsePreferences, addRecent, DEFAULTS } from "../client/storage";
it("recovers from malformed or obsolete local preferences", () => {
  expect(parsePreferences("{")).toEqual(DEFAULTS);
  expect(parsePreferences('{"theme":"bad","favorites":"oops"}').theme).toBe(
    "dark",
  );
});
it("retains only valid public shortcut fields", () => {
  const p = parsePreferences(
    JSON.stringify({
      theme: "light",
      shortcuts: [
        { id: "x", name: "Bad", url: "javascript:alert(1)" },
        { id: "ok", name: "Example", url: "https://example.com" },
      ],
    }),
  );
  expect(p.theme).toBe("light");
  expect(p.shortcuts).toHaveLength(1);
});
it("recent history is deduplicated, capped, and excludes sensitive URLs", () => {
  let p = DEFAULTS;
  for (let i = 0; i < 25; i++)
    p = addRecent(p, "https://example.com/" + i, "Page");
  expect(p.recent).toHaveLength(20);
  p = addRecent(p, "https://example.com/24", "Latest");
  expect(p.recent[0].name).toBe("Latest");
  expect(
    addRecent(p, "https://example.com/?token=secret", "Secret").recent,
  ).toEqual(p.recent);
});
it("preserves stable URL shortcut IDs longer than 100 characters", () => {
  const url = "https://example.com/" + "a".repeat(120);
  const p = parsePreferences(
    JSON.stringify({
      ...DEFAULTS,
      favorites: [url],
      shortcuts: [{ id: url, name: "Long URL", url }],
    }),
  );
  expect(p.shortcuts[0].id).toBe(p.favorites[0]);
});
