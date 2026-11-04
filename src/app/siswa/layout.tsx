import { Suspense, type ReactNode } from "react";

import { LoadingPanel } from "@/components/loading-panel";
import { SiswaNavBawah } from "@/components/siswa-nav-bawah";
import { SiswaSiteHeader } from "@/components/siswa-site-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireRole } from "@/lib/session";

/**
 * Student shell: slim top bar + bottom navigation around every /siswa route.
 *
 * Only the student area uses a bottom bar — teacher and admin keep their
 * sidebars. The header stays for the section title and account menu; the old
 * sidebar and its toggle are gone.
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
      <div className="flex min-h-svh flex-col">
        <SiswaSiteHeader user={user} />
        {/* pb leaves room for the fixed bottom bar + safe area on phones. */}
        <div className="flex flex-1 flex-col gap-6 p-4 pb-24 sm:p-6 sm:pb-24">
          {children}
        </div>
        <SiswaNavBawah user={user} />
      </div>
    </TooltipProvider>
  );
}
