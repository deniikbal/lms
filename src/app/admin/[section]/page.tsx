import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { findNavItem } from "@/components/admin/nav-config";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for every admin section in the blueprint (ANALISIS_LMS_PJJ.md §5.6).
 *
 * Each entry becomes a real route the moment a sibling folder with its own
 * `page.tsx` is added — a static segment always wins over this dynamic one, so
 * building `/admin/kelas` simply replaces the placeholder.
 */
const SECTIONS = {
  "tahun-ajaran": {
    title: "Tahun Ajaran",
    description: "Tahun ajaran dan semester yang sedang berjalan.",
    scope: [
      "Daftar tahun ajaran (mis. 2026/2027)",
      "Semester Ganjil / Genap",
      "Menetapkan satu tahun ajaran sebagai aktif",
    ],
  },
  jurusan: {
    title: "Jurusan",
    description: "Jurusan atau kompetensi keahlian sekolah.",
    scope: ["Kode unik dan nama jurusan", "Dipakai sebagai induk kelas"],
  },
  kelas: {
    title: "Kelas",
    description: "Rombongan belajar beserta wali kelasnya.",
    scope: ["Tingkat 1–12", "Jurusan (opsional)", "Wali kelas dari akun guru"],
  },
  mapel: {
    title: "Mapel",
    description: "Mata pelajaran yang diajarkan.",
    scope: [
      "Kode unik dan nama mapel",
      "Kelompok: Umum / Kejuruan / Muatan Lokal",
    ],
  },
  pengguna: {
    title: "Pengguna",
    description: "Akun guru dan siswa.",
    scope: [
      "Daftar akun per peran",
      "Impor massal lewat CSV",
      "Reset password",
      "Hapus akun",
    ],
  },
  jadwal: {
    title: "Jadwal",
    description: "Jadwal tatap maya per ruang belajar.",
    scope: ["Hari dan jam mulai–selesai", "Link Google Meet"],
  },
  rekap: {
    title: "Rekap",
    description: "Rekapitulasi hasil belajar lintas ruang.",
    scope: [
      "Rekap presensi (hadir/izin/sakit/alpa)",
      "Rekap nilai akhir berbobot",
      "Rekap keaktifan siswa",
    ],
  },
  pengumuman: {
    title: "Pengumuman",
    description: "Pengumuman sekolah dengan sasaran tertentu.",
    scope: [
      "Sasaran: semua / guru / siswa",
      "Dibatasi ke satu kelas (opsional)",
      "Sematkan di halaman awal",
    ],
  },
} as const;

type SectionSlug = keyof typeof SECTIONS;

function isSection(slug: string): slug is SectionSlug {
  return Object.hasOwn(SECTIONS, slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;

  if (!isSection(section)) {
    return { title: "Tidak ditemukan · LMS Sekolah" };
  }

  return { title: `${SECTIONS[section].title} · LMS Sekolah` };
}

export default function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  // `params` is URL data: awaiting it in the page body would block the instant
  // shell, so the section reads it inside its own boundary (see the
  // "instant-shell-url-data" rule in Next 16).
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <SectionContent params={params} />
    </Suspense>
  );
}

async function SectionContent({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!isSection(section)) {
    notFound();
  }

  const meta = SECTIONS[section];
  const icon = findNavItem(`/admin/${section}`)?.icon;
  const Icon = icon;

  return (
    <>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {meta.title}
          </h1>
          <Badge variant="secondary">Segera</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="mb-2 grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
            {Icon ? <Icon className="size-5" /> : null}
          </div>
          <CardTitle>Modul ini belum dibangun</CardTitle>
          <CardDescription>
            Navigasi dan tata letaknya sudah siap. Isi modul akan menyusul.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            {meta.scope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

/** Matches the section layout so the shell does not jump when the content lands. */
function SectionSkeleton() {
  return (
    <>
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </>
  );
}
