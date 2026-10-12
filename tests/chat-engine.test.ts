import { expect, it } from "vitest";
import { BrowserEngine, type EngineEvent } from "../client/chat/engine";
class FakeWorker {
  onmessage: ((event: { data: EngineEvent }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  sent: unknown[] = [];
  terminated = false;
  postMessage(value: unknown) {
    this.sent.push(value);
  }
  terminate() {
    this.terminated = true;
  }
  emit(value: EngineEvent) {
    this.onmessage?.({ data: value });
  }
}
it("terminates work on stop and discards late events from the retired worker", () => {
  const workers: FakeWorker[] = [],
    events: EngineEvent[] = [];
  const engine = new BrowserEngine(
    (e) => events.push(e),
    () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    },
  );
  const first = engine.generate([{ role: "user", content: "Hi" }]);
  engine.stop();
  workers[0].emit({ type: "token", id: first, text: "stale" });
  expect(events).toEqual([]);
  expect(workers[0].terminated).toBe(true);
  const second = engine.generate([{ role: "user", content: "New" }]);
  workers[1].emit({ type: "token", id: second, text: "fresh" });
  expect(events.at(-1)?.type).toBe("token");
  engine.dispose();
  expect(workers[1].terminated).toBe(true);
});
it("reports worker crashes and permits a clean retry", () => {
  const workers: FakeWorker[] = [],
    events: EngineEvent[] = [];
  const engine = new BrowserEngine(
    (e) => events.push(e),
    () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    },
  );
  const id = engine.load();
  workers[0].onerror?.({ message: "WASM failed" });
  expect(events.at(-1)).toMatchObject({ type: "error", id });
  engine.load();
  expect(workers).toHaveLength(2);
  expect(workers[0].terminated).toBe(true);
});
