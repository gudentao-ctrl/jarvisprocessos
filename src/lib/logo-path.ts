/** Only objects in our private logo bucket may be loaded by the server. */
export function logoObjectPath(value: string, trustedOrigins: string[]): string | null {
  let path = value;
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//")) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password || !trustedOrigins.includes(url.origin)) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/portal-logos\/(.+)$/);
      if (!match) return null;
      path = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  if (!path || path.startsWith("/") || path.includes("\\") || path.includes("%") || /[\u0000-\u001f]/.test(path)) return null;
  if (path.split("/").some((part) => !part || part === "." || part === "..")) return null;
  return path;
}