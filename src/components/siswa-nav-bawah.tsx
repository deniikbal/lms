"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MenuIcon, MoreHorizontalIcon } from "lucide-react";

import { MenuPengguna } from "@/components/menu-pengguna";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

type NavItemSiswa = {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
};

/** The two student sections, flat — a bottom bar has no room for groups. */
const NAV_BAWAH: NavItemSiswa[] = [
  { title: "Dashboard", href: "/siswa", icon: LayoutDashboard },
  { title: "Ruang Belajar", href: "/siswa/ruang", icon: MoreHorizontalIcon },
];

function aktif(pathname: string, href: string): boolean {
  return (
    pathname === href || (href !== "/siswa" && pathname.startsWith(`${href}/`))
  );
}

/**
 * Student bottom navigation, mobile-app style.
 *
 * The primary entries sit in the bar itself; "Lainnya" opens a sheet with the
 * full menu and the account controls, replacing the old sidebar entirely.
 * Safe-area padding keeps the bar clear of the phone's home indicator.
 */
export function SiswaNavBawah({
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

  return (
    <nav
      aria-label="Navigasi siswa"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-xl items-stretch">
        {NAV_BAWAH.map((item) => {
          const nyala = aktif(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={nyala ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[0.65rem] font-medium transition-colors",
                nyala ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.title}
              <span
                aria-hidden
                className={cn(
                  "h-0.5 w-6 rounded-full",
                  nyala ? "bg-primary" : "bg-transparent",
                )}
              />
            </Link>
          );
        })}

        {/* Everything else lives in the sheet: full menu + account menu. */}
        <Sheet>
          <SheetTrigger
            render={
              <button
                type="button"
                className="flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[0.65rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <MenuIcon className="size-5" />
                Lainnya
                <span aria-hidden className="h-0.5 w-6 rounded-full bg-transparent" />
              </button>
            }
          />
          <SheetContent side="right" className="w-72 justify-between">
            <SheetHeader>
              <SheetTitle>LMS Sekolah</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-1 px-2">
              {NAV_BAWAH.map((item) => {
                const nyala = aktif(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      nyala
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto border-t px-3 py-3">
              <MenuPengguna
                user={{ name: user.name, email: user.email || user.username || "" }}
                peranLabel={ROLE_LABEL[user.role]}
                beranda={{ href: "/siswa", label: "Dashboard" }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

/** Kept for pages that still want to know where the student is. */
export function findCurrentSiswaNav(pathname: string) {
  return NAV_BAWAH.find((item) => aktif(pathname, item.href));
}
