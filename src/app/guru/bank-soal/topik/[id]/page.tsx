import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  FileTextIcon,
  FolderOpenIcon,
  HelpCircleIcon,
  PencilIcon,
  PlusIcon,
  ShareIcon,
  UploadIcon,
} from "lucide-react";

import { HapusBankButton } from "@/components/bank-soal/hapus-bank-button";
import { HapusTopikButton } from "@/components/bank-soal/hapus-topik";
import { KotakAngka } from "@/components/kotak-angka";
import { warnaMapel } from "@/components/warna-mapel";
import { LoadingPanel } from "@/components/loading-panel";
import { Kosong, Panel } from "@/components/ruang-belajar/panel";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTopik, listPemakaianTopik, listSoalTopik } from "@/lib/bank-soal";
import { labelJenisSoalBank } from "@/lib/bank-soal-shared";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Topik · Bank Soal · LMS Sekolah",
};

export default function TopikPage({ params }: { params: Promise<{ id: string }> }) {
  // `params` is URL data and the session is a signed cookie; awaiting either one
  // in the page body would block the instant shell, so both are read inside the
  // boundary below (the "instant-shell-url-data" rule in Next 16).
  return (
    <Suspense fallback={<LoadingPanel varian="panel" />}>
      <Isi params={params} />
    </Suspense>
  );
}

async function Isi({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("guru");
  const { id } = await params;
  const topikId = Number(id);
  if (!Number.isInteger(topikId) || topikId <= 0) notFound();

  const topik = await getTopik(user.id, topikId);
  if (!topik) notFound();

  const [soal, pemakaian] = await Promise.all([
    listSoalTopik(user.id, topikId),
    listPemakaianTopik(user.id, topikId),
  ]);

  const dasar = `/guru/bank-soal/topik/${topik.id}`;
  const warna = warnaMapel(topik);
  const kosong = soal.length === 0;

  return (
    <div className="space-y-4">
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
        <ChevronRightIcon className="size-3" />
        <span className="text-foreground">{topik.nama}</span>
      </nav>

      {/*
        The topic header wears the same hue as its card in the list, so walking
        from the list into a topic feels like opening that folder rather than
        landing on a different site.
      */}
      <header className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div aria-hidden className={cn("h-0.5 w-full", kosong ? "bg-border" : warna.garis)} />

        <div className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl border",
                kosong ? "border-border bg-muted/60" : warna.kotak,
              )}
            >
              <FolderOpenIcon
                className={cn("size-5", kosong ? "text-muted-foreground/60" : warna.ikon)}
              />
            </span>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg leading-tight font-semibold tracking-tight text-foreground">
                  {topik.nama}
                </h1>
                {topik.mapelKode ? (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium ring-1 tabular-nums",
                      kosong ? "bg-muted text-muted-foreground ring-border" : warna.chip,
                    )}
                  >
                    {topik.mapelKode}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {topik.mapelNama ?? "Tanpa mapel"}
                {kosong
                  ? " · belum ada soal"
                  : ` · ${soal.length} soal · ${topik.bobot} poin`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href={`${dasar}/ubah`} />}
            >
              <PencilIcon />
              Ubah topik
            </Button>
            <HapusTopikButton
              topikId={topik.id}
              nama={topik.nama}
              soal={soal.length}
              dipakai={topik.dipakai}
            />
          </div>
        </div>

        <dl className="grid gap-2 border-t border-border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <KotakAngka
            warna="indigo"
            ikon={<FileTextIcon className="size-3.5" />}
            label="Soal"
            nilai={topik.soal}
          />
          <KotakAngka
            warna="emerald"
            ikon={<HelpCircleIcon className="size-3.5" />}
            label="Pilihan ganda"
            nilai={topik.jumlahPg}
          />
          <KotakAngka
            warna="sky"
            ikon={<PencilIcon className="size-3.5" />}
            label="Esai"
            nilai={topik.jumlahEsai}
          />
          <KotakAngka
            warna="violet"
            ikon={<ShareIcon className="size-3.5" />}
            label="Dipakai di kuis"
            nilai={topik.dipakai}
            catatan={topik.dipakai === 0 ? "belum ditugaskan" : undefined}
          />
        </dl>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
          <Button size="sm" nativeButton={false} render={<Link href={`${dasar}/soal/baru`} />}>
            <PlusIcon />
            Tulis soal
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`${dasar}/impor`} />}
          >
            <UploadIcon />
            Tempel teks
          </Button>
          <span className="ml-auto text-[0.7rem] text-muted-foreground tabular-nums">
            Diperbarui {topik.diperbarui}
          </span>
        </div>
      </header>

      <Panel
        judul="Soal di topik ini"
        keterangan={
          kosong ? undefined : `${soal.length} soal · urutan ini yang masuk ke kuis`
        }
      >
        {kosong ? (
          <Kosong>
            Topik ini masih kosong. Tulis soal pertama, atau tempel banyak soal
            sekaligus — semuanya otomatis masuk ke “{topik.nama}”.
          </Kosong>
        ) : (
          <ol className="space-y-2">
            {soal.map((item, urutan) => {
              const pg = item.jenis === "pg";
              return (
                <li
                  key={item.id}
                  className="group rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/20"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold tabular-nums",
                        pg
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                      )}
                    >
                      {urutan + 1}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-sm whitespace-pre-line text-foreground">
                        {item.pertanyaan}
                      </p>

                      {pg ? (
                        <ul className="grid gap-1 sm:grid-cols-2">
                          {Object.entries(item.pilihan).map(([huruf, isi]) => {
                            const kunci = huruf === item.jawaban;
                            return (
                              <li
                                key={huruf}
                                className={cn(
                                  "flex items-start gap-1.5 rounded-md px-1 py-0.5 text-xs",
                                  kunci
                                    ? "bg-emerald-500/[0.08] font-medium text-emerald-800 dark:text-emerald-300"
                                    : "text-muted-foreground",
                                )}
                              >
                                <span
                                  className={cn(
                                    "mt-px grid size-4 shrink-0 place-items-center rounded text-[0.6rem] font-semibold",
                                    kunci
                                      ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
                                      : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {kunci ? <CheckIcon className="size-2.5" /> : huruf}
                                </span>
                                <span className="min-w-0">{isi}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CircleDashedIcon className="size-3" />
                          Esai · dikoreksi manual
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[0.65rem] font-medium ring-1",
                            pg
                              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/25"
                              : "bg-violet-500/10 text-violet-700 ring-violet-600/20 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/25",
                          )}
                        >
                          {labelJenisSoalBank(item.jenis)}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground tabular-nums">
                          {item.bobot} poin
                        </span>
                        {item.dipakai > 0 ? (
                          <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground tabular-nums">
                            <ShareIcon className="size-2.5" />
                            dipakai {item.dipakai}×
                          </span>
                        ) : null}
                        <Link
                          href={`/guru/bank-soal/soal/${item.id}`}
                          className="rounded px-1.5 py-0.5 text-[0.65rem] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                        >
                          analisis butir
                        </Link>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <Link
                        href={`/guru/bank-soal/soal/${item.id}/ubah`}
                        aria-label={`Ubah soal ${urutan + 1}`}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <PencilIcon className="size-3.5" />
                      </Link>
                      <HapusBankButton bankId={item.id} dipakai={item.dipakai} ikon />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <Panel
        judul="Dipakai di"
        keterangan={
          pemakaian.length === 0 ? "Belum ditugaskan" : `${pemakaian.length} kuis`
        }
      >
        {pemakaian.length === 0 ? (
          <Kosong>
            Topik ini belum ditugaskan ke kuis mana pun. Buka sebuah kuis, lalu
            pilih “Ambil topik dari bank” — seluruh soal di topik ini masuk
            sekaligus.
          </Kosong>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="px-3 text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground">
                    Kuis
                  </TableHead>
                  <TableHead className="w-32 px-3 text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground">
                    Kelas
                  </TableHead>
                  <TableHead className="hidden w-28 px-3 text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground sm:table-cell">
                    Tahun
                  </TableHead>
                  <TableHead className="w-24 px-3 text-right text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground">
                    Soal topik
                  </TableHead>
                  <TableHead className="w-20 px-3 text-right text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground">
                    Peserta
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pemakaian.map((row) => (
                  <TableRow key={row.kuisId} className="border-border">
                    <TableCell className="px-3 py-2.5">
                      <Link
                        href={`/guru/ruang/${row.ruangId}/kuis/${row.kuisId}`}
                        className="inline-flex items-center gap-1 text-sm text-foreground underline-offset-4 transition-colors hover:underline"
                      >
                        {row.kuis}
                        <ChevronRightIcon className="size-3 text-muted-foreground" />
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-sm text-muted-foreground">
                      {row.kelas}
                    </TableCell>
                    <TableCell className="hidden px-3 py-2.5 text-xs text-muted-foreground sm:table-cell">
                      {row.taNama}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right text-sm text-muted-foreground tabular-nums">
                      {row.jumlah}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right text-sm text-muted-foreground tabular-nums">
                      {row.peserta}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <div>
        <Link
          href="/guru/bank-soal"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-3.5" />
          Semua topik
        </Link>
      </div>
    </div>
  );
}