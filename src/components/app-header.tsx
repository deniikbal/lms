import Link from "next/link";

import { MenuPengguna } from "@/components/menu-pengguna";
import { ROLE_HOME, ROLE_LABEL, type Role } from "@/lib/roles";

/**
 * Server component: it receives the already-verified user as a prop, so it never
 * reads the session itself. `MenuPengguna` is the only client island.
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
    <header className="border-b bg-card">
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

        <MenuPengguna
          user={{ name: user.name, email: user.email || user.username || "" }}
          peranLabel={ROLE_LABEL[user.role]}
          beranda={{ href: ROLE_HOME[user.role], label: "Beranda" }}
        />
      </div>
    </header>
  );
}
