import { classify, type Destination } from "./destinations";
export type Preferences = {
  theme: "dark" | "light";
  reducedMotion: boolean;
  rememberHistory: boolean;
  favorites: string[];
  shortcuts: Destination[];
  recent: Destination[];
};
function sensitiveParameters(target: URL) {
  const sensitive = (key: string) =>
    /password|token|secret|session|auth|code|key/i.test(key);
  if ([...target.searchParams.keys()].some(sensitive)) return true;
  const hash = decodeURIComponent(target.hash.slice(1));
  const parameters = hash.includes("?")
    ? hash.slice(hash.indexOf("?") + 1)
    : hash;
  return (
    parameters.includes("=") &&
    [...new URLSearchParams(parameters).keys()].some(sensitive)
  );
}
export const STORAGE_KEY = "flowproxy.preferences.v1";
export const DEFAULTS: Preferences = {
  theme: "dark",
  reducedMotion: false,
  rememberHistory: true,
  favorites: [],
  shortcuts: [],
  recent: [],
};
function entries(value: unknown): Destination[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).flatMap((x) => {
    try {
      if (
        !x ||
        typeof x.id !== "string" ||
        x.id.length > 2048 ||
        typeof x.name !== "string" ||
        typeof x.url !== "string"
      )
        return [];
      const d = classify(x.url);
      if (d.mode === "search" || sensitiveParameters(new URL(d.url))) return [];
      return [
        { id: x.id, name: x.name.slice(0, 60), url: d.url, color: "#a996ff" },
      ];
    } catch {
      return [];
    }
  });
}
export function parsePreferences(raw: string | null): Preferences {
  try {
    const x = JSON.parse(raw || "{}");
    return {
      theme: x.theme === "light" ? "light" : "dark",
      reducedMotion: x.reducedMotion === true,
      rememberHistory: x.rememberHistory !== false,
      favorites: Array.isArray(x.favorites)
        ? x.favorites
            .filter((id: unknown) => typeof id === "string")
            .slice(0, 50)
        : [],
      shortcuts: entries(x.shortcuts),
      recent: entries(x.recent).slice(0, 20),
    };
  } catch {
    return { ...DEFAULTS };
  }
}
export function addRecent(
  p: Preferences,
  url: string,
  name: string,
  includeDirect = false,
): Preferences {
  try {
    const destination = classify(url);
    const target = new URL(destination.url);
    const fragment = decodeURIComponent(target.hash.slice(1));
    if (
      !p.rememberHistory ||
      sensitiveParameters(target) ||
      /(?:^|\/)(?:login|logout|signin|signup|sign-in|auth|oauth|account|session)(?:\/|$|\?)/i.test(
        fragment,
      ) ||
      destination.mode === "search" ||
      (!includeDirect && destination.mode !== "proxy") ||
      /(?:^|\/)(?:login|logout|signin|signup|sign-in|auth|oauth|account|session)(?:\/|$|\?)/i.test(
        decodeURIComponent(target.pathname),
      ) ||
      [...target.searchParams.keys()].some((k) =>
        /password|token|secret|session|auth|code|key/i.test(k),
      )
    )
      return p;
    const id = url;
    return {
      ...p,
      recent: [
        { id, name: name.slice(0, 60), url, color: "#a996ff" },
        ...p.recent.filter((x) => x.url !== url),
      ].slice(0, 20),
    };
  } catch {
    return p;
  }
}
export function readPreferences() {
  try {
    return parsePreferences(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...DEFAULTS };
  }
}
export function writePreferences(p: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
