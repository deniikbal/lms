import Link from "next/link";

import { RoleBadge } from "@/components/role-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { ROLE_HOME, type Role } from "@/lib/roles";

/**
 * Server component: it receives the already-verified user as a prop, so it never
 * reads the session itself. `SignOutButton` is the only client island.
 */
export function AppHeader({
  user,
}: {
  user: {
    name: string;
    email: string;
    role: Role;
    /** Students sign in with their NISN and may have no email on file. */
    username?: string | null;
  };
}) {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={ROLE_HOME[user.role]}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            L
          </span>
          LMS Sekolah
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-tight font-medium text-foreground">
              {user.name}
            </p>
            <p className="text-xs leading-tight text-muted-foreground">
              {user.email || user.username || "—"}
            </p>
          </div>
          <RoleBadge role={user.role} />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
