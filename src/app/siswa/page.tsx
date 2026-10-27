import { Suspense } from "react";
import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";
import { LoadingPanel } from "@/components/loading-panel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard Siswa · LMS Sekolah",
};

export default function SiswaPage() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <SiswaDashboard />
    </Suspense>
  );
}

async function SiswaDashboard() {
  const user = await requireRole("siswa");

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Halo, {user.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anda masuk sebagai siswa. Akun baru otomatis mendapat peran ini.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Kelas diikuti", body: "Belum mengikuti kelas." },
            { title: "Tugas", body: "Tidak ada tugas aktif." },
            { title: "Nilai", body: "Belum ada nilai." },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-sm">{item.title}</CardTitle>
                <CardDescription>{item.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
