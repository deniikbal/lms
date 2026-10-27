import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, VideoIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getRuangDetail, namaHari } from "@/lib/pembagian";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ruang belajar · LMS Sekolah",
};

/**
 * One room, as reached from the subject name on Pembagian Mengajar.
 *
 * Only the identity and the settings that live on `ruang` are here; materi,
 * pertemuan, tugas, kuis and diskusi get their own screens.
 */
export default function RuangDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");

  const { id } = await params;
  const ruangId = Number(id);
  if (!Number.isInteger(ruangId) || ruangId <= 0) notFound();

  const ruang = await getRuangDetail(ruangId);
  if (!ruang) notFound();

  return (
    <>
      <div>
        <Link
          href={`/admin/ruang?kelas=${ruang.kelasId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-3" />
          Pembagian mengajar
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {ruang.nama}
          </h1>
          <Badge variant="secondary">{ruang.kode}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {ruang.kelasNama} · {ruang.taNama} {ruang.taSemester}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pengampu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Guru">
              {ruang.guruNama ?? (
                <span className="text-muted-foreground">Belum ada guru</span>
              )}
            </Row>
            <Row label="KKM">{ruang.kkm}</Row>
            <Row label="Bobot">
              <span className="tabular-nums">
                Tugas {ruang.bobotTugas} · Kuis {ruang.bobotKuis} · Kehadiran{" "}
                {ruang.bobotKehadiran}
              </span>
            </Row>
            {ruang.deskripsi ? (
              <Row label="Deskripsi">{ruang.deskripsi}</Row>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Jadwal · {ruang.jadwal.length} slot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ruang.jadwal.length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {ruang.jadwal.map((slot) => (
                  <li key={slot.id} className="flex items-center gap-2">
                    <span className="tabular-nums text-foreground">
                      {namaHari(slot.hari)} {slot.jamMulai}–{slot.jamSelesai}
                    </span>
                    {slot.linkMeet ? (
                      <a
                        href={slot.linkMeet}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        <VideoIcon className="size-3" />
                        Meet
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada jadwal. Tambahkan dari Pembagian Mengajar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Materi, pertemuan, tugas, kuis, dan diskusi untuk ruang ini menyusul di
        halamannya masing-masing.
      </p>
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-6 w-56" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </>
  );
}
