export type AppEvent = "unauthorized" | "data" | "socket";
const listeners = new Map<AppEvent, Set<() => void>>();
export function onEvent(event: AppEvent, callback: () => void): () => void {
  const set = listeners.get(event) ?? new Set();
  set.add(callback);
  listeners.set(event, set);
  return () => {
    set.delete(callback);
  };
}
export function emitEvent(event: AppEvent): void {
  listeners.get(event)?.forEach((listener) => listener());
}
