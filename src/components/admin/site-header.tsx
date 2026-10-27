"use client";

import { usePathname } from "next/navigation";

import { findNavItem } from "@/components/admin/nav-config";
import { RoleBadge } from "@/components/role-badge";
import { SignOutButton } from "@/components/sign-out-button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Role } from "@/lib/roles";

/** Sticky top bar: sidebar toggle, current section, and the signed-in user. */
export function SiteHeader({
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
  const current = findNavItem(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <span className="text-sm font-medium">{current?.title ?? "Dashboard"}</span>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm leading-tight font-medium text-foreground">
            {user.name}
          </p>
          <p className="text-xs leading-tight text-muted-foreground">
            {user.email || user.username || ""}
          </p>
        </div>
        <RoleBadge role={user.role} />
        <SignOutButton />
      </div>
    </header>
  );
}
