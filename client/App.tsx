import { useEffect, useState } from "react";
import {
  Globe,
  Star,
  Clock,
  Settings as SettingsIcon,
  ArrowUpRight,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  X,
} from "lucide-react";
import { Dashboard } from "./Dashboard";
import { Settings } from "./Settings";
import { Browser } from "./Browser";
import { classify } from "./destinations";
import { STATIC_HOST, readRoute, routeHref, faviconURL } from "./routing";
import { readPreferences, writePreferences, addRecent } from "./storage";
export function App() {
  const [preferences, setPreferences] = useState(readPreferences);
  const [path, setPath] = useState(readRoute(location));
  const [online, setOnline] = useState<boolean | null>(null);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [browserURL, setBrowserURL] = useState<string | null>(() =>
    new URLSearchParams(readRoute(location).split("?")[1] || "").get("url"),
  );
  const section = path.startsWith("/settings")
    ? "settings"
    : path.startsWith("/favorites")
      ? "favorites"
      : path.startsWith("/recent")
        ? "recent"
        : path.startsWith("/browse")
          ? "browse"
          : "home";
  const navigate = (next: string, replace = false) => {
    const href = routeHref(next);
    if (readRoute(location) !== next) {
      if (replace) history.replaceState({}, "", href);
      else history.pushState({}, "", href);
    }
    setPath(next);
    setMenu(false);
  };
  useEffect(() => {
    const pop = () => {
      setPath(readRoute(location));
      const u = new URLSearchParams(
        readRoute(location).split("?")[1] || "",
      ).get("url");
      if (u) setBrowserURL(u);
    };
    window.addEventListener("popstate", pop);
    window.addEventListener("hashchange", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("hashchange", pop);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.motion = preferences.reducedMotion
      ? "reduced"
      : "full";
    if (!writePreferences(preferences))
      setToast(
        "Local storage is unavailable. Preferences work for this visit.",
      );
  }, [preferences]);
  useEffect(() => {
    if (STATIC_HOST) return;
    let disposed = false;
    const check = () =>
      fetch("/api/health")
        .then((r) => {
          if (!disposed) setOnline(r.ok);
        })
        .catch(() => {
          if (!disposed) setOnline(false);
        });
    void check();
    const timer = setInterval(check, 30000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const selector =
          section === "browse"
            ? 'input[aria-label="Browser address"]'
            : 'input[aria-label="Enter a URL or search"]';
        const input = document.querySelector<HTMLInputElement>(selector);
        if (input) {
          input.focus();
          input.select();
        } else {
          navigate("/");
          setTimeout(
            () =>
              document
                .querySelector<HTMLInputElement>(
                  'input[aria-label="Enter a URL or search"]',
                )
                ?.focus(),
            0,
          );
        }
      }
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [section]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const open = (text: string) => {
    try {
      const d = classify(text);
      if (STATIC_HOST || d.mode !== "proxy") {
        window.open(d.url, "_blank", "noopener,noreferrer");
        if (STATIC_HOST && d.mode !== "search")
          setPreferences((p) =>
            addRecent(p, d.url, new URL(d.url).hostname, true),
          );
        setToast(
          d.mode === "search"
            ? "Search results open directly on DuckDuckGo."
            : STATIC_HOST
              ? "Website opened directly. GitHub Pages does not run the proxy backend."
              : "This website opens directly for reliable interactive features.",
        );
        return;
      }
      setBrowserURL(d.url);
      navigate(`/browse?url=${encodeURIComponent(d.url)}`);
    } catch (e) {
      setToast((e as Error).message);
    }
  };
  const nav = [
    { id: "home", path: "/", name: "Overview", icon: Globe },
    { id: "favorites", path: "/favorites", name: "Favorites", icon: Star },
    { id: "recent", path: "/recent", name: "Recently visited", icon: Clock },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <a
          href={routeHref("/")}
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          <img src={faviconURL} alt="" />
          <span>
            Flow<span>Proxy</span>
          </span>
        </a>
        <div className="sidebar-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <a
              key={item.id}
              href={routeHref(item.path)}
              className={`nav-item ${section === item.id ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
              }}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
              {item.id === "favorites" && preferences.favorites.length > 0 && (
                <span className="nav-count">
                  {preferences.favorites.length}
                </span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span className="privacy-icon">
              <ShieldCheck size={20} />
            </span>
            <strong>A simpler way to browse</strong>
            <p>
              {STATIC_HOST
                ? "Your websites, directly."
                : "Public pages through the proxy."}
              <br />
              Your apps, directly.
            </p>
            <a
              href={routeHref("/settings")}
              onClick={(e) => {
                e.preventDefault();
                navigate("/settings");
              }}
            >
              How it works <ArrowUpRight size={13} />
            </a>
          </div>
          <a
            href={routeHref("/settings")}
            className={`nav-item ${section === "settings" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              navigate("/settings");
            }}
          >
            <SettingsIcon size={18} /> Settings
          </a>
          <div className="sidebar-version">
            <img src={faviconURL} alt="" />
            <span>
              FlowProxy <small>v1.0 · Open source</small>
            </span>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMenu((x) => !x)}
            >
              {menu ? (
                <PanelLeftClose size={20} />
              ) : (
                <PanelLeftOpen size={20} />
              )}
            </button>
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>
              {section === "browse"
                ? "Browser"
                : section === "home"
                  ? "Overview"
                  : section === "settings"
                    ? "Settings"
                    : section === "favorites"
                      ? "Favorites"
                      : "Recently visited"}
            </strong>
          </div>
          <div className="topbar-right">
            <span
              className={`connection ${online === true ? "connected" : online === false ? "disconnected" : ""}`}
            >
              <span />
              {STATIC_HOST
                ? "Direct access mode"
                : online === true
                  ? "Proxy online"
                  : online === false
                    ? "Proxy offline"
                    : "Connecting"}
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button"
              aria-label={`Switch to ${preferences.theme === "dark" ? "light" : "dark"} theme`}
              onClick={() =>
                setPreferences((p) => ({
                  ...p,
                  theme: p.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              {preferences.theme === "dark" ? (
                <Sun size={17} />
              ) : (
                <Moon size={17} />
              )}
            </button>
            <a
              className="source-link"
              href="https://github.com/gidosluiter/proxy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source <ArrowUpRight size={13} />
            </a>
          </div>
        </header>
        {section === "settings" ? (
          <Settings preferences={preferences} setPreferences={setPreferences} />
        ) : section !== "browse" ? (
          <Dashboard
            preferences={preferences}
            setPreferences={setPreferences}
            open={open}
            section={section}
            proxyAvailable={!STATIC_HOST}
            onDirectVisited={(item) => {
              if (STATIC_HOST)
                setPreferences((p) => addRecent(p, item.url, item.name, true));
            }}
          />
        ) : null}
        {browserURL && (
          <div hidden={section !== "browse"}>
            <Browser
              url={browserURL}
              onRoute={(u, replace) => {
                setBrowserURL(u);
                navigate(`/browse?url=${encodeURIComponent(u)}`, replace);
              }}
              onHome={() => navigate("/")}
              onVisited={(url, title) =>
                setPreferences((p) => addRecent(p, url, title))
              }
              isFavorite={preferences.favorites.includes(browserURL)}
              onFavorite={(url, title) =>
                setPreferences((p) => {
                  const exists = p.favorites.includes(url);
                  return {
                    ...p,
                    favorites: exists
                      ? p.favorites.filter((id) => id !== url)
                      : [...p.favorites, url],
                    shortcuts: p.shortcuts.some((x) => x.id === url)
                      ? p.shortcuts
                      : [
                          ...p.shortcuts,
                          { id: url, name: title, url, color: "#a996ff" },
                        ],
                  };
                })
              }
            />
          </div>
        )}
        {section === "browse" && !browserURL && (
          <div className="empty-state">
            <h1>Choose somewhere to go</h1>
            <button className="primary-button" onClick={() => navigate("/")}>
              Open your dashboard
            </button>
          </div>
        )}
      </main>
      {toast && (
        <div className="toast" role="status">
          <ShieldCheck size={17} />
          <span>{toast}</span>
          <button aria-label="Dismiss message" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
