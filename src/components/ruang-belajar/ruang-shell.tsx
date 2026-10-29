import Link from "next/link";
import {
  ChevronRightIcon,
  SchoolIcon,
  TargetIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getNilai,
  getPresensiMatriks,
  listAnggota,
  listDiskusi,
  listKuis,
  listPertemuan,
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
        navigation, instead of a loose heading followed by a second loose strip.
      */}
      <div className="overflow-hidden rounded-xl border border-indigo-500/25 bg-card shadow-sm dark:border-indigo-400/25">
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  {ruang.mapelNama}
                </h1>
                <Badge variant="secondary">{ruang.mapelKode}</Badge>
                <Badge variant="outline" className="tabular-nums">
                  {ruang.taNama} · {ruang.taSemester}
                </Badge>
              </div>

              {ruang.deskripsi ? (
                <p className="max-w-3xl line-clamp-2 text-sm whitespace-pre-line text-muted-foreground">
                  {ruang.deskripsi}
                </p>
              ) : null}
            </div>

            {bolehUbah(peran) ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <BuatDialog ruangId={ruang.id} jenis="pertemuan" />
                <BuatDialog ruangId={ruang.id} jenis="tugas" />
                <BuatDialog ruangId={ruang.id} jenis="kuis" />
              </div>
            ) : null}
          </div>

          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              warna="emerald"
              ikon={<SchoolIcon className="size-3.5" />}
              label="Kelas"
              nilai={ruang.kelasNama}
            />
            <Info
              warna="sky"
              ikon={<UserRoundIcon className="size-3.5" />}
              label="Guru pengampu"
              nilai={ruang.guruNama ?? "Belum ada guru"}
            />
            <Info
              warna="amber"
              ikon={<TargetIcon className="size-3.5" />}
              label="KKM"
              nilai={String(ruang.kkm)}
            />
            <Info
              warna="violet"
              ikon={<UsersIcon className="size-3.5" />}
              label="Siswa"
              nilai={`${ruang.jumlahSiswa} siswa`}
            />
          </dl>
        </div>

        <div className="border-t border-indigo-500/20 bg-indigo-500/[0.04] px-2 dark:border-indigo-400/20 dark:bg-indigo-400/[0.06]">
          <RuangTabs base={base} aktif={aktif} peran={peran} batas={false} />
        </div>
      </div>

      <IsiTab ruang={ruang} peran={peran} aktif={aktif} userId={userId} base={base} />
    </div>
  );
}

/**
 * Border and icon tint for each fact box.
 *
 * Spelled out as whole class strings because Tailwind only sees literal text —
 * `border-${warna}-500/30` would be dropped from the build. The four hues are
 * cool except KKM's amber, which is the one number worth noticing.
 */
const WARNA_INFO = {
  emerald: {
    kotak:
      "border-emerald-600/25 bg-emerald-500/[0.06] dark:border-emerald-400/25 dark:bg-emerald-400/[0.08]",
    ikon: "text-emerald-600 dark:text-emerald-400",
  },
  sky: {
    kotak:
      "border-sky-600/25 bg-sky-500/[0.06] dark:border-sky-400/25 dark:bg-sky-400/[0.08]",
    ikon: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    kotak:
      "border-amber-600/30 bg-amber-500/[0.07] dark:border-amber-400/25 dark:bg-amber-400/[0.08]",
    ikon: "text-amber-600 dark:text-amber-400",
  },
  violet: {
    kotak:
      "border-violet-600/25 bg-violet-500/[0.06] dark:border-violet-400/25 dark:bg-violet-400/[0.08]",
    ikon: "text-violet-600 dark:text-violet-400",
  },
} as const;

/** One labelled fact inside the room card. */
function Info({
  warna,
  ikon,
  label,
  nilai,
}: {
  warna: keyof typeof WARNA_INFO;
  ikon: React.ReactNode;
  label: string;
  nilai: string;
}) {
  const tone = WARNA_INFO[warna];
  return (
    <div className={cn("rounded-lg border px-2.5 py-1.5", tone.kotak)}>
      <dt className="flex items-center gap-1 text-[0.7rem] tracking-wide text-muted-foreground uppercase">
        <span className={tone.ikon}>{ikon}</span>
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{nilai}</dd>
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
      const matriks = await getPresensiMatriks(ruang.id, ruang.kelasId);
      return <TabPresensi matriks={matriks} siswaId={userId} />;
    }
    case "nilai": {
      const nilai = await getNilai(ruang.id, ruang.kelasId);
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
