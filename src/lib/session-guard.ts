import { supabase } from "@/integrations/supabase/client";
import { isSessionExpired, signInTimeFromToken } from "./session-expiry";

/** Signs out when the current sign-in is older than the allowed age. Returns true when it did. */
export async function signOutIfSessionExpired(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return false;
  let signedInAt = signInTimeFromToken(session.access_token);
  if (signedInAt == null && session.user?.last_sign_in_at) {
    signedInAt = new Date(session.user.last_sign_in_at).getTime();
  }
  if (!isSessionExpired(signedInAt, Date.now())) return false;
  await supabase.auth.signOut().catch(() => {});
  return true;
}
