import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { StudentForm } from "@/components/admin/student-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/session";
import { getPerson, listKelas } from "@/lib/people";

export const metadata: Metadata = {
  title: "Ubah Siswa · LMS Sekolah",
};

export default function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
      <StudentDetail params={params} />
    </Suspense>
  );
}

async function StudentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");

  const { id } = await params;
  const [student, kelas] = await Promise.all([
    getPerson(id, "siswa"),
    listKelas(),
  ]);

  if (!student) {
    notFound();
  }

  return (
    <>
      <div>
        <Link
          href="/admin/siswa"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 mb-2" })}
        >
          <ChevronLeftIcon />
          Kembali
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Ubah data siswa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {student.name} · {student.username ?? "tanpa NISN"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil siswa</CardTitle>
          <CardDescription>
            NISN dipakai sebagai username login. Mengubah NISN tidak mengubah
            password — pakai tombol Reset di daftar siswa untuk itu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentForm student={student} kelas={kelas} />
        </CardContent>
      </Card>
    </>
  );
}
