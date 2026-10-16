/** Recovery redirects must remain on this app, never another shared-host app. */
export function isAllowedRecoveryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const allowedOrigins = new Set([
      "http://localhost:8080",
      "https://jarvisprocessos.lovable.app",
      "https://id-preview--c5c75c62-6ee2-440a-a6d0-7d3597001f90.lovable.app",
    ]);
    return allowedOrigins.has(url.origin) && url.pathname === "/auth" &&
      !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}