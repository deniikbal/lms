"use client";

import { MenuPengguna } from "@/components/menu-pengguna";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ROLE_LABEL, type Role } from "@/lib/roles";

/** Sticky top bar: sidebar toggle, current section, and the signed-in user. */
export function GuruSiteHeader({
  user,
}: {
  user: {
    name: string;
    email: string;
    role: Role;
    username?: string | null;
  };
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <div className="ml-auto">
        <MenuPengguna
          user={{ name: user.name, email: user.email || user.username || "" }}
          peranLabel={ROLE_LABEL[user.role]}
          beranda={{ href: "/guru", label: "Dashboard" }}
        />
      </div>
    </header>
  );
}