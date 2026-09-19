const BASE = import.meta.env.BASE_URL;

export function appUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (BASE !== "/" && path.startsWith(BASE)) return path;
  return `${BASE}${path.slice(1)}`;
}

export function appPath(path = globalThis.location.pathname): string {
  const relative =
    BASE !== "/" && path.startsWith(BASE)
      ? `/${path.slice(BASE.length)}`
      : path === BASE.slice(0, -1)
        ? "/"
        : path;
  return relative.length > 1 ? relative.replace(/\/$/, "") : relative;
}
