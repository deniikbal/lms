import { redirect } from "next/navigation";

import { homeForRole } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";

/**
 * Sends already-signed-in visitors straight to their own dashboard.
 *
 * This has to be a real session check, not a cookie check. The proxy can only
 * see that a cookie *exists*, so a cookie that outlived its session (expired,
 * revoked, or the database was reset) would otherwise bounce
 * /login -> /dashboard -> /login forever, one round trip per second.
 *
 * Rendered inside <Suspense> because it reads the request, which Cache
 * Components forbids in the static shell.
 */
export async function RedirectIfSignedIn() {
  const user = await getSessionUser();

  if (user) {
    redirect(homeForRole(user.role));
  }

  return null;
}
