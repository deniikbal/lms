import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/components/auth-shell";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Daftar · LMS Sekolah",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Daftar akun siswa"
      description="Pendaftaran mandiri hanya untuk siswa. Akun guru dan admin dibuat oleh administrator."
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <RegisterForm />
    </AuthShell>
  );
}
