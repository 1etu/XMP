const VISITOR_KEY = "vsh.presence.visitor";
let visitorId: string | undefined;

function randomId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
