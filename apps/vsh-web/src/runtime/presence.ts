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
