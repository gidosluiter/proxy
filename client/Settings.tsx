import { STATIC_HOST } from "./routing";
import { Moon, Sun, ShieldCheck, Trash2, ArrowUpRight } from "lucide-react";
import { APPROVED } from "./destinations";
import type { Preferences } from "./storage";
export function Settings({
  preferences,
  setPreferences,
}: {
  preferences: Preferences;
  setPreferences: (fn: (p: Preferences) => Preferences) => void;
}) {
  return (
    <div className="dashboard settings">
      <section className="collection-hero">
        <div className="eyebrow">MAKE YOURSELF AT HOME</div>
        <h1>Your flow, your way.</h1>
        <p>A few small choices to make browsing feel right.</p>
      </section>
      <section className="settings-panel">
        <h2>Appearance</h2>
        <div className="theme-options">
          <button
            className={preferences.theme === "dark" ? "selected" : ""}
            aria-label="Dark theme"
            onClick={() => setPreferences((p) => ({ ...p, theme: "dark" }))}
          >
            <Moon /> Dark
          </button>
          <button
            className={preferences.theme === "light" ? "selected" : ""}
            aria-label="Light theme"
            onClick={() => setPreferences((p) => ({ ...p, theme: "light" }))}
          >
            <Sun /> Light
          </button>
        </div>
        <label className="setting-row">
          <span>
            <strong>Reduce motion</strong>
            <small>Keep transitions and animations to a minimum.</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.reducedMotion}
            onChange={(e) =>
              setPreferences((p) => ({ ...p, reducedMotion: e.target.checked }))
            }
          />
        </label>
      </section>
      <section className="settings-panel">
        <h2>Local history</h2>
        <label className="setting-row">
          <span>
            <strong>Remember public pages</strong>
            <small>Save up to 20 recent destinations on this device.</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.rememberHistory}
            onChange={(e) =>
              setPreferences((p) => ({
                ...p,
                rememberHistory: e.target.checked,
                recent: e.target.checked ? p.recent : [],
              }))
            }
          />
        </label>
        <button
          className="secondary-button"
          onClick={() => setPreferences((p) => ({ ...p, recent: [] }))}
        >
          <Trash2 size={15} /> Clear browsing history
        </button>
      </section>
      <section className="settings-panel">
        <h2>
          <ShieldCheck size={19} /> An honest proxy
        </h2>
        {STATIC_HOST && (
          <p>
            <strong>GitHub Pages edition:</strong> this website hosts the
            dashboard and opens destinations directly. GitHub Pages cannot run
            the Node proxy backend. Deploy the full Node application to enable
            public-page proxy browsing.
          </p>
        )}
        <p>
          {STATIC_HOST
            ? "In the full Node deployment, FlowProxy fetches public pages on the server, rewrites links and"
            : "FlowProxy fetches public pages on the server, rewrites links and"}
          assets, and removes scripts and forms. It is a reading proxy, not a
          full browser or an anonymity service. Websites still receive requests
          from the server.
        </p>
        <p>
          Sign-in, CAPTCHA, uploads, live chat, streaming media, service workers
          and DRM require direct access. Social shortcuts open their official
          sites in a new tab. Some public pages may look simpler or block proxy
          traffic.
        </p>
        <h3>
          {STATIC_HOST
            ? "Full Node deployment: approved proxy domains"
            : "Approved public domains"}
        </h3>
        <div className="domain-list">
          {APPROVED.map((x) => (
            <code key={x}>{x}</code>
          ))}
        </div>
        <p className="form-note">
          {STATIC_HOST
            ? "These restrictions apply to the Node proxy. On this GitHub Pages site, custom shortcuts open directly."
            : "Custom shortcuts do not expand the server allowlist. New destinations require an administrator to update the server policy."}
        </p>
        <a
          className="text-button"
          href="https://github.com/gidosluiter/proxy"
          target="_blank"
          rel="noopener noreferrer"
        >
          View the source <ArrowUpRight size={14} />
        </a>
      </section>
    </div>
  );
}
