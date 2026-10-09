# FlowProxy Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline execution. The user explicitly requests independent decisions and immediate complete implementation.

**Goal:** Ship an honest, polished mini-browser with a working public-document proxy.
**Architecture:** React dashboard/browser, Express API, validated outbound transport and sanitized content rewriting. No upstream script execution or iframe.
**Tech Stack:** Node 24, TypeScript, React, Vite, Express, Undici, Cheerio, sanitize-html, PostCSS, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-10-09-flowproxy-design.md

## Global Constraints

Free/open-source only; no credentials; exact allowlist; no private-network access; no auth forwarding; keep existing work; no worktree in cloud. User authorizes creating source files, installing dependencies, tests, commit and GitHub delivery.

## Review Focus

- Redirect to another hostname or private address: reject before requesting it.
- Malicious HTML/CSS: no script, form, event handler, external request or shell overlay.
- Slow/oversized upstream: bounded error and useful retry/direct fallback.
- Malformed stored preferences: recover defaults without losing working navigation.
- Tabs/back navigation/mobile: maintain the correct URL and visible controls.

### Task 1: Secure proxy

**Files:** package/config files; server/{policy,transport,rewrite,proxy,app,index}.ts; tests/{policy,rewrite,proxy}.test.ts.
**Interfaces:** createApp(engine?) returns Express; engine.browse(url) returns {url,title,html}; engine.resource(url) returns a validated resource; validateDestination(url, resolver) returns public destination.

- [x] Write policy, rewriting and HTTP behavior tests. Run `npm test` and observe missing behavior failures.
- [x] Implement domain/IP validation, pinned transport, redirect/size/time budgets, safe static cache and sanitized HTML/CSS.
- [x] Run `npm test`; expect all backend tests passing. Commit backend.

### Task 2: Dashboard and browser

**Files:** client/{App,Browser,Dashboard,Settings,storage,destinations}.tsx/ts, styles.css; tests/{destinations,storage}.test.ts; tests/e2e/app.spec.ts.
**Interfaces:** normalized destinations classify as proxy/direct/search; local preference schema; /api/config and /api/browse.

- [x] Write URL/storage tests and browser acceptance checks; observe failing tests before UI implementation.
- [x] Implement responsive sidebar, shortcuts/favorites/recent/custom creation, theme/motion/settings, connection status, tabs, back/forward/reload, Shadow DOM link interception and error states.
- [x] Run unit suite, strict build and Playwright desktop/mobile navigation checks. Commit frontend.

### Task 3: Validate and deliver

**Files:** README.md, Dockerfile, .dockerignore, .github/workflows/ci.yml; docs/validation.md.

- [x] Start production server and request real allowlisted pages; record successful and blocked sites individually.
- [x] Run `npm run build`, `npm test`, `npm run test:e2e`, dependency audit and review. Fix material defects with regression tests.
- [x] Save tested cloud install/start instructions and required egress hosts.
- [x] Commit final files, push without force, verify GitHub commit availability.
