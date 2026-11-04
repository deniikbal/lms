"use client";

import { usePathname } from "next/navigation";

import { findSiswaNavItem } from "@/components/admin/nav-config";
import { MenuPengguna } from "@/components/menu-pengguna";
import { Separator } from "@/components/ui/separator";
import { ROLE_LABEL, type Role } from "@/lib/roles";

/** Slim top bar: current section and the signed-in user. */
export function SiswaSiteHeader({
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
  const pathname = usePathname();
  const current = findSiswaNavItem(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
      <span className="text-sm font-medium">{current?.title ?? "Dashboard"}</span>

      <div className="ml-auto flex items-center">
        <MenuPengguna
          user={{ name: user.name, email: user.email || user.username || "" }}
          peranLabel={ROLE_LABEL[user.role]}
          beranda={{ href: "/siswa", label: "Dashboard" }}
        />
      </div>
    </header>
  );
}
