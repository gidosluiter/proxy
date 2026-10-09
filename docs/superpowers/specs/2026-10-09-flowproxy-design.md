# FlowProxy design

Build a usable mini-browser from the supplied brief, with a genuine read-only server proxy and honest direct-access social shortcuts. No accounts, paid services, databases, or credentials. Node 24, TypeScript, Express, React/Vite, plain CSS. An existing Codex cloud checkout is already isolated; no worktree is needed.

## Architecture

The dashboard stores only non-sensitive shortcuts, favorites, settings and up to 20 recent public destinations locally. URLs and search queries are normalized; ordinary searches open DuckDuckGo directly. The browser view renders sanitized upstream HTML in an isolated Shadow DOM (no iframe). Application routes, back/forward, refresh, editable URL bar and tabs remain React controls. Links inside the page navigate through the proxy when allowlisted, otherwise use an explicitly marked direct destination. Proxy navigation never executes upstream scripts or submits forms. This deliberately supports public reading pages, not general application emulation.

The backend accepts GET/HEAD only. It allowlists exact public hostnames, restricts schemes and ports, blocks credentials, resolves all DNS records and denies any non-public IP. Direct connections pin DNS results for TLS/HTTP; a configured HTTPS egress proxy is a trusted infrastructure boundary and performs final DNS/connect policy enforcement. Each redirect is revalidated. Requests never forward cookies, authorization, browser IP or user headers. Response cookies are discarded. Time, size and concurrency budgets constrain downloads. HTML and CSS are rewritten and sanitized; images/fonts stream with limits. Only small public static assets without Set-Cookie, private/no-store, Vary or query strings can enter a bounded cache. HTML and errors are never shared-cached. Rate limits are applied without trusting spoofed forwarding headers.

## Compatibility

Example.com, CERN's first website, W3C public pages, Wikipedia and MDN are initial reading destinations; availability must be reported per live check. GitHub public HTML is also permitted for cloud validation. Snapchat, WhatsApp, TikTok, Instagram, YouTube, Discord, Reddit, X, Twitch and Spotify use direct access because their interactive/login/media behavior is outside this proxy's supported model. Authentication, CAPTCHA, WebSockets, service workers, DRM and uploads are unsupported. Nothing claims to bypass access controls or provide anonymity.

## Validation and delivery

Tests cover URL classification, SSRF addresses and DNS, rewritten links/assets/CSS, redirects and limits, untrusted markup, cache privacy, unsupported-site fallbacks, persistence and keyboard interaction. HTTP integration uses a controlled transport fixture; a separate live smoke test uses actual public sites and distinguishes egress denial from application defects. Playwright exercises real dashboard/browser navigation, settings, mobile layout, and errors. Build includes strict TypeScript. Document production deployment using a Node container and TLS reverse proxy, keep the allowlist explicit, and avoid open-proxy deployment. Commit and push using the existing authorized GitHub route; do not force-push or overwrite remote work.
