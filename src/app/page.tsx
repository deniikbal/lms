import { Suspense } from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  CalendarClockIcon,
  ClipboardCheckIcon,
  CloudUploadIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  StarIcon,
  UserCheckIcon,
  UsersRoundIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { homeForRole, ROLES, ROLE_DESCRIPTION, ROLE_LABEL, type Role } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";
import { cn } from "@/lib/utils";

/** Per-role icon — the hero of each role card. */
const IKON_PERAN: Record<Role, LucideIcon> = {
  admin: ShieldCheckIcon,
  guru: GraduationCapIcon,
  siswa: BookOpenIcon,
};

/** What each role actually does in this LMS, beyond the one-liner. */
const SOROTAN_PERAN: Record<Role, string[]> = {
  admin: [
    "Kelola akun guru & siswa",
    "Atur kelas dan tahun ajaran",
    "Pantau seluruh ruang belajar",
  ],
  guru: [
    "Buat pertemuan dengan Google Meet",
    "Bagikan materi & lampiran PDF",
    "Nilai tugas langsung dari berkas siswa",
  ],
  siswa: [
    "Ikuti kelas lewat Google Meet",
    "Kumpulkan tugas: foto, kamera, atau PDF",
    "Pantau nilai dan status pengumpulan",
  ],
};

const FITUR: { ikon: LucideIcon; judul: string; isi: string }[] = [
  {
    ikon: VideoIcon,
    judul: "Google Meet terpasang otomatis",
    isi: "Setiap pertemuan punya ruang Meet sendiri. Tautannya muncul di kelas, siswa cukup satu klik untuk bergabung.",
  },
  {
    ikon: CloudUploadIcon,
    judul: "Kumpul tugas lewat kamera",
    isi: "Foto lembar pekerjaan langsung dari HP — dikompres otomatis agar ringan, tersimpan rapi di Google Drive.",
  },
  {
    ikon: ClipboardCheckIcon,
    judul: "Penilaian tanpa ribet",
    isi: "Guru melihat semua jawaban di satu layar, membuka berkas siswa, dan memberi nilai 0–100 tanpa berpindah halaman.",
  },
  {
    ikon: CalendarClockIcon,
    judul: "Tenggat yang jelas",
    isi: "Setiap tugas punya batas waktu dan status — belum dikumpul, terlambat, atau sudah dinilai — terlihat sejak daftar tugas.",
  },
  {
    ikon: UserCheckIcon,
    judul: "Presensi per pertemuan",
    isi: "Kehadiran dicatat per sesi. Guru mengunci pertemuan yang sudah direkap agar data tidak berubah sengaja.",
  },
  {
    ikon: UsersRoundIcon,
    judul: "Tiga peran, satu sistem",
    isi: "Admin, guru, dan siswa masing-masing punya dashboard sendiri. Satu akun, satu arah login, hak akses jelas.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        {/* Soft brand glow, purely decorative. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 max-w-3xl rounded-full bg-primary/15 blur-3xl"
        />

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
          <Badge variant="outline" className="gap-1.5 bg-background/60">
            <StarIcon className="size-3 text-amber-500" />
            Sistem Manajemen Pembelajaran Sekolah
          </Badge>

          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:text-6xl">
            Kelas daring yang sederhana untuk sekolah Anda
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Pertemuan, materi, tugas, presensi, dan nilai — semuanya di satu
            tempat. Terhubung langsung dengan Google Meet dan Google Drive,
            tanpa aplikasi tambahan.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Suspense fallback={<Skeleton className="h-10 w-64" />}>
              <AccountCta />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
        <h2 className="sr-only">Fitur utama</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FITUR.map(({ ikon: Ikon, judul, isi }) => (
            <Card key={judul} className="gap-3 py-5">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Ikon className="size-4.5" />
                </span>
                <CardTitle className="text-sm leading-snug">{judul}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">{isi}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- Roles ---- */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Satu akun, tiga peran
          </h2>
          <p className="mt-2 text-muted-foreground">
            Setelah login, sistem langsung mengarahkan Anda ke dashboard sesuai
            peran.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {ROLES.map((role) => {
            const Ikon = IKON_PERAN[role];
            return (
              <Card key={role} className="py-5">
                <CardHeader>
                  <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Ikon className="size-5" />
                  </span>
                  <CardTitle>{ROLE_LABEL[role]}</CardTitle>
                  <CardDescription>{ROLE_DESCRIPTION[role]}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-foreground/90">
                    {SOROTAN_PERAN[role].map((sorot) => (
                      <li key={sorot} className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className="mt-1.75 size-1.5 shrink-0 rounded-full bg-primary/60"
                        />
                        {sorot}
                      </li>
                    ))}
                  </ul>
                  <code className="mt-4 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {homeForRole(role)}
                  </code>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ---- Closing CTA ---- */}
      <Suspense fallback={null}>
        <Penutup />
      </Suspense>
    </main>
  );
}

/** Session-aware CTA — reads the request, so it lives behind <Suspense>. */
async function AccountCta() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className={cn(buttonVariants({ size: "lg" }), "h-10 px-6 text-base")}
      >
        Masuk
      </Link>
    );
  }

  return (
    <>
      <Link
        href={homeForRole(user.role)}
        className={cn(buttonVariants({ size: "lg" }), "h-10 gap-2 px-6 text-base")}
      >
        <LayoutDashboardIcon className="size-4.5" />
        Lanjut sebagai {ROLE_LABEL[user.role]}
      </Link>
      <span className="text-sm text-muted-foreground">
        Masuk sebagai {user.email}
      </span>
    </>
  );
}

/** Bottom banner, shown only to guests — members already have their CTA up top. */
async function Penutup() {
  const user = await getSessionUser();
  if (user) return null;

  return (
    <section className="border-t bg-muted/40">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Siap mulai belajar?
        </h2>
        <p className="max-w-md text-muted-foreground">
          Akun diberikan oleh sekolah. Hubungi admin atau guru Anda untuk
          mendapatkan akses, lalu masuk dengan NISN atau email.
        </p>
        <Link
          href="/login"
          className={cn(buttonVariants({ size: "lg" }), "h-10 px-6 text-base")}
        >
          Masuk ke akun
        </Link>
      </div>
    </section>
  );
}
