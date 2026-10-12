import type { ModelMessage } from "./state";
export type EngineEvent = {
  type: "progress" | "ready" | "token" | "done" | "error";
  id: string;
  text?: string;
  progress?: number;
};
type WorkerLike = {
  onmessage: ((event: { data: EngineEvent }) => void) | null;
  onerror: ((event: { message: string }) => void) | null;
  postMessage: (value: unknown) => void;
  terminate: () => void;
};
export class BrowserEngine {
  private worker: WorkerLike | null = null;
  private current = "";
  constructor(
    private receive: (event: EngineEvent) => void,
    private factory: () => WorkerLike = () =>
      new Worker(new URL("./model.worker.ts", import.meta.url), {
        type: "module",
      }) as unknown as WorkerLike,
  ) {}
  private send(type: "load" | "generate", messages?: ModelMessage[]) {
    if (!this.worker) {
      const worker = this.factory();
      this.worker = worker;
      worker.onmessage = (event) => {
        if (this.worker === worker && event.data.id === this.current)
          this.receive(event.data);
      };
      worker.onerror = (event) => {
        if (this.worker !== worker) return;
        const id = this.current;
        this.stop();
        this.receive({
          type: "error",
          id,
          text: event.message || "De AI-worker kon niet starten.",
        });
      };
    }
    this.current = crypto.randomUUID();
    this.worker.postMessage({ type, id: this.current, messages });
    return this.current;
  }
  load() {
    return this.send("load");
  }
  generate(messages: ModelMessage[]) {
    return this.send("generate", messages);
  }
  stop() {
    this.worker?.terminate();
    this.worker = null;
    this.current = "";
  }
  dispose() {
    this.stop();
  }
}
