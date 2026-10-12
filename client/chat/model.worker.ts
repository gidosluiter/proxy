import {
  env,
  pipeline,
  TextStreamer,
  type TextGenerationPipeline,
} from "@huggingface/transformers";
import type { ModelMessage } from "./state";
import type { EngineEvent } from "./engine";
env.allowLocalModels = false;
if (!env.backends.onnx.wasm)
  throw new Error("WebAssembly is niet beschikbaar in deze browser.");
env.backends.onnx.wasm.numThreads = 1;
const runtime = new URL(
  import.meta.env.BASE_URL + "runtime/",
  self.location.origin,
);
const suffix =
  /Safari/.test(navigator.userAgent) &&
  !/Chrome|Chromium|Android/.test(navigator.userAgent)
    ? ""
    : ".asyncify";
env.backends.onnx.wasm.wasmPaths = {
  mjs: new URL(`ort-wasm-simd-threaded${suffix}.mjs`, runtime).href,
  wasm: new URL(`ort-wasm-simd-threaded${suffix}.wasm`, runtime).href,
};
env.useWasmCache = false; // Same-origin HTTP caching; no blob module or CDN runtime required.
const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const REVISION = "22942cb7d7ba4cc81bb4673549ca4d4614469b5e";
// Apply the immutable revision to every loader, including tokenizer metadata helpers.
env.remotePathTemplate = `{model}/resolve/${REVISION}/`;
let generator: TextGenerationPipeline | null = null,
  busy = false;
const send = (event: EngineEvent) => self.postMessage(event);
self.onmessage = async (
  event: MessageEvent<{
    type: "load" | "generate";
    id: string;
    messages?: ModelMessage[];
  }>,
) => {
  if (busy) return;
  busy = true;
  const { id, type, messages } = event.data;
  try {
    if (!generator)
      generator = await pipeline("text-generation", MODEL, {
        revision: REVISION,
        dtype: "q8",
        device: "wasm",
        progress_callback: (progress) => {
          if (progress.status === "progress")
            send({
              type: "progress",
              id,
              text: "Model downloaden",
              progress: Math.round(progress.progress || 0),
            });
          else if (progress.status === "initiate")
            send({ type: "progress", id, text: "Model ophalen" });
          else if (progress.status === "done")
            send({ type: "progress", id, text: "Model voorbereiden" });
        },
      });
    send({ type: "ready", id });
    if (type === "generate" && messages?.length) {
      let text = "";
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (token) => {
          text += token;
          send({ type: "token", id, text: token });
        },
      });
      await generator(
        [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          ...messages,
        ],
        {
          max_new_tokens: 192,
          do_sample: false,
          streamer,
        },
      );
      if (!text.trim())
        throw new Error(
          "Het model gaf geen antwoord. Probeer je vraag anders te formuleren.",
        );
      send({ type: "done", id });
    }
  } catch (error) {
    send({
      type: "error",
      id,
      text:
        error instanceof Error ? error.message : "Het model kon niet starten.",
    });
    generator = null;
  } finally {
    busy = false;
  }
};
