import Link from "next/link";
import { ChevronRightIcon, PencilIcon } from "lucide-react";

import { BuatDialog, type TugasEdit } from "@/components/ruang-belajar/buat-dialog";
import { DiskusiForm } from "@/components/ruang-belajar/diskusi-form";
import { HapusTugas } from "@/components/ruang-belajar/hapus-tugas";
import { Kosong, Panel } from "@/components/ruang-belajar/panel";
import { inisial, TONE } from "@/components/ruang-belajar/tone";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatJendela,
  formatTanggalJam,
  formatTanggalPendek,
  labelTipe,
  nilaiAkhir,
  predikat,
  statusPengumpulan,
  STATUS_PRESENSI,
  type AnggotaRow,
  type DiskusiRow,
  type NilaiRow,
  type PeranRuang,
  type PresensiMatriks,
  type RuangHeader,
  type TugasRow,
} from "@/lib/ruang-belajar-shared";

const HEAD =
  "px-3 text-[0.7rem] font-medium tracking-wider uppercase text-muted-foreground";

/** Extract the numeric room id from the base URL, e.g. `/guru/ruang/73` → 73. */
function ruangIdOf(base: string): number {
  return Number(base.split("/").pop());
}

// --------------------------------------------------------------------- tugas

export function TabTugas({
  tugas,
  peran,
  base,
  jumlahSiswa,
}: {
  tugas: TugasRow[];
  peran: PeranRuang;
  /** The room URL, used to build the per-task link. */
  base: string;
  jumlahSiswa: number;
}) {
  if (tugas.length === 0) {
    return <Kosong>Belum ada tugas di ruang ini.</Kosong>;
  }

  const terbit = tugas.filter((item) => item.terbit).length;
  const siswa = peran === "siswa";

  return (
    <Panel
      judul="Daftar tugas"
      keterangan={
        siswa ? `${tugas.length} tugas` : `${tugas.length} tugas · ${terbit} terbit`
      }
    >
      {/*
        Two shapes for one list: a real table on ≥sm, stacked cards on a phone —
        a 4-column table never fits 360px without a sideways scroll.
      */}
      <div className="hidden overflow-hidden rounded-xl border border-border/70 bg-card sm:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className={HEAD}>Tugas</TableHead>
              <TableHead className={cn(HEAD, "w-44")}>Tenggat</TableHead>
              <TableHead className={cn(HEAD, "w-48")}>
                {siswa ? "Pengumpulan Anda" : "Pengumpulan"}
              </TableHead>
              {siswa ? null : <TableHead className={cn(HEAD, "w-28")}>Status</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tugas.map((item) => {
              const milik = item.pengumpulanSiswa;
              const status = milik
                ? statusPengumpulan(milik)
                : statusPengumpulan({ dikumpulkan: false, terlambat: false, nilai: null });

              return (
                <TableRow key={item.id} className="border-border/60">
                  <TableCell className="px-3 py-3">
                    <Link
                      href={`${base}/tugas/${item.id}`}
                      className="inline-flex items-center gap-1 rounded-sm text-sm text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {item.judul}
                      <ChevronRightIcon className="size-3.5 text-muted-foreground/60" />
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {labelTipe(item.tipe)}
                      {item.bolehTerlambat ? " · boleh terlambat" : ""}
                    </p>
                  </TableCell>
                  <TableCell className="px-3 py-3 text-sm text-muted-foreground tabular-nums">
                    {formatTanggalJam(item.tenggat) ?? "Tanpa tenggat"}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {siswa ? (
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                            TONE[status.tone],
                          )}
                        >
                          {status.label}
                        </span>
                        {milik?.nilai !== null && milik?.nilai !== undefined ? (
                          <span
                            className={cn(
                              "inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums",
                              TONE.biru,
                            )}
                          >
                            Nilai {milik.nilai}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {item.terkumpul}/{jumlahSiswa} terkumpul
                        {item.dinilai > 0 ? ` · ${item.dinilai} dinilai` : ""}
                      </span>
                    )}
                  </TableCell>
                  {siswa ? null : (
                    <TableCell className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                            item.terbit ? TONE.hijau : TONE.kuning,
                          )}
                        >
                          {item.terbit ? "Terbit" : "Draf"}
                        </span>

                        {/*
                          Row-level controls, like the meeting cards: edit reuses
                          the create dialog, delete disappears once a submission
                          or grade exists (the SQL re-checks regardless).
                        */}
                        <BuatDialog
                          ruangId={ruangIdOf(base)}
                          jenis="tugas"
                          tugas={{
                            id: item.id,
                            judul: item.judul,
                            // The list query formats the deadline as
                            // `YYYY-MM-DD HH24:MI`; the input needs a literal T.
                            tenggat: item.tenggat
                              ? item.tenggat.replace(" ", "T")
                              : null,
                            tipe: item.tipe,
                            bolehTerlambat: item.bolehTerlambat,
                            terbit: item.terbit,
                            lampiranNama: item.lampiranNama,
                            lampiranUrl: item.lampiranUrl,
                            deskripsi: item.deskripsi,
                          }}
                          pemicu={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit tugas ${item.judul}`}
                            >
                              <PencilIcon />
                            </Button>
                          }
                        />
                        <HapusTugas
                          ruangId={ruangIdOf(base)}
                          tugasId={item.id}
                          boleh={true}
                          terkumpul={item.terkumpul}
                          dinilai={item.dinilai}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Phone: the same rows as stacked cards — no sideways scrolling. */}
      <div className="space-y-2 sm:hidden">
        {tugas.map((item) => {
          const milik = item.pengumpulanSiswa;
          const status = milik
            ? statusPengumpulan(milik)
            : statusPengumpulan({ dikumpulkan: false, terlambat: false, nilai: null });
          return (
            <div
              key={item.id}
              className="space-y-2 rounded-xl border border-border/70 bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`${base}/tugas/${item.id}`}
                  className="min-w-0 flex-1 rounded-sm text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <span className="line-clamp-2">{item.judul}</span>
                </Link>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                    TONE[status.tone],
                  )}
                >
                  {status.label}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {labelTipe(item.tipe)}
                {item.bolehTerlambat ? " · boleh terlambat" : ""}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatTanggalJam(item.tenggat) ?? "Tanpa tenggat"}
                </p>
                {siswa ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    {milik?.dikumpulkan ? (
                      <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1", TONE.hijau)}>
                        Terkumpul
                      </span>
                    ) : null}
                    {milik?.terlambat ? (
                      <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1", TONE.merah)}>
                        Terlambat
                      </span>
                    ) : null}
                    {milik?.nilai !== null && milik?.nilai !== undefined ? (
                      <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums", TONE.biru)}>
                        Nilai {milik.nilai}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {item.terkumpul}/{jumlahSiswa} terkumpul
                    {item.dinilai > 0 ? ` · ${item.dinilai} dinilai` : ""}
                  </span>
                )}

                {siswa ? null : (
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
                        item.terbit ? TONE.hijau : TONE.kuning,
                      )}
                    >
                      {item.terbit ? "Terbit" : "Draf"}
                    </span>
                    <BuatDialog
                      ruangId={ruangIdOf(base)}
                      jenis="tugas"
                      tugas={{
                        id: item.id,
                        judul: item.judul,
                        // The list query formats the deadline as
                        // `YYYY-MM-DD HH24:MI`; the input needs a literal T.
                        tenggat: item.tenggat ? item.tenggat.replace(" ", "T") : null,
                        tipe: item.tipe,
                        bolehTerlambat: item.bolehTerlambat,
                        terbit: item.terbit,
                        lampiranNama: item.lampiranNama,
                        lampiranUrl: item.lampiranUrl,
                        deskripsi: item.deskripsi,
                      }}
                      pemicu={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit tugas ${item.judul}`}
                        >
                          <PencilIcon />
                        </Button>
                      }
                    />
                    <HapusTugas
                      ruangId={ruangIdOf(base)}
                      tugasId={item.id}
                      boleh={true}
                      terkumpul={item.terkumpul}
                      dinilai={item.dinilai}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function TabPresensi({
  matriks,
  siswaId,
}: {
  matriks: PresensiMatriks;
  siswaId: string;
}) {
  const { pertemuan, siswa, status } = matriks;

  if (pertemuan.length === 0) {
    return <Kosong>Belum ada pertemuan terbit, jadi presensi belum bisa diisi.</Kosong>;
  }

  return (
    <Panel
      judul="Matriks presensi"
      keterangan={`${siswa.length} siswa · ${pertemuan.length} pertemuan`}
    >
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className={cn(HEAD, "sticky left-0 z-10 w-72 bg-card")}>
                Siswa
              </TableHead>
              {pertemuan.map((item) => (
                <TableHead
                  key={item.id}
                  className={cn(HEAD, "text-center")}
                  title={`${item.judul} · ${formatTanggalPendek(item.tanggal)}`}
                >
                  P{item.urutan}
                </TableHead>
              ))}
              <TableHead className={cn(HEAD, "w-16 text-right")}>Hadir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {siswa.map((murid) => {
              const baris = status[murid.id] ?? {};
              const hadir = pertemuan.filter(
                (item) => baris[String(item.id)] === "hadir",
              ).length;

              return (
                <TableRow
                  key={murid.id}
                  className={cn(
                    "border-border/60",
                    murid.id === siswaId && "bg-muted/40",
                  )}
                >
                  <TableCell className="sticky left-0 z-10 bg-inherit px-3 py-2 text-sm text-foreground">
                    {murid.nama}
                  </TableCell>
                  {pertemuan.map((item) => {
                    const nilai = baris[String(item.id)];
                    return (
                      <TableCell key={item.id} className="px-1 py-2 text-center">
                        {nilai ? (
                          <span
                            className={cn(
                              "inline-grid size-6 place-items-center rounded-md text-[0.7rem] font-semibold ring-1",
                              TONE[STATUS_PRESENSI[nilai].tone],
                            )}
                            title={STATUS_PRESENSI[nilai].label}
                          >
                            {STATUS_PRESENSI[nilai].singkat}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">–</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums">
                    {hadir}/{pertemuan.length}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        H = hadir · I = izin · S = sakit · A = alpa · – = belum dicatat
      </p>
    </Panel>
  );
}

// --------------------------------------------------------------------- nilai

export function TabNilai({
  nilai,
  ruang,
}: {
  nilai: NilaiRow[];
  ruang: RuangHeader;
}) {
  if (nilai.length === 0) {
    return <Kosong>Belum ada siswa di kelas ini.</Kosong>;
  }

  const bobot = {
    tugas: ruang.bobotTugas,
    kuis: ruang.bobotKuis,
    kehadiran: ruang.bobotKehadiran,
  };

  return (
    <Panel
      judul="Rapor ruang"
      keterangan={`Bobot tugas ${bobot.tugas}% · kuis ${bobot.kuis}% · kehadiran ${bobot.kehadiran}%`}
    >
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className={HEAD}>Siswa</TableHead>
              <TableHead className={cn(HEAD, "w-24 text-right")}>Tugas</TableHead>
              <TableHead className={cn(HEAD, "w-24 text-right")}>Kuis</TableHead>
              <TableHead className={cn(HEAD, "w-28 text-right")}>Kehadiran</TableHead>
              <TableHead className={cn(HEAD, "w-28 text-right")}>Nilai akhir</TableHead>
              <TableHead className={cn(HEAD, "w-20 text-center")}>Predikat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nilai.map((row) => {
              const akhir = nilaiAkhir(
                { tugas: row.tugas, kuis: row.kuis, kehadiran: row.kehadiran },
                bobot,
              );
              return (
                <TableRow key={row.siswaId} className="border-border/60">
                  <TableCell className="px-3 py-2 text-sm text-foreground">
                    {row.nama}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums">
                    {row.tugas ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums">
                    {row.kuis ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right text-sm text-muted-foreground tabular-nums">
                    {row.kehadiran === null ? "—" : `${row.kehadiran}%`}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right text-sm font-medium text-foreground tabular-nums">
                    {akhir ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-center text-sm text-muted-foreground">
                    {predikat(akhir)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Nilai akhir dihitung hanya kalau tugas, kuis, dan kehadiran sudah punya
        data — komponen kosong tidak dianggap nol.
      </p>
    </Panel>
  );
}

// ------------------------------------------------------------------- diskusi

export function TabDiskusi({
  ruangId,
  diskusi,
  userId,
}: {
  ruangId: number;
  diskusi: DiskusiRow[];
  userId: string;
}) {
  return (
    <Panel judul="Diskusi" keterangan={`${diskusi.length} pesan`}>
      <DiskusiForm ruangId={ruangId} />

      {diskusi.length === 0 ? (
        <Kosong>Belum ada pertanyaan. Jadilah yang pertama bertanya.</Kosong>
      ) : (
        <ul className="space-y-2">
          {diskusi.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border/70 bg-card px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[0.6rem] font-semibold text-muted-foreground">
                  {inisial(item.penulis)}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {item.penulis}
                </span>
                <span className="rounded bg-muted px-1 text-[0.6rem] font-medium text-muted-foreground uppercase">
                  {item.peran}
                </span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {formatTanggalJam(item.dibuat.replace("T", " "))}
                </span>
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-line text-muted-foreground">
                {item.isi}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------- anggota

export function TabAnggota({
  anggota,
  ruang,
}: {
  anggota: AnggotaRow[];
  ruang: RuangHeader;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Guru pengampu", nilai: ruang.guruNama ?? "Belum ditentukan" },
          { label: "Jumlah siswa", nilai: `${anggota.length} siswa` },
          { label: "Tahun ajaran", nilai: `${ruang.taNama} ${ruang.taSemester}` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border/70 bg-card px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">
              {item.nilai}
            </p>
          </div>
        ))}
      </div>

      <Panel judul="Siswa" keterangan={`${anggota.length} siswa aktif`}>
        {anggota.length === 0 ? (
          <Kosong>Belum ada siswa di kelas ini.</Kosong>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {anggota.map((murid) => (
              <li
                key={murid.id}
                className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card px-3 py-2"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground">
                  {inisial(murid.nama)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{murid.nama}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {murid.nisn ?? "—"}
                    {murid.jk ? ` · ${murid.jk}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
