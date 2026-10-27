import { Suspense } from "react";
import Link from "next/link";

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
import { homeForRole, ROLES, ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-16 sm:px-6">
      <Badge variant="outline" className="w-fit">
        Sistem Manajemen Pembelajaran
      </Badge>

      <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Satu akun, tiga peran.
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Login dengan email dan password, lalu sistem mengarahkan Anda ke
        dashboard sesuai peran: admin, guru, atau siswa.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Suspense fallback={<Skeleton className="h-9 w-40" />}>
          <AccountCta />
        </Suspense>
      </div>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="text-sm">{ROLE_LABEL[role]}</CardTitle>
              <CardDescription>{ROLE_DESCRIPTION[role]}</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                {homeForRole(role)}
              </code>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}

/** Session-aware CTA — reads the request, so it lives behind <Suspense>. */
async function AccountCta() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <>
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Masuk
        </Link>
        <Link
          href="/register"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Daftar sebagai siswa
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        href={homeForRole(user.role)}
        className={buttonVariants({ size: "lg" })}
      >
        Lanjut sebagai {ROLE_LABEL[user.role]}
      </Link>
      <span className="text-sm text-muted-foreground">
        Masuk sebagai {user.email}
      </span>
    </>
  );
}
