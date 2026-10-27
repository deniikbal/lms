import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { TeacherForm } from "@/components/admin/teacher-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getPerson } from "@/lib/people";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ubah Guru · LMS Sekolah",
};

export default function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <TeacherDetail params={params} />
    </Suspense>
  );
}

async function TeacherDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");

  const { id } = await params;
  const teacher = await getPerson(id, "guru");

  if (!teacher) {
    notFound();
  }

  return (
    <>
      <div>
        <Link
          href="/admin/guru"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 mb-2",
          })}
        >
          <ChevronLeftIcon />
          Kembali
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Ubah data guru
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {teacher.name} · {teacher.username ?? "tanpa NIP"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil guru</CardTitle>
          <CardDescription>
            NIP dipakai sebagai username login. Mengubah NIP tidak mengubah
            password — pakai tombol Reset di daftar guru untuk itu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeacherForm teacher={teacher} />
        </CardContent>
      </Card>
    </>
  );
}
