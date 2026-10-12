# FlowChat design

The user asked to convert the project into a GPT-style website and instructed us to implement it. The default is a free AI-chat website that runs on GitHub Pages, preserving the existing request to test, commit, push and publish. It uses a real open model, not canned replies or an OpenAI-branded model. No account, API key or paid service is required.

## Architecture

React/TypeScript renders a Dutch chat interface with a conversation sidebar, suggestions, Markdown messages, streaming responses, stop/retry, copy, rename/delete, settings, theme and JSON export. A dedicated module worker runs Transformers.js with Qwen2.5-0.5B-Instruct, quantized q4, using single-threaded WebAssembly for compatibility without WebGPU or cross-origin isolation. WASM runtime files are served from the same project path. Model files download from Hugging Face on first use and use the browser cache. Loading is explicit, reports progress and supports retry; no answer is presented before genuine inference occurs.

Conversation state is bounded, validated on restoration and stored on the user's device. Only complete turns enter a bounded model context; interrupted/failed assistant replies are visibly labeled. Stop terminates the worker so even model download or prefill cannot keep the app busy indefinitely. Changing conversation or clearing data cancels active work; stale worker events cannot affect a different conversation. The website explains the model download, local execution, small-model limitations and how to clear browser model storage.

## Existing project

Make FlowChat the root application and retain the existing public reading proxy as a separate legacy `/legacy/` entry with its own tests and documentation. The Node deployment continues serving the real proxy API. The Pages deployment hosts the chat and the explicitly labeled direct-access legacy dashboard. Both use project-relative assets and hash routes. Node CSP permits the exact model hosts, WASM compilation and module workers needed for inference while keeping frames and objects blocked.

## Acceptance

- New chat, streaming, stop, failure/retry, history, rename/delete, themes and export work on desktop and mobile.
- Model weights and runtime are real; perform a separate real-inference check, distinct from deterministic fixture UI tests.
- No keys or transcripts leave the device; remote model download is disclosed.
- All install/build/start/test scripts remain working; backend and legacy navigation remain functional.
- GitHub deployment is attempted only with tested code. Live URL is claimed only after HTTP and asset validation. Pages activation remains an owner setting if integration permissions prevent it.

Implementation is performed inline under the user's authorization to make routine decisions and finish the work, without additional design approval rounds.
