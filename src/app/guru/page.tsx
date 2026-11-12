import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarClockIcon,
  ClipboardCheckIcon,
  DoorOpenIcon,
  LibraryBigIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";

import { LoadingPanel } from "@/components/loading-panel";
import { listJadwalHariIni, listTugasPerluDinilai } from "@/lib/guru-dashboard";
import { listRuangGuru, type RingkasRuang } from "@/lib/ruang-belajar";
import { ringkasBank } from "@/lib/bank-soal";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard Guru · LMS Sekolah",
};

export default function GuruPage() {
  return (
    <Suspense fallback={<LoadingPanel varian="daftar" />}>
      <GuruDashboard />
    </Suspense>
  );
}

function tanggalJakarta(): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function jamJakarta(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function GuruDashboard() {
  const user = await requireRole("guru");

  const [ruang, tugasDinilai, jadwal, bank] = await Promise.all([
    listRuangGuru(user.id),
    listTugasPerluDinilai(user.id),
    listJadwalHariIni(user.id),
    ringkasBank(user.id),
  ]);

  const totalSiswa = ruang.reduce((n, r) => n + r.siswa, 0);
  const belumDinilai = tugasDinilai.reduce((n, t) => n + (t.masuk - t.dinilai), 0);
  const mapel = new Set(ruang.map((r) => r.mapel_nama ?? "-")).size;

  return (
    <section className="space-y-6">
      {/* ------------------------------------------------------------ header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            {tanggalJakarta()}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {user.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ruang.length} ruang · {mapel} mata pelajaran · {totalSiswa} siswa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/guru/bank-soal"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm font-medium",
              "bg-card text-foreground ring-1 ring-foreground/10 transition-colors",
              "hover:bg-accent",
            )}
          >
            <LibraryBigIcon className="size-4" />
            Bank soal
          </Link>
          <Link
            href="/guru/ruang"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm font-medium",
              "bg-foreground text-background transition-opacity hover:opacity-90",
            )}
          >
            <DoorOpenIcon className="size-4" />
            Ruang belajar
          </Link>
        </div>
      </header>

      {/* ----------------------------------------------------------- metrik */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metrik
          label="Ruang diampu"
          nilai={ruang.length}
          catatan={`${mapel} mata pelajaran`}
          href="/guru/ruang"
        />
        <Metrik
          label="Siswa"
          nilai={totalSiswa}
          catatan="di seluruh ruang"
          ikon={<UsersIcon className="size-4" />}
        />
        <Metrik
          label="Perlu dinilai"
          nilai={belumDinilai}
          catatan={`dari ${tugasDinilai.length} tugas`}
          ikon={<ClipboardCheckIcon className="size-4" />}
          sorot={belumDinilai > 0}
          href={belumDinilai > 0 ? "/guru/ruang" : undefined}
        />
        <Metrik
          label="Soal di bank"
          nilai={bank.total}
          catatan={`${bank.topik} topik`}
          href="/guru/bank-soal"
        />
      </div>

      {/* ------------------------------------------------------------ isi */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <KartuJadwal jadwal={jadwal} jam={jamJakarta()} />
        </div>
        <div className="lg:col-span-2">
          <KartuDinilai tugas={tugasDinilai} />
        </div>
      </div>

      <KartuRuang ruang={ruang} />
    </section>
  );
}

// --------------------------------------------------------------- primitives

function Kerangka({
  judul,
  keterangan,
  aksi,
  className,
  children,
}: {
  judul: string;
  keterangan?: string;
  aksi?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-sm bg-card ring-1 ring-foreground/10",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{judul}</h2>
          {keterangan ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{keterangan}</p>
          ) : null}
        </div>
        {aksi}
      </div>
      {children}
    </section>
  );
}

function Metrik({
  label,
  nilai,
  catatan,
  ikon,
  sorot,
  href,
}: {
  label: string;
  nilai: number;
  catatan: string;
  ikon?: React.ReactNode;
  sorot?: boolean;
  href?: string;
}) {
  const isi = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {ikon ? <span className="text-muted-foreground">{ikon}</span> : null}
      </div>
      <p className="mt-3 text-2xl leading-none font-semibold tabular-nums tracking-tight text-foreground">
        {nilai}
      </p>
      <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        {catatan}
        {href ? (
          <ArrowUpRightIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
        ) : null}
      </p>
      {sorot ? (
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground/70"
        />
      ) : null}
    </>
  );

  const kelas = cn(
    "group relative block overflow-hidden rounded-sm bg-card p-4 ring-1 ring-foreground/10",
    href && "transition-colors hover:bg-accent",
  );

  return href ? (
    <Link href={href} className={kelas}>
      {isi}
    </Link>
  ) : (
    <div className={kelas}>{isi}</div>
  );
}

// ------------------------------------------------------------------- jadwal

function KartuJadwal({
  jadwal,
  jam,
}: {
  jadwal: Awaited<ReturnType<typeof listJadwalHariIni>>;
  jam: string;
}) {
  const menitKini = Number(jam.slice(0, 2)) * 60 + Number(jam.slice(3, 5));

  return (
    <Kerangka
      judul="Jadwal hari ini"
      keterangan={
        jadwal.length > 0
          ? `${jadwal.length} sesi · waktu Jakarta`
          : "Tidak ada sesi hari ini"
      }
      aksi={
        <span className="rounded-sm bg-muted px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground">
          {jam} WIB
        </span>
      }
    >
      {jadwal.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <CalendarClockIcon className="mx-auto size-6 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Tidak ada jadwal mengajar hari ini.
          </p>
          <Link
            href="/guru/ruang"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Siapkan materi
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {jadwal.map((slot) => {
            const berlangsung =
              slot.mulaiMenit <= menitKini && menitKini < slot.selesaiMenit;
            const lewat = menitKini >= slot.selesaiMenit;
            return (
              <li key={`${slot.ruangId}-${slot.jamMulai}`}>
                <Link
                  href={`/guru/ruang/${slot.ruangId}`}
                  className={cn(
                    "group relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent",
                    lewat && "opacity-55",
                  )}
                >
                  {berlangsung ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-0.5 bg-foreground"
                    />
                  ) : null}

                  <div className="w-12 shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {slot.jamMulai}
                    </p>
                    <p className="text-[0.7rem] tabular-nums text-muted-foreground">
                      {slot.jamSelesai}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                      {slot.mapel ?? "Tanpa mapel"}
                      {berlangsung ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-foreground px-1.5 py-0.5 text-[0.65rem] font-medium text-background">
                          <span className="relative flex size-1">
                            <span className="absolute inline-flex size-full animate-ping rounded-sm bg-background opacity-70" />
                            <span className="relative inline-flex size-1 rounded-sm bg-background" />
                          </span>
                          sekarang
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {slot.kelas}
                    </p>
                  </div>

                  {slot.linkMeet && !lewat ? (
                    <span className="grid size-7 shrink-0 place-items-center rounded-sm ring-1 ring-foreground/10 text-muted-foreground">
                      <VideoIcon className="size-3.5" />
                    </span>
                  ) : null}

                  <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Kerangka>
  );
}

// ------------------------------------------------------------------- tugas

function KartuDinilai({
  tugas,
}: {
  tugas: Awaited<ReturnType<typeof listTugasPerluDinilai>>;
}) {
  const belum = tugas.reduce((n, t) => n + (t.masuk - t.dinilai), 0);

  return (
    <Kerangka
      judul="Menunggu penilaian"
      keterangan={
        tugas.length === 0
          ? "Tidak ada antrean"
          : `${belum} kiriman dari ${tugas.length} tugas`
      }
      aksi={
        tugas.length > 0 ? (
          <Link
            href="/guru/ruang"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Semua
          </Link>
        ) : null
      }
    >
      {tugas.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <ClipboardCheckIcon className="mx-auto size-6 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Semua kiriman sudah dinilai.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {tugas.slice(0, 5).map((t) => {
            const sisa = t.masuk - t.dinilai;
            const persen = Math.round((t.dinilai / t.masuk) * 100);
            return (
              <li key={t.tugasId}>
                <Link
                  href={`/guru/ruang/${t.ruangId}`}
                  className="group block px-4 py-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-foreground">
                      {t.judul}
                    </p>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">{sisa}</span>
                      /{t.masuk}
                    </span>
                  </div>

                  <div className="mt-2 h-1 overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-full rounded-sm bg-foreground/75 transition-all"
                      style={{ width: `${persen}%` }}
                    />
                  </div>

                  <p className="mt-1.5 flex items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
                    <span className="truncate">
                      {t.mapel ?? "Tanpa mapel"} · {t.kelas}
                    </span>
                    <span className="shrink-0 tabular-nums">{persen}% dinilai</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Kerangka>
  );
}

// ------------------------------------------------------------------- ruang

function KartuRuang({ ruang }: { ruang: RingkasRuang[] }) {
  return (
    <Kerangka
      judul="Ruang belajar"
      keterangan={
        ruang.length === 0
          ? "Belum ada ruang yang diampu"
          : `${ruang.length} ruang yang Anda ampu`
      }
      aksi={
        ruang.length > 0 ? (
          <Link
            href="/guru/ruang"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Kelola
            <ArrowRightIcon className="size-3" />
          </Link>
        ) : null
      }
    >
      {ruang.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Minta admin menetapkan Anda sebagai guru pengampu di Pembagian
          Mengajar.
        </p>
      ) : (
        <ul className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
          {ruang.map((r) => (
            <li key={r.id} className="bg-card">
              <Link
                href={`/guru/ruang/${r.id}`}
                className="group flex h-full flex-col gap-3 p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.mapel_nama ?? "Tanpa mapel"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Kelas {r.kelas_nama}
                    </p>
                  </div>
                  <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>

                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3">
                  {[
                    { label: "Siswa", nilai: r.siswa },
                    { label: "Pertemuan", nilai: r.pertemuan },
                    { label: "Tugas", nilai: r.tugas + r.kuis },
                  ].map((sel) => (
                    <div key={sel.label}>
                      <dt className="text-[0.7rem] text-muted-foreground">
                        {sel.label}
                      </dt>
                      <dd className="text-sm font-semibold tabular-nums text-foreground">
                        {sel.nilai}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Kerangka>
  );
}
