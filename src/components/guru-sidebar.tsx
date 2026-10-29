"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { guruNav, findGuruNavItem } from "@/components/admin/nav-config";
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

/** Persistent guru navigation. Collapses to an icon rail on desktop. */
export function GuruSidebar() {
  const pathname = usePathname();
  const nav = guruNav();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/guru" />}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                L
              </span>
              <span className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">LMS Sekolah</span>
                <span className="text-xs text-muted-foreground">Dashboard Guru</span>
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
                      // A room lives at /guru/ruang/73, so the parent item has
                      // to stay lit while you are inside one.
                      isActive={
                        pathname === item.href ||
                        (item.href !== "/guru" &&
                          pathname.startsWith(`${item.href}/`))
                      }
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

export function findCurrentGuruNav(pathname: string) {
  return findGuruNavItem(pathname);
}