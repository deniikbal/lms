"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { ChevronDownIcon, LayoutGridIcon, LogOutIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";

/**
 * The signed-in user, as a dropdown.
 *
 * The trigger leads with the avatar, so the account menu is reachable from a
 * single tap on a phone where the name and email are hidden. Keluar lives in the
 * popup: as its own button it competed with the name for space and put an
 * irreversible action a stray click away from the header.
 */
export function MenuPengguna({
  user,
  peranLabel,
  beranda,
}: {
  user: { name: string; email: string };
  peranLabel: string;
  /** Where the popup's one navigation item goes, and what it says. */
  beranda: { href: string; label: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function keluar() {
    setPending(true);
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        className={cn(
          "flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-left transition-colors",
          "hover:bg-muted data-popup-open:bg-muted",
          "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        )}
      >
        <Avatar nama={user.name} />
        <div className="hidden text-left leading-tight sm:block">
          <p className="max-w-[12rem] truncate text-sm font-medium text-foreground">
            {user.name}
          </p>
          <p className="max-w-[12rem] truncate text-xs text-muted-foreground">
            {user.email || peranLabel}
          </p>
        </div>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </MenuPrimitive.Trigger>

      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner align="end" sideOffset={6} className="z-50">
          <MenuPrimitive.Popup
            className={cn(
              "min-w-56 rounded-xl bg-popover p-1 text-popover-foreground ring-1 ring-foreground/10 outline-none",
              "origin-[var(--transform-origin)] duration-100",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            {/* Identity first: the popup answers "which account am I in?" in full. */}
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar nama={user.name} besar />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email || "—"}
                </p>
                <p className="mt-0.5 text-[0.7rem] tracking-wide uppercase text-muted-foreground">
                  {peranLabel}
                </p>
              </div>
            </div>

            <MenuPrimitive.Separator className="my-1 h-px bg-border" />

            {/*
              Only destinations that exist are linked. A "Profil" entry would be
              dead weight today: `show` is false and nothing sets it, so the
              avatar is a monogram and there is no profile page to open.
            */}
            <MenuPrimitive.LinkItem
              render={<Link href={beranda.href} />}
              className={itemClass}
            >
              <LayoutGridIcon className="size-4 text-muted-foreground" />
              {beranda.label}
            </MenuPrimitive.LinkItem>

            <MenuPrimitive.Item
              onClick={keluar}
              closeOnClick={false}
              disabled={pending}
              className={cn(itemClass, "text-destructive data-disabled:opacity-60")}
            >
              <LogOutIcon className="size-4" />
              {pending ? "Keluar…" : "Keluar"}
            </MenuPrimitive.Item>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

const itemClass =
  "flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors data-highlighted:bg-muted";

/** "GM" from "Guru Matematika"; one char when the name is a single word. */
function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "?";
  if (kata.length === 1) return kata[0]!.slice(0, 2).toUpperCase();
  return (kata[0]![0]! + kata[kata.length - 1]![0]!).toUpperCase();
}

/**
 * Initials, not a photo: the `user` table has no image column, and a broken
 * image slot looks worse than a deliberate monogram.
 */
function Avatar({ nama, besar = false }: { nama: string; besar?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary font-medium text-primary-foreground select-none",
        besar ? "size-9 text-xs" : "size-8 text-[0.7rem]",
      )}
    >
      {inisial(nama)}
    </span>
  );
}
