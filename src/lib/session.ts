import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { homeForRole, toRole, type Role } from "@/lib/roles";

/**
 * The Data Access Layer for auth.
 *
 * Every server-side read of "who is logged in" goes through here, so there is
 * exactly one place that talks to Better Auth and exactly one place that
 * normalises the role. Pages, layouts, server actions and route handlers all use
 * these helpers — never the raw session object.
 */
export type SessionUser = {
  id: string;
  name: string;
  /** Empty string when a student has no email on file. */
  email: string;
  role: Role;
  username: string | null;
  jk: "L" | "P" | null;
  kelasId: number | null;
};

type RawSessionUser = {
  id: string;
  name: string;
  email?: string | null;
  role?: unknown;
  username?: unknown;
  jk?: unknown;
  kelas_id?: unknown;
};

/**
 * Returns the signed-in user, or null. Memoised per render pass with React
 * `cache`, so a page plus its children only hit the session endpoint once.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return null;
  }

  const user = session.user as unknown as RawSessionUser;

  // "Terakhir aktif" is what the admin's keaktifan report reads. Throttled to
  // one write per 15 minutes so browsing does not hammer the table.
  void pool
    .query(
      `update "user" set terakhir_aktif_at = now()
        where id = $1
          and (terakhir_aktif_at is null
               or terakhir_aktif_at < now() - interval '15 minutes')`,
      [user.id],
    )
    .catch(() => {
      /* a failed heartbeat must never break the page */
    });

  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    role: toRole(user.role),
    username: typeof user.username === "string" ? user.username : null,
    jk: user.jk === "L" || user.jk === "P" ? user.jk : null,
    kelasId: typeof user.kelas_id === "number" ? user.kelas_id : null,
  };
});

/** Requires any signed-in user, otherwise redirects to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/**
 * Requires one of the given roles. Signed-out visitors go to /login, signed-in
 * users with the wrong role are bounced to their own dashboard instead of
 * seeing a dead end.
 */
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();

  if (!allowed.includes(user.role)) {
    redirect(homeForRole(user.role));
  }

  return user;
}

/** True when the current visitor holds one of the given roles (for UI only). */
export async function hasRole(...roles: Role[]): Promise<boolean> {
  const user = await getSessionUser();
  return Boolean(user && roles.includes(user.role));
}
