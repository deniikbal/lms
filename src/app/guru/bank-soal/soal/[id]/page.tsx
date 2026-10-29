import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ChevronRightIcon, PencilIcon } from "lucide-react";

import { HapusBankButton } from "@/components/bank-soal/hapus-bank-button";
import { LoadingPanel } from "@/components/loading-panel";
import { Kosong, Panel } from "@/components/ruang-belajar/panel";
import { TONE } from "@/components/ruang-belajar/tone";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBankSoal, getTopik, listPemakaianBank } from "@/lib/bank-soal";
import { labelJenisSoalBank } from "@/lib/bank-soal-shared";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Soal bank · LMS Sekolah",
};

export default function BankSoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Same reason as the topic page: the shell must render without waiting on the
  // cookie or on `params`, so the data lives in its own boundary.
  return (
    <Suspense fallback={<LoadingPanel varian="panel" />}>
      <Isi params={params} />
    </Suspense>
  );
}

async function Isi({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("guru");
  const { id } = await params;
  const bankId = Number(id);
  if (!Number.isInteger(bankId) || bankId <= 0) notFound();

  const soal = await getBankSoal(user.id, bankId);
  if (!soal) notFound();

  // Satu soal bisa disalin ke beberapa kuis, jadi satu baris per kuis; ia
  // berbagi id soal, dan id itulah kuncinya.
  const [pemakaian, topik] = await Promise.all([
    listPemakaianBank(user.id, bankId),
    soal.topikId ? getTopik(user.id, soal.topikId) : Promise.resolve(null),
  ]);

  // Aggregated across every class that sat it — the whole point of a bank over
  // a per-quiz question, where the same item is judged one class at a time.
  const menjawab = pemakaian.reduce((jumlah, row) => jumlah + row.menjawab, 0);
  const benar = pemakaian.reduce((jumlah, row) => jumlah + row.benar, 0);
  const peserta = pemakaian.reduce((jumlah, row) => jumlah + row.jumlahPercobaan, 0);
  const persen = menjawab === 0 ? null : Math.round((benar / menjawab) * 100);
  const kelas = new Set(pemakaian.map((row) => row.kelasNama));

  const kembali = soal.topikId
    ? `/guru/bank-soal/topik/${soal.topikId}`
    : "/guru/bank-soal";

  return (
    <div className="space-y-5">
      <header>
        <nav
          aria-label="Remah roti"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          <Link
            href="/guru/bank-soal"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Bank Soal
          </Link>
          {topik ? (
            <>
              <ChevronRightIcon className="size-3" />
              <Link
                href={kembali}
                className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {topik.nama}
              </Link>
            </>
          ) : null}
          <ChevronRightIcon className="size-3" />
          <span className="text-foreground">Soal #{soal.id}</span>
        </nav>

        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                TONE[soal.jenis === "pg" ? "biru" : "ungu"],
              )}
            >
              {labelJenisSoalBank(soal.jenis)}
            </span>
            {soal.mapelNama ? (
              <span className="text-sm text-muted-foreground">{soal.mapelNama}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Tanpa mapel</span>
            )}
            <span aria-hidden className="text-xs text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {soal.bobot} poin
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/guru/bank-soal/soal/${soal.id}/ubah`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
            >
              <PencilIcon className="size-3.5" />
              Ubah soal
            </Link>
            <HapusBankButton bankId={soal.id} dipakai={soal.dipakai} />
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-border/70 bg-card p-4">
        <p className="text-sm whitespace-pre-line text-foreground">{soal.pertanyaan}</p>

        {soal.jenis === "pg" ? (
          <ul className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            {Object.entries(soal.pilihan).map(([huruf, isi]) => (
              <li
                key={huruf}
                className={cn(
                  "flex gap-2 rounded-lg px-2 py-1",
                  huruf === soal.jawaban && "bg-emerald-500/10 text-foreground",
                )}
              >
                <span className="w-4 shrink-0 font-medium tabular-nums">{huruf}</span>
                <span className="min-w-0">{isi}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Panel
        judul="Seberapa baik soal ini bekerja"
        keterangan={
          pemakaian.length === 0
            ? "Belum pernah ditugaskan"
            : `${pemakaian.length} kuis · ${kelas.size} kelas · ${peserta} peserta`
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Angka label="Siswa menjawab" nilai={String(menjawab)} />
          <Angka label="Menjawab benar" nilai={String(benar)} />
          <Angka
            label="Persentase benar"
            nilai={persen === null ? "—" : `${persen}%`}
            nada={
              persen === null
                ? "netral"
                : persen >= 70
                  ? "hijau"
                  : persen >= 40
                    ? "kuning"
                    : "merah"
            }
          />
        </div>

        {soal.jenis === "esai" && menjawab > 0 ? (
          <p className="text-xs text-muted-foreground">
            Soal esai dinilai manual, jadi “benar” di atas hanya menghitung
            jawaban yang skornya penuh.
          </p>
        ) : null}
      </Panel>

      <Panel judul="Dipakai di" keterangan="Kuis yang menyalin soal ini">
        {pemakaian.length === 0 ? (
          <Kosong>
            Soal ini belum ditugaskan ke kuis mana pun. Buka sebuah kuis, lalu
            pilih “Ambil topik dari bank”.
          </Kosong>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="px-3 text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground">
                    Kuis
                  </TableHead>
                  <TableHead className="w-32 px-3 text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground">
                    Kelas
                  </TableHead>
                  <TableHead className="hidden w-28 px-3 text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground sm:table-cell">
                    Tahun
                  </TableHead>
                  <TableHead className="w-20 px-3 text-right text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground">
                    Peserta
                  </TableHead>
                  <TableHead className="w-24 px-3 text-right text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground">
                    Benar
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pemakaian.map((row) => {
                  const rasio =
                    row.menjawab === 0
                      ? null
                      : Math.round((row.benar / row.menjawab) * 100);
                  return (
                    <TableRow key={row.kuisId} className="border-border/60">
                      <TableCell className="px-3 py-2.5">
                        <Link
                          href={`/guru/ruang/${row.ruangId}/kuis/${row.kuisId}`}
                          className="inline-flex items-center gap-1 text-sm text-foreground underline-offset-4 transition-colors hover:underline"
                        >
                          {row.kuisJudul}
                          <ChevronRightIcon className="size-3 text-muted-foreground" />
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                        {row.kelasNama}
                      </TableCell>
                      <TableCell className="hidden px-3 py-2.5 text-xs text-muted-foreground sm:table-cell">
                        {row.taNama}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-sm text-muted-foreground tabular-nums">
                        {row.jumlahPercobaan}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right text-sm tabular-nums">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                            rasio === null
                              ? TONE.netral
                              : rasio >= 70
                                ? TONE.hijau
                                : rasio >= 40
                                  ? TONE.kuning
                                  : TONE.merah,
                          )}
                        >
                          {row.benar}/{row.menjawab || 0}
                          {rasio === null ? "" : ` · ${rasio}%`}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <div>
        <Link
          href={kembali}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-3.5" />
          {topik ? `Kembali ke ${topik.nama}` : "Kembali ke bank soal"}
        </Link>
      </div>
    </div>
  );
}

function Angka({
  label,
  nilai,
  nada = "netral",
}: {
  label: string;
  nilai: string;
  nada?: keyof typeof TONE;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5">
      <p className="text-[0.7rem] tracking-wide uppercase text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 inline-flex rounded-md px-1.5 text-lg font-semibold tabular-nums ring-1 ring-transparent",
          nada === "netral" ? "text-foreground" : cn("ring-1", TONE[nada]),
        )}
      >
        {nilai}
      </p>
    </div>
  );
}