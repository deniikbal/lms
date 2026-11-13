import Link from "next/link";
import { ChevronRightIcon, PlusIcon } from "lucide-react";

import { BuatDialog } from "@/components/ruang-belajar/buat-dialog";
import { RuangTabs } from "@/components/ruang-belajar/ruang-tabs";
import { TabMateri } from "@/components/ruang-belajar/tab-materi";
import { TabKuis } from "@/components/ruang-belajar/tab-kuis";
import { TabPengaturan } from "@/components/ruang-belajar/tab-pengaturan";
import {
  TabAnggota,
  TabDiskusi,
  TabNilai,
  TabPresensi,
  TabTugas,
} from "@/components/ruang-belajar/tab-lain";
import { Button } from "@/components/ui/button";
import { tautanFolderDrive } from "@/lib/drive";
import { cn } from "@/lib/utils";
import {
  getNilai,
  getPresensiMatriks,
  listAnggota,
  listDiskusi,
  listKuis,
  listLampiranGuru,
  listPertemuan,
  listRuangSejenis,
  listTugas,
} from "@/lib/ruang-belajar";
import {
  bolehUbah,
  type PeranRuang,
  type RuangHeader,
  type TabKey,
} from "@/lib/ruang-belajar-shared";

/**
 * The room page, shared by `/guru/ruang/[id]` and `/admin/ruang/[id]`.
 *
 * Only the active tab is queried, so opening Materi does not drag the grade
 * table's joins along with it.
 */
export async function RuangShell({
  ruang,
  peran,
  aktif,
  base,
  daftarHref,
  userId,
}: {
  ruang: RuangHeader;
  peran: PeranRuang;
  aktif: TabKey;
  base: string;
  daftarHref: string;
  userId: string;
}) {
  // Parallel classes for the "create for several classes" option — only worth
  // querying when the visitor can actually create anything.
  const sejenis = bolehUbah(peran)
    ? await listRuangSejenis(ruang.id, userId)
    : [];
  // PDF yang sudah pernah diunggah — supaya satu berkas Drive dipakai di banyak kelas.
  const lampiranTersedia = bolehUbah(peran) ? await listLampiranGuru(userId) : [];
  // Folder Drive kelas ini, supaya "buka Drive" langsung mendarat di laci yang benar.
  const driveKelas = bolehUbah(peran)
    ? await tautanFolderDrive(["Pertemuan", ruang.kelasNama])
    : null;
  return (
    <div className="space-y-4">
      <nav
        aria-label="Remah roti"
        className="flex items-center gap-1 text-xs text-muted-foreground"
      >
        <Link
          href={daftarHref}
          className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Ruang Belajar
        </Link>
        <ChevronRightIcon className="size-3" />
        <span className="text-foreground">{ruang.kelasNama}</span>
      </nav>

      {/*
        The room's identity is one card and the tabs are its footer: everything
        that answers "which class is this?" sits inside the same frame as the
        navigation. Four equal coloured fact boxes used to sit here, which put
        four focal points above the content; the facts are now one quiet row so
        the active tab and its material are what the eye lands on.
      */}
      <div className="overflow-hidden rounded-sm border border-border bg-card">
        {/*
          Phone: title block on its own line, then the actions as a full-width
          primary plus a pair of outline buttons. Side by side they overlapped
          the title and squeezed the subject name into a column two words wide.
        */}
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5 sm:flex-1">
            <h1 className="text-lg font-semibold tracking-tight break-words text-foreground sm:text-xl">
              {ruang.mapelNama}
            </h1>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm text-muted-foreground">
                {ruang.kelasNama}
              </span>
              {ruang.mapelKode ? (
                <span className="rounded-sm bg-brand/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-brand ring-1 ring-brand/25">
                  {ruang.mapelKode}
                </span>
              ) : null}
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground tabular-nums ring-1 ring-border">
                {ruang.taNama} {ruang.taSemester}
              </span>
            </div>

            {ruang.deskripsi ? (
              <p className="max-w-3xl line-clamp-2 text-sm whitespace-pre-line text-muted-foreground">
                {ruang.deskripsi}
              </p>
            ) : null}
          </div>

          {bolehUbah(peran) ? (
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              {/* Satu aksi utama: pertemuan adalah yang paling sering dibuat. */}
              <BuatDialog
                ruangId={ruang.id}
                jenis="pertemuan"
                kelasLain={sejenis}
                lampiranTersedia={lampiranTersedia}
                driveUrl={driveKelas}
                pemicu={
                  <Button
                    size="sm"
                    className="h-11 w-full justify-center bg-brand text-white hover:bg-brand/90 sm:h-7 sm:w-auto"
                  >
                    <PlusIcon aria-hidden />
                    Buat pertemuan
                  </Button>
                }
              />
              <BuatDialog
                ruangId={ruang.id}
                jenis="tugas"
                kelasLain={sejenis}
                kelasTombol="h-11 flex-1 justify-center sm:h-7 sm:flex-none"
              />
              <BuatDialog
                ruangId={ruang.id}
                jenis="kuis"
                kelasTombol="h-11 flex-1 justify-center sm:h-7 sm:flex-none"
              />
            </div>
          ) : null}
        </div>

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-border/70 bg-muted/30 px-4 py-2 text-xs">
          <Fact label="Guru pengampu" nilai={ruang.guruNama ?? "Belum ada guru"} />
          <Fact label="KKM" nilai={String(ruang.kkm)} />
          <Fact label="Siswa" nilai={`${ruang.jumlahSiswa} siswa`} />
        </dl>

        <div className="border-t border-border/70">
          <RuangTabs base={base} aktif={aktif} peran={peran} batas={false} />
        </div>
      </div>

      <IsiTab ruang={ruang} peran={peran} aktif={aktif} userId={userId} base={base} />
    </div>
  );
}

/**
 * One labelled fact in the room's fact row.
 *
 * No icon and no coloured box: the label already says what the value is, so a
 * tint would add a fourth focal point to a row that is meant to be read once.
 */
function Fact({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{nilai}</dd>
    </div>
  );
}

async function IsiTab({
  ruang,
  peran,
  aktif,
  userId,
  base,
}: {
  ruang: RuangHeader;
  peran: PeranRuang;
  aktif: TabKey;
  userId: string;
  base: string;
}) {
  switch (aktif) {
    case "materi": {
      const pertemuan = await listPertemuan(ruang.id, peran, userId);
      return (
        <TabMateri
          ruang={ruang}
          pertemuan={pertemuan}
          peran={peran}
          base={base}
        />
      );
    }
    case "tugas": {
      const tugas = await listTugas(ruang.id, userId, bolehUbah(peran));
      return (
        <TabTugas
          tugas={tugas}
          peran={peran}
          base={base}
          jumlahSiswa={ruang.jumlahSiswa}
        />
      );
    }
    case "kuis": {
      const kuis = await listKuis(ruang.id, userId, bolehUbah(peran));
      return <TabKuis kuis={kuis} peran={peran} base={base} />;
    }
    case "presensi": {
      // Siswa hanya melihat baris presensinya sendiri; guru dan admin melihat semua.
      const matriksPenuh = await getPresensiMatriks(ruang.id, ruang.kelasId);
      const matriks = peran === "siswa"
        ? {
            ...matriksPenuh,
            siswa: matriksPenuh.siswa.filter((s) => s.id === userId),
          }
        : matriksPenuh;
      return <TabPresensi matriks={matriks} siswaId={userId} />;
    }
    case "nilai": {
      // Siswa hanya melihat rapornya sendiri; guru dan admin melihat semua.
      const semua = await getNilai(ruang.id, ruang.kelasId);
      const nilai = peran === "siswa"
        ? semua.filter((row) => row.siswaId === userId)
        : semua;
      return <TabNilai nilai={nilai} ruang={ruang} />;
    }
    case "diskusi": {
      const diskusi = await listDiskusi(ruang.id);
      return <TabDiskusi ruangId={ruang.id} diskusi={diskusi} userId={userId} />;
    }
    case "anggota": {
      const anggota = await listAnggota(ruang.kelasId);
      return <TabAnggota anggota={anggota} ruang={ruang} />;
    }
    case "pengaturan": {
      if (!bolehUbah(peran)) return null;
      return <TabPengaturan ruang={ruang} />;
    }
  }
}
