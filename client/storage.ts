import { classify, type Destination } from "./destinations";
export type Preferences = {
  theme: "dark" | "light";
  reducedMotion: boolean;
  rememberHistory: boolean;
  favorites: string[];
  shortcuts: Destination[];
  recent: Destination[];
};
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
      if (
        d.mode === "search" ||
        /password|token|secret|session|auth/i.test(new URL(d.url).search)
      )
        return [];
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
): Preferences {
  try {
    if (!p.rememberHistory || classify(url).mode !== "proxy") return p;
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
