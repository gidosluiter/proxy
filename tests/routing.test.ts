import { expect, it } from "vitest";
import { readRoute, routeHref } from "../client/routing";
it("uses hash routes under the Pages project path", () => {
  expect(
    readRoute({ pathname: "/proxy/", search: "", hash: "#/settings" }, true),
  ).toBe("/settings");
  expect(routeHref("/favorites", true, "/proxy/")).toBe("/proxy/#/favorites");
});
it("keeps regular server routes and query strings", () => {
  expect(
    readRoute({ pathname: "/browse", search: "?url=public", hash: "" }, false),
  ).toBe("/browse?url=public");
  expect(routeHref("/settings", false, "/")).toBe("/settings");
});
it("uses the dashboard when the static hash is missing or malformed", () => {
  expect(readRoute({ pathname: "/proxy/", search: "", hash: "" }, true)).toBe(
    "/",
  );
  expect(
    readRoute(
      { pathname: "/proxy/", search: "", hash: "#javascript:alert(1)" },
      true,
    ),
  ).toBe("/");
});
