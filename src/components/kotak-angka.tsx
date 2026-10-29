import { cn } from "@/lib/utils";

/**
 * A single number, boxed with its own tint.
 *
 * Used wherever a small set of counts sits above a list, so the same count keeps
 * the same colour across the bank and the room: topics indigo, multiple choice
 * emerald, essays sky, usage violet, totals amber.
 */
export const WARNA_ANGKA = {
  indigo: {
    kotak:
      "border-indigo-600/25 bg-indigo-500/[0.06] dark:border-indigo-400/25 dark:bg-indigo-400/[0.08]",
    ikon: "text-indigo-600 dark:text-indigo-400",
  },
  emerald: {
    kotak:
      "border-emerald-600/25 bg-emerald-500/[0.06] dark:border-emerald-400/25 dark:bg-emerald-400/[0.08]",
    ikon: "text-emerald-600 dark:text-emerald-400",
  },
  sky: {
    kotak:
      "border-sky-600/25 bg-sky-500/[0.06] dark:border-sky-400/25 dark:bg-sky-400/[0.08]",
    ikon: "text-sky-600 dark:text-sky-400",
  },
  violet: {
    kotak:
      "border-violet-600/25 bg-violet-500/[0.06] dark:border-violet-400/25 dark:bg-violet-400/[0.08]",
    ikon: "text-violet-600 dark:text-violet-400",
  },
  amber: {
    kotak:
      "border-amber-600/30 bg-amber-500/[0.07] dark:border-amber-400/25 dark:bg-amber-400/[0.08]",
    ikon: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    kotak:
      "border-rose-600/25 bg-rose-500/[0.06] dark:border-rose-400/25 dark:bg-rose-400/[0.08]",
    ikon: "text-rose-600 dark:text-rose-400",
  },
} as const;

export function KotakAngka({
  warna,
  ikon,
  label,
  nilai,
  catatan,
}: {
  warna: keyof typeof WARNA_ANGKA;
  ikon: React.ReactNode;
  label: string;
  /** Not always a number: "—" stands in when a count has no meaning yet. */
  nilai: number | string;
  catatan?: string;
}) {
  const tone = WARNA_ANGKA[warna];
  return (
    <div className={cn("rounded-lg border px-2.5 py-1.5", tone.kotak)}>
      <dt className="flex items-center gap-1 text-[0.7rem] tracking-wide text-muted-foreground uppercase">
        <span className={tone.ikon}>{ikon}</span>
        {label}
      </dt>
      <dd className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-base font-semibold tabular-nums text-foreground">
          {nilai}
        </span>
        {catatan ? (
          <span className="truncate text-xs text-muted-foreground">{catatan}</span>
        ) : null}
      </dd>
    </div>
  );
}