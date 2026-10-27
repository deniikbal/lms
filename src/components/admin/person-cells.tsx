import { cn } from "@/lib/utils";

/**
 * Presentational cells for the student table.
 *
 * Server Components on purpose: none of them hold state, and the relative
 * timestamp is computed once per render rather than ticking in the browser.
 */

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Monogram({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full border border-border/60 bg-secondary text-[0.7rem] font-medium text-secondary-foreground"
    >
      {initials(name)}
    </span>
  );
}

/** Dot + label instead of a filled pill — quieter, and it reads at a glance. */
export function StatusDot({ aktif }: { aktif: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          aktif ? "bg-primary" : "bg-muted-foreground/40",
        )}
      />
      <span className={aktif ? "text-foreground" : "text-muted-foreground"}>
        {aktif ? "Aktif" : "Nonaktif"}
      </span>
    </span>
  );
}

export function KelasChip({
  nama,
  kosong = "Tanpa kelas",
}: {
  nama: string | null;
  kosong?: string;
}) {
  if (!nama) {
    return <span className="text-xs text-muted-foreground">{kosong}</span>;
  }

  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
      {nama}
    </span>
  );
}

export function formatExact(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

/** "2 jam lalu" reads faster than a full timestamp in a dense table. */
export function relativeTime(value: Date | null): string {
  if (!value) return "Belum pernah";

  const minutes = Math.floor((Date.now() - value.getTime()) / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;

  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value);
}

export function RelativeTime({ value }: { value: Date | null }) {
  if (!value) {
    return <span className="text-xs text-muted-foreground">Belum pernah</span>;
  }

  return (
    <time
      dateTime={value.toISOString()}
      title={formatExact(value)}
      // The list is rendered on the server and hydrated on the client, so the
      // relative label can differ by a second at the boundary.
      suppressHydrationWarning
      className="text-xs text-muted-foreground"
    >
      {relativeTime(value)}
    </time>
  );
}
