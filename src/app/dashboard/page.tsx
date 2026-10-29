import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoadingPanel } from "@/components/loading-panel";
import { homeForRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";

/**
 * Single entry point after login: sends each role to its own dashboard.
 * The session read sits behind <Suspense> because Cache Components forbids
 * request data in the static shell.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingPanel varian="papan" />}>
      <RoleRouter />
    </Suspense>
  );
}

async function RoleRouter() {
  const user = await requireUser();
  redirect(homeForRole(user.role));
  // `redirect()` throws, so this is never reached — it only satisfies the type.
  return null;
}
