"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavFor } from "@/components/admin/nav-config";
import type { Jenjang } from "@/lib/kelas-shared";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

/** Persistent admin navigation. Collapses to an icon rail on desktop. */
export function AppSidebar({ jenjang }: { jenjang: Jenjang }) {
  const pathname = usePathname();
  // Jurusan drops out of the menu for SD/SMP — the level has no majors.
  const nav = adminNavFor(jenjang);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                L
              </span>
              <span className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">LMS Sekolah</span>
                <span className="text-xs text-muted-foreground">
                  Panel Admin
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
