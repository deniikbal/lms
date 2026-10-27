import { Suspense, type ReactNode } from "react";

import { AppSidebar } from "@/components/admin/app-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import { LoadingPanel } from "@/components/loading-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getJenjang } from "@/lib/kelas";
import { requireRole } from "@/lib/session";

/**
 * Admin shell: sidebar + sticky navbar around every /admin route.
 *
 * The role check lives here as well as in each page — the layout is what stops
 * an unauthorised user from seeing the chrome at all, the page guard is what
 * protects the data. `getSessionUser` is memoised per render, so it is one
 * database read either way.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: ReactNode }) {
  // The sidebar needs the school level: majors only exist for SMA/SMK.
  const [user, jenjang] = await Promise.all([
    requireRole("admin"),
    getJenjang(),
  ]);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar jenjang={jenjang} />
        <SidebarInset>
          <SiteHeader user={user} />
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
