import { Suspense } from "react";
import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";
import { LoadingPanel } from "@/components/loading-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard Guru · LMS Sekolah",
};

export default function GuruPage() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <GuruDashboard />
    </Suspense>
  );
}

async function GuruDashboard() {
  const user = await requireRole("guru");

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader user={user} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Selamat datang, {user.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anda masuk sebagai guru. Area ini hanya bisa diakses peran guru dan
          admin.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Kelas saya", body: "Belum ada kelas.", cta: "Buat kelas" },
            { title: "Materi", body: "Belum ada materi.", cta: "Unggah materi" },
            { title: "Penilaian", body: "Belum ada tugas.", cta: "Buat tugas" },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-sm">{item.title}</CardTitle>
                <CardDescription>{item.body}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled
                >
                  {item.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
