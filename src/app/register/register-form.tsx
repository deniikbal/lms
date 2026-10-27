"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setPending(true);

    // `role` is deliberately not sent: the server always assigns "siswa".
    const { error: signUpError } = await signUp.email({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password,
    });

    if (signUpError) {
      setError(
        signUpError.status === 422 || signUpError.code === "USER_ALREADY_EXISTS"
          ? "Email ini sudah terdaftar."
          : (signUpError.message ?? "Gagal mendaftar. Coba lagi."),
      );
      setPending(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nama lengkap</FieldLabel>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Budi Santoso"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@sekolah.sch.id"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="Minimal 8 karakter"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">Ulangi password</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="••••••••"
            required
          />
        </Field>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Mendaftar…" : "Daftar"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Masuk
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
