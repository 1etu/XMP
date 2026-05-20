const VISITOR_KEY = "vsh.presence.visitor";
let visitorId: string | undefined;

function randomId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function visitor(): string {
  if (visitorId !== undefined) return visitorId;
  try {
    const stored = localStorage.getItem(VISITOR_KEY);
    visitorId =
      stored !== null && /^[a-f0-9-]{36}$/i.test(stored) ? stored : randomId();
    localStorage.setItem(VISITOR_KEY, visitorId);
  } catch {
    visitorId = randomId();
  }
  return visitorId;
}

export function watchPresence(update: (count: number | undefined) => void): () => void {
  let source: EventSource | undefined;
  const connect = (): void => {
    if (source !== undefined || document.visibilityState === "hidden") return;
    source = new EventSource(`/api/presence?visitor=${encodeURIComponent(visitor())}`);
    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const value: unknown = JSON.parse(event.data);
        if (
          typeof value === "object" &&
          value !== null &&
          "count" in value &&
          typeof value.count === "number" &&
          Number.isSafeInteger(value.count) &&
          value.count >= 0
        )
          update(value.count);
      } catch {
        update(undefined);
      }
    };
    source.onerror = () => {
      update(undefined);
    };
  };
  const disconnect = (): void => {
    source?.close();
    source = undefined;
    update(undefined);
  };
  const visibility = (): void => {
    if (document.visibilityState === "hidden") disconnect();
    else connect();
  };
  document.addEventListener("visibilitychange", visibility);
  globalThis.addEventListener("pagehide", disconnect);
  globalThis.addEventListener("pageshow", connect);
  connect();
  return () => {
    source?.close();
    document.removeEventListener("visibilitychange", visibility);
    globalThis.removeEventListener("pagehide", disconnect);
    globalThis.removeEventListener("pageshow", connect);
  };
}
