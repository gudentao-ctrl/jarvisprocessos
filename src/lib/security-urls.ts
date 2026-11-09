/** Recovery redirects must remain on this app, never another shared-host app. */
function isAllowedAppUrl(value: string, pathname: string, allowRecoverySearch: boolean = false): boolean {
  try {
    const url = new URL(value);
    const allowedOrigins = new Set([
      "http://localhost:8080",
      "http://localhost:3000",
      "http://localhost:5173",
      "https://jarvisprocessos.lovable.app",
      "https://id-preview--c5c75c62-6ee2-440a-a6d0-7d3597001f90.lovable.app",
    ]);
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const originAllowed =
      allowedOrigins.has(url.origin) ||
      isLocalhost ||
      url.hostname.endsWith(".lovable.app") ||
      url.hostname.endsWith(".lovableproject.com");

    const searchAllowed = allowRecoverySearch
      ? !url.search || url.search === "?recovery=true"
      : !url.search;

    return (
      originAllowed &&
      url.pathname === pathname &&
      !url.username &&
      !url.password &&
      searchAllowed &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function isAllowedRecoveryUrl(value: string): boolean {
  return isAllowedAppUrl(value, "/auth", true);
}

export function isAllowedGoogleCallbackUrl(value: string): boolean {
  return isAllowedAppUrl(value, "/google-callback");
}
