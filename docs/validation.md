# Validation evidence

Validated in Codex Cloud on 9 October 2026. Live responses describe this instance and date, not a guarantee of upstream availability.

## Automated checks

- `npm ci --cache /tmp/flowproxy-npm-cache --no-audit --no-fund`: clean frozen-lockfile reinstall succeeded.
- `npm run build`: strict TypeScript, Vite production client and bundled Node backend succeeded.
- `npm test`: 50 tests passed across policy, rewriting, HTTP integration, destinations, preferences and project-path routing.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`: 14 tests passed against the production build, seven each at 1440×900 and 390×844. Includes actual dashboard/browser controls, tabs, custom shortcuts, persistence, theme/motion, friendly errors, tall-document scrolling, redirect/address/favorites synchronization, recent-page favorites and retained document state while editing the address.
- `npm audit`: zero known advisories, including development dependencies, after updating Vitest to 5.0.3.
- `git diff --check`: no whitespace errors.

## GitHub Pages edition

- `npm run build:pages`: strict TypeScript and the static production build succeeded with `/proxy/` asset URLs.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e:pages`: six checks passed across desktop and mobile. The test server serves only static files under `/proxy/`, without an API or route fallback. Hash navigation, reload, theme persistence, direct destination links, custom shortcuts, favicon loading and accurate backend-limit messages were verified.
- The normal Node build and all 14 normal browser tests also passed after the Pages changes.
- Static mode sends no health/proxy API requests. Sensitive query/fragment parameters and login routes are excluded from automatically recorded direct-access history.

Publication requires the repository owner to enable **Settings → Pages → Source: GitHub Actions**. The authenticated Codex integration can push commits and read Actions, but both reading and activating Pages returned HTTP 403, `Resource not accessible by integration`. At validation time, the intended public URL `https://gidosluiter.github.io/proxy/` returned HTTP 404. The repository remains private; a compatible GitHub plan is required for private-repository Pages hosting. A locally tested build is not evidence of a live deployment.

The deterministic browser tests use controlled backend responses; they do not claim to validate third-party uptime. The backend HTTP suite separately runs the actual Express application and proxy engine against a controlled transport. Live checks below use the real outbound transport and upstream servers.

## Live proxy checks

The production server ran with the injected trusted HTTPS egress gateway and TLS verification enabled. Direct DNS is unavailable in this cloud sandbox, so direct-mode IP pinning was tested through the policy and transport configuration rather than claimed as a live-network result here.

| Actual upstream request                                            | Result                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `https://example.com/`                                             | HTTP 200, public document rendered after removing script           |
| `https://info.cern.ch/hypertext/WWW/TheProject.html`               | HTTP 200, original public document                                 |
| `https://www.w3.org/`                                              | HTTP 200, rewritten public HTML                                    |
| `https://en.wikipedia.org/wiki/Main_Page`                          | HTTP 200, sanitized public reading page                            |
| `https://developer.mozilla.org/en-US/docs/Web`                     | HTTP 200, sanitized documentation                                  |
| `https://github.com/`                                              | HTTP 200, public HTML only                                         |
| `https://raw.githubusercontent.com/github/markup/master/README.md` | HTTP 200, escaped plain-text document                              |
| W3C stylesheet via `/api/resource`                                 | HTTP 200, rewritten CSS, 103527 bytes                              |
| W3C image via `/api/resource`                                      | HTTP 200, SVG image, 42416 bytes; sandbox CSP on resource response |

A real Chromium mobile session loaded CERN through the production API and followed its rewritten “What's out there?” link to the public DataSources document. The mobile dashboard had no horizontal document overflow. CERN's plain HTTP request was blocked by this cloud egress route; its supported HTTPS destination is used in the catalog.

## Review

An independent read-only code review found five material issues. Each was reproduced with a failing regression test, corrected and checked in the full suite: clipping of long documents, stale URLs/favorites after redirects, missing favorites from recent history, truncated stable IDs for long URLs, and DNS requests exceeding the timeout. The Shadow DOM now also retains its state when the address is edited.

## Deployment and cloud state

The production Node startup and functional proxy requests were exercised. The non-root container returned a successful health response and proxied the real CERN document (4220 bytes of sanitized HTML). The non-root container was built with the platform's supplied trusted gateway and CA passed only during installation, preserving TLS verification; cloud-specific build helpers stay outside the repository. No proxy credentials or CA material are committed. The committed Dockerfile is the normal host recipe; this cloud sandbox requires its managed egress wiring to download dependencies inside containers.

Cloud install/start instructions and the explicit outbound domain additions are saved as a configuration draft. Saving the draft is separate from publishing a filesystem snapshot. Restoration in a new task and GitHub Actions execution are not claimed as already verified.

## Deliberate limits

Social app shortcuts use direct official destinations. Their authenticated flows were not tested with user accounts. The reading proxy removes scripts/forms and does not support login, CAPTCHA, uploads, WebSockets, service workers, media streaming or DRM. Only allowlisted assets can load; blocked third-party assets can simplify page appearance. No anonymous browsing or access-control bypass is promised.
