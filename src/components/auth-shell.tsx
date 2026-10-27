import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROLES, ROLE_LABEL } from "@/lib/roles";

/**
 * Shared layout for the login and register screens.
 *
 * `variant="split"` puts a brand panel beside the form (login); `"centered"`
 * keeps a single centred card (register). The panel is hidden below `lg`, where
 * the form takes the full width and the wordmark moves above the card.
 */
export function AuthShell({
  title,
  description,
  children,
  variant = "centered",
}: {
  title: string;
  description: string;
  children: ReactNode;
  variant?: "centered" | "split";
}) {
  const split = variant === "split";

  return (
    <main className="flex flex-1 flex-col lg:flex-row">
      {split ? <BrandPanel /> : null}

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className={[
              "mb-8 flex items-center justify-center gap-2 text-sm font-semibold tracking-tight text-foreground",
              split ? "lg:hidden" : "",
            ].join(" ")}
          >
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              L
            </span>
            LMS Sekolah
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

/** Decorative left column: only rendered for the split variant. */
function BrandPanel() {
  return (
    <aside className="hidden w-1/2 flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
      <Link
        href="/"
        className="flex w-fit items-center gap-2 text-sm font-semibold tracking-tight"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-primary-foreground text-primary">
          L
        </span>
        LMS Sekolah
      </Link>

      <div>
        <p className="max-w-sm text-3xl font-semibold tracking-tight text-balance">
          Satu akun, tiga peran.
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed opacity-80">
          Masuk sekali, sistem mengarahkan Anda ke dashboard yang sesuai: admin,
          guru, atau siswa.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <span
              key={role}
              className="rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium"
            >
              {ROLE_LABEL[role]}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs opacity-70">Sistem Manajemen Pembelajaran</p>
    </aside>
  );
}
