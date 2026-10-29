import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  BookOpenIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  DoorOpenIcon,
  ListChecksIcon,
  PresentationIcon,
  UserRoundIcon,
} from "lucide-react";

import { KotakAngka } from "@/components/kotak-angka";
import { LoadingPanel } from "@/components/loading-panel";
import { TONE } from "@/components/ruang-belajar/tone";
import { warnaMapelSaja } from "@/components/warna-mapel";
import { cn } from "@/lib/utils";
import { listRuangKelas, listTugasMenunggu } from "@/lib/ruang-belajar";
import { formatTanggalJam, hariIni } from "@/lib/ruang-belajar-shared";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dashboard Siswa · LMS Sekolah",
};

export default function SiswaPage() {
  return (
    <Suspense fallback={<LoadingPanel varian="daftar" />}>
      <Dashboard />
    </Suspense>
  );
}

/** First name only — "Halo, Ahda" reads like a person, the full name like a form. */
function sapaan(nama: string): string {
  const depan = nama.trim().split(/\s+/)[0] ?? nama;
  // Indonesian school records are often all-caps; title-case it so the greeting
  // does not shout.
  return depan.charAt(0).toUpperCase() + depan.slice(1).toLowerCase();
}

async function Dashboard() {
  const user = await requireRole("siswa");

  const [ruang, menunggu] = user.kelasId
    ? await Promise.all([
        listRuangKelas(user.kelasId),
        listTugasMenunggu(user.kelasId, user.id),
      ])
    : [[], []];

  const kelas = ruang[0]?.kelas_nama ?? null;
  const total = ruang.reduce(
    (jumlah, item) => ({
      pertemuan: jumlah.pertemuan + item.pertemuan,
      tugas: jumlah.tugas + item.tugas,
      kuis: jumlah.kuis + item.kuis,
    }),
    { pertemuan: 0, tugas: 0, kuis: 0 },
  );
  const jumlahMapel = new Set(ruang.map((item) => item.mapel_nama ?? "-")).size;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-foreground">
            Halo, {sapaan(user.name)}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {kelas ? (
              <>
                <span className="text-foreground">{kelas}</span>
                <span aria-hidden>·</span>
              </>
            ) : (
              <span>Akun Anda belum terdaftar di kelas mana pun.</span>
            )}
            <span className="tabular-nums">{user.username ?? user.email}</span>
          </p>
        </div>

        <Link
          href="/siswa/ruang"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
        >
          Semua ruang
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </header>

      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <KotakAngka
          warna="indigo"
          ikon={<DoorOpenIcon className="size-3.5" />}
          label="Ruang"
          nilai={ruang.length}
          catatan={`${jumlahMapel} mapel`}
        />
        <KotakAngka
          warna="sky"
          ikon={<PresentationIcon className="size-3.5" />}
          label="Pertemuan"
          nilai={total.pertemuan}
        />
        <KotakAngka
          warna="amber"
          ikon={<ClipboardListIcon className="size-3.5" />}
          label="Tugas"
          nilai={total.tugas}
          catatan={menunggu.length > 0 ? `${menunggu.length} menunggu` : undefined}
        />
        <KotakAngka
          warna="emerald"
          ikon={<ListChecksIcon className="size-3.5" />}
          label="Kuis"
          nilai={total.kuis}
        />
      </dl>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* What the student has to do comes first; the rooms are navigation. */}
        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">Tugas menunggu</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {menunggu.length > 0 ? `${menunggu.length} tugas` : "tidak ada"}
            </span>
          </div>

          {menunggu.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <ClipboardListIcon className="mx-auto size-6 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">
                Tidak ada tugas yang menunggu.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Tugas yang sudah dikumpulkan atau sudah dinilai tidak muncul di sini.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {menunggu.map((item) => {
                const tenggat = formatTanggalJam(item.tenggat);
                return (
                  <li key={item.id}>
                    <Link
                      href={`/siswa/ruang/${item.ruangId}/tugas/${item.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
                        <ClipboardListIcon className="size-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {item.judul}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.mapel ?? "Tanpa mapel"} · {item.kelas}
                        </span>
                      </span>

                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1 tabular-nums",
                          item.lewat
                            ? TONE.merah
                            : item.tenggat && hariIni(item.tenggat.slice(0, 10))
                              ? TONE.kuning
                              : TONE.netral,
                        )}
                      >
                        {tenggat ?? "Tanpa tenggat"}
                      </span>

                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">Ruang belajar</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {ruang.length} ruang
            </span>
          </div>

          {ruang.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <DoorOpenIcon className="mx-auto size-5 text-muted-foreground/60" />
              <p className="mt-2 text-sm text-muted-foreground">
                Belum ada ruang untuk kelas Anda.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hubungi admin sekolah.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {ruang.map((item) => {
                const warna = warnaMapelSaja(item.mapel_kode, item.mapel_nama, item.id);
                return (
                  <li key={item.id}>
                    <Link
                      href={`/siswa/ruang/${item.id}`}
                      className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <span
                        aria-hidden
                        className={cn("size-2 shrink-0 rounded-full", warna.garis)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {item.mapel_nama ?? "Tanpa mapel"}
                        </span>
                        <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <UserRoundIcon className="size-3 shrink-0" />
                          {item.guru_nama ?? "Belum ada guru"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.7rem] text-muted-foreground tabular-nums">
                        {item.pertemuan} pertemuan
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {ruang.length > 0 ? (
            <Link
              href="/siswa/ruang"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <BookOpenIcon className="size-3.5" />
              Buka katalog ruang
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
