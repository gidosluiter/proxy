# FlowProxy

A fast mini-browser with a real server-side **public reading proxy** and honest direct-access shortcuts. React/TypeScript + Vite on the frontend; Express, Undici, Cheerio and sanitized HTML/CSS on the backend. No accounts, database, paid APIs or keys.

## GitHub website

The GitHub Pages edition is built for `https://gidosluiter.github.io/proxy/`. It uses hash navigation so Settings, Favorites and Recent pages survive reload under `/proxy/`. All assets stay inside the project path.

GitHub Pages can only host static files. This edition therefore opens **all websites directly**, labels itself as direct-access mode, and does not send requests to a nonexistent proxy API. Custom shortcuts, favorites, local history, themes and search remain functional. The full Node deployment below still provides the genuine public-page proxy.

The `Deploy GitHub Pages` workflow builds and tests the static edition, uploads the site artifact, and deploys it on pushes to `main`. In GitHub repository **Settings → Pages**, Source must be **GitHub Actions**. Activating this setting requires repository Pages permissions; the Codex integration may not have them. For a private repository, GitHub Pages also requires an eligible GitHub plan. Repository visibility is never changed automatically.

```sh
npm run build:pages
npm run test:e2e:pages
```

The Pages browser tests serve the built site under `/proxy/` with no API and no server-side route fallback, and verify desktop/mobile navigation, asset paths, direct links, shortcuts and persistence.

## Run locally

Use **Node.js 24 or newer**.

```sh
npm ci
npm run dev
```

The Vite frontend runs on port 5173; it sends `/api` requests to the Express backend on port 3000. For production:

```sh
npm run build
npm start
```

The production server serves both the built frontend and API on `PORT` (default 3000). Always run commands from the repository root. `npm install` installs dependencies normally; `npm run install:deps` refreshes them from the frozen lockfile. No global packages are required.

## What actually works

The proxy fetches pages **on the server**, resolves relative URLs, validates each redirect, rewrites links/images/styles/fonts and renders sanitized markup inside a Shadow DOM. There is **no iframe** and browsing is not replaced by a set of bookmarks. Back, forward, refresh, address editing and up to eight browser tabs work within FlowProxy. Tabs are temporary; favorite shortcuts, custom shortcuts, theme, reduced motion and recent public destinations are stored locally.

| Destination                                  | Route         | Verified scope                                             |
| -------------------------------------------- | ------------- | ---------------------------------------------------------- |
| Example.com                                  | Proxy         | Public HTML page and rewritten link                        |
| CERN first website (HTTPS)                   | Proxy         | Public document and internal navigation                    |
| W3C                                          | Proxy         | Public HTML and permitted styles/images                    |
| Wikipedia                                    | Proxy reading | Public articles; dynamic widgets removed                   |
| MDN                                          | Proxy reading | Public documentation; interactive examples removed         |
| GitHub                                       | Proxy reading | Public HTML only; sign-in/editor/actions use direct access |
| Snapchat, WhatsApp, TikTok, Instagram        | Direct        | Official web destinations, new tab                         |
| YouTube, Discord, Reddit, X, Twitch, Spotify | Direct        | Official web destinations, new tab                         |
| Other destinations                           | Direct        | Custom shortcuts cannot expand the server allowlist        |
| Ordinary searches                            | Direct        | DuckDuckGo search results, new tab                         |

Live availability and assets depend on the deployment network and upstream rules. See [validation evidence](docs/validation.md) for the checks actually performed. This is not JavaScript application emulation: upstream scripts, forms, embeds and inline SVG are removed. Logins, cookies, CAPTCHA, uploads, WebSockets, service workers, video/audio streaming and DRM are unsupported. External assets load only from explicitly approved hosts; some pages look simpler. A useful error state offers retry and direct access. No claim is made that the direct social apps' authenticated flows were tested with user accounts.

## Security and privacy

- Exact hostname allowlist in `server/policy.ts`. Only HTTP/HTTPS standard ports, no URL credentials. Authentication paths and sensitive query keys are rejected.
- Direct mode validates **all** DNS answers, rejects non-public IPv4/IPv6 and pins the public address used by the connection while preserving TLS verification. Redirects undergo the same checks; five-hop maximum.
- No cookies, authorization, forwarded browser headers or server secrets sent upstream. Response cookies are discarded. GET/HEAD only; no form submissions or password inputs.
- Sanitized upstream HTML; rewritten CSS; isolated rendering and a restrictive application CSP. Scripts, forms, frames, dangerous schemes and event handlers are removed. Untrusted pages cannot overlay the application controls.
- 15-second network deadline, 3 MiB decompressed response limit, at most 24 simultaneous fetches, 150 API requests per IP/minute. The application does not trust `X-Forwarded-For`; when deployed behind a reverse proxy its rate limit may be shared, which is deliberately conservative.
- Connection pooling, compression and streamed image/font responses. Bounded 8 MiB/64-entry in-memory cache only for small explicitly public static resources without query strings, `Set-Cookie`, `Vary`, private/no-store/no-cache. HTML and user-specific content are never shared-cached.
- No browsing request logs or tracking scripts. Public browsing history stays on your device and can be disabled/cleared. Local storage is not encrypted; avoid sensitive URLs. Your server and network operator can still observe traffic: this is not an anonymity service.

### Managed cloud egress

Codex Cloud may supply an HTTPS egress proxy while direct DNS is unavailable. In that environment only, start with `FLOWPROXY_TRUST_EGRESS=1`; the app uses the injected `HTTPS_PROXY`/`HTTP_PROXY` gateway without printing its value. **That gateway must enforce public-only DNS/connection policy.** Local IP pinning cannot cross a CONNECT gateway; this is an explicit infrastructure trust boundary, not equivalent to direct-mode pinning. Default deployments leave this option unset and use pinned DNS. Never enable it for an untrusted arbitrary proxy. TLS verification remains enabled in both modes.

Required outbound domains: `example.com`, `info.cern.ch`, `www.w3.org`, `w3.org`, `www.wikipedia.org`, `en.wikipedia.org`, `upload.wikimedia.org`, `developer.mozilla.org`, `github.com`, `raw.githubusercontent.com`. Add destinations deliberately on the backend **and** in the frontend catalog; never use a wildcard. Package installation uses the npm registry. Social direct-access links require only the user's browser network.

## Tests and automation

```sh
npm test                 # Vitest policy, rewriting, HTTP integration, preferences
npm run check            # Strict TypeScript
npm run build            # TypeScript + frontend + server build
npx playwright install chromium
npm run test:e2e          # Real desktop/mobile UI, controlled public-page fixture
npm run smoke            # Real upstream checks; requires a running backend
```

To use system Chromium set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. For a server on a different port set `FLOWPROXY_SMOKE_BASE` to its local origin. The live smoke test reports each upstream separately and fails if none load; deterministic CI does not depend on third-party uptime. GitHub Actions installs from the lockfile, builds, runs all unit/integration and desktop/mobile browser tests. Browser fixtures exercise frontend navigation; HTTP tests independently exercise the real backend with controlled upstream responses. Live smoke checks exercise the real outbound transport.

## Deploy

Use a host that runs a persistent Node server, with outbound HTTPS and public DNS. Static-only hosting (such as GitHub Pages) cannot run the backend.

```sh
docker build -t flowproxy .
docker run --rm -p 3000:3000 flowproxy
```

The multi-stage container runs as a non-root user and includes a health check. Alternatively use any Node host with build command `npm ci && npm run build` and start command `npm start`. Put it behind a TLS reverse proxy, preserve the response security headers, and use network-level public-egress restrictions. `/api/health` is the readiness endpoint. Set `PORT`/`HOST` using the host's environment settings; the example file documents options and need not be copied. No production credentials are required. This is a controlled reading service, not an unrestricted public open proxy.

App code is MIT licensed. Open-source dependencies retain their own licenses; brand icons from Simple Icons identify their respective services and do not imply endorsement.
