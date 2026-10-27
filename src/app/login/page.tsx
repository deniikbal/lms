import { Suspense } from "react";
import type { Metadata } from "next";

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
    </AuthShell>
  );
}
