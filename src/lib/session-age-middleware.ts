import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { isSessionExpired, signInTimeFromToken } from "./session-expiry";

/**
 * Server-side half of the 24-hour sign-in limit: refuses server calls made with a token whose
 * sign-in is too old. The token signature itself is still checked by the auth middleware.
 */
export const enforceSessionAge = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const header = getRequestHeader("authorization");
  if (header?.startsWith("Bearer ")) {
    const signedInAt = signInTimeFromToken(header.slice(7));
    if (isSessionExpired(signedInAt, Date.now())) {
      throw new Error("Sessão expirada. Entre novamente.");
    }
  }
  return next();
});
