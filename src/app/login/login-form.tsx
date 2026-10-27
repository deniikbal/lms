"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    // Staff sign in with their email or NIP, students with their NISN. Anything
    // with an "@" is treated as an email address; the rest goes to the username
    // plugin, which is where NISN and NIP live.
    const { error: signInError } = identifier.includes("@")
      ? await signIn.email({ email: identifier, password })
      : await signIn.username({ username: identifier, password });

    if (signInError) {
      setError(
        signInError.status === 401
          ? "Email/NISN/NIP atau password salah."
          : (signInError.message ?? "Gagal masuk. Coba lagi."),
      );
      setPending(false);
      return;
    }

    // /dashboard reads the session on the server and forwards to the right role.
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="identifier">Email, NISN, atau NIP</FieldLabel>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="nama@sekolah.sch.id, NISN, atau NIP"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
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
          {pending ? "Memproses…" : "Masuk"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Daftar sebagai siswa
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
