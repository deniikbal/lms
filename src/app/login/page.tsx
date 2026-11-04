import { Suspense } from "react";
import type { Metadata } from "next";
import { InfoIcon } from "lucide-react";

import { AuthShell } from "@/components/auth-shell";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk · LMS Sekolah",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Masuk"
      description="Gunakan email dan password akun sekolah Anda."
      variant="split"
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <LoginForm />

      {/* Help for students: they sign in with their NISN, not an email. */}
      <aside
        aria-label="Info login siswa"
        className="mt-5 rounded-lg border border-border/70 bg-muted/40 p-4"
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground uppercase">
          <InfoIcon className="size-3.5 text-primary" />
          Info untuk siswa
        </p>
        <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <li>
            <strong className="font-medium text-foreground">
              Masuk dengan NISN
            </strong>{" "}
            — tulis NISN Anda di kolom pertama, tidak perlu email.
          </li>
          <li>
            <strong className="font-medium text-foreground">Password</strong>{" "}
            diberikan oleh guru atau admin sekolah saat akun dibuatkan.
          </li>
          <li>
            Lupa password? Hubungi guru atau admin untuk mengatur ulang.
          </li>
        </ul>
      </aside>
    </AuthShell>
  );
}
