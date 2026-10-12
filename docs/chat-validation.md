# FlowChat validation

Validated in Codex Cloud on 12 October 2026. This evidence distinguishes the real model from deterministic worker fixtures and from website publication.

## Automated checks

- `npm test`: 57 unit/integration tests, including retained proxy policy/HTTP tests, bounded chat restoration/context, worker cancellation/crash recovery and actual Vite legacy history fallback.
- Normal production build: strict TypeScript, multipage Vite client, worker and Node server succeeded.
- Normal desktop/mobile browser suite: 28 checks passed at 1440×900 and 390×844. Includes 14 retained proxy checks, chat streaming/persistence, stop/stale responses, retry without duplicate questions, safe Markdown without image fetching, rename/delete, themes, keyboard focus and cross-tab history synchronization.
- Pages tests build and serve only static files under `/proxy/` with no backend or route fallback. All 20 checks passed across desktop and mobile after the review fixes.
- Dependency audit after upgrading Transformers.js to 4.3.1: zero known advisories, including development dependencies.

The deterministic chat browser tests replace only the model worker response through Playwright test routing. There is no fixture engine, canned answer or testing flag in the application. These tests establish UI/protocol behavior; they do not establish model quality or third-party availability.

## Real browser inference

The model was downloaded using verified TLS from the immutable revision `22942cb7d7ba4cc81bb4673549ca4d4614469b5e`. Its q8 ONNX file is 512,096,557 bytes; SHA-256 `41834041ab1b29eff9fc592f1a29a1844133aea35832ea9fa91682be13016100` matched the upstream LFS digest. Tokenizer and metadata were fetched from that same revision.

`scripts/verify-ai.mjs` used the actual built production worker, single-threaded WASM and production Express CSP. The downloaded files were seeded into a persistent Chromium model cache through a local test-only file route. No model-output fixture was used. This transport avoids the cloud gateway CA limitation in Chromium without disabling TLS verification. Native Node TLS downloaded the upstream files and checked model integrity.

Observed actual outputs:

- `What is 2 + 2? Answer with only the number.` → `$4$`.
- `Hoeveel is 2 plus 2? Geef alleen het getal.` → `$4$` in the same conversation.
- Starting a third generation and pressing Stop terminated it and displayed the stopped state.

An earlier complex system prompt gave an incorrect arithmetic answer, both in browser WASM and native CPU. The final standard assistant prompt passed the two probes. These examples are smoke tests, not a general accuracy guarantee. Small-model answers can still be wrong. Only desktop model inference was exercised; mobile checks cover the UI and protocol, not every device's memory or performance.

The immutable revision is applied to every model loader, including metadata helpers that otherwise requested `main`. The verification uses a persistent browser profile because seeding the large graph in an incognito Cache failed; persistent-cache seeding succeeded. The application treats model caching as best effort, and browser site-data eviction can require another download.

To repeat with already verified files (`config.json`, `generation_config.json`, `tokenizer_config.json`, `tokenizer.json`, `onnx/model_quantized.onnx`):

```sh
npm run build
FLOWCHAT_MODEL_DIR=/path/to/verified/model PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node --import tsx scripts/verify-ai.mjs
```

The verifier checks the graph digest before using it and starts/stops its own local test server. It does not change production routes or disable certificate checks.

## Review regressions

Independent review reproduced cross-tab conversation deletion, legacy nested routes falling into the chat under Vite, and lost keyboard focus when switching from Settings to delete confirmation. Each received a failing regression check before its fix. External-tab edits synchronize history; if another tab edits data while this tab is generating, its generation stops so stale work cannot restore deleted data. This behavior is intentional and disclosed.

## Publication

The repository owner made `gidosluiter/proxy` public. At the latest pre-push check, Pages was not enabled (`GET /pages`: 404). Pages activation by Codex returned 403 with required permissions `pages=write,administration=write`. The workflow is committed; publication is verified separately after push. A successful local or CI build does not establish that the public site is live.
