import { Suspense, type ReactNode } from "react";

import { GuruSidebar } from "@/components/guru-sidebar";
import { GuruSiteHeader } from "@/components/guru-site-header";
import { LoadingPanel } from "@/components/loading-panel";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireRole } from "@/lib/session";

/**
 * Guru shell: sidebar + sticky navbar around every /guru route.
 *
 * Mirrors the admin layout but with a smaller nav set — a teacher only needs
 * their own dashboard, the teaching-assignment board, and the schedule.
 */
export default function GuruLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingPanel varian="papan" />}>
      <GuruShell>{children}</GuruShell>
    </Suspense>
  );
}

async function GuruShell({ children }: { children: ReactNode }) {
  const user = await requireRole("guru");

  return (
    <TooltipProvider>
      <SidebarProvider>
        <GuruSidebar />
        <SidebarInset>
          <GuruSiteHeader user={user} />
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
