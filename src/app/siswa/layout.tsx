import { Suspense, type ReactNode } from "react";

import { LoadingPanel } from "@/components/loading-panel";
import { SiswaSidebar } from "@/components/siswa-sidebar";
import { SiswaSiteHeader } from "@/components/siswa-site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireRole } from "@/lib/session";

/**
 * Student shell: sidebar + sticky navbar around every /siswa route.
 *
 * The student area used to render its own header and page margins in each page,
 * which is why the room pages had a different frame from the dashboard. One
 * layout now owns the chrome, so a new student page gets the sidebar for free.
 */
export default function SiswaLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingPanel varian="papan" />}>
      <SiswaShell>{children}</SiswaShell>
    </Suspense>
  );
}

async function SiswaShell({ children }: { children: ReactNode }) {
  const user = await requireRole("siswa");

  return (
    <TooltipProvider>
      <SidebarProvider>
        <SiswaSidebar />
        <SidebarInset>
          <SiswaSiteHeader user={user} />
          <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
