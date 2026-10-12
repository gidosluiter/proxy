export const STATIC_HOST = import.meta.env.MODE === "pages";
export function readRoute(
  location: Pick<Location, "pathname" | "search" | "hash">,
  staticHost = STATIC_HOST,
) {
  return staticHost
    ? location.hash.startsWith("#/")
      ? location.hash.slice(1)
      : "/"
    : (location.pathname.startsWith("/legacy")
        ? location.pathname.slice(7) || "/"
        : location.pathname) + location.search;
}
export function routeHref(
  route: string,
  staticHost = STATIC_HOST,
  base = import.meta.env.BASE_URL + "legacy/",
) {
  return staticHost ? `${base}#${route}` : `${base.replace(/\/$/, "")}${route}`;
}
export const faviconURL = `${import.meta.env.BASE_URL}favicon.svg`;
