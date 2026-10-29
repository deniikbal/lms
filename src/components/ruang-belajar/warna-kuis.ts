import type { KuisStatus } from "@/lib/ruang-belajar-shared";

/**
 * One hue per quiz state, used by the quiz list and the quiz's own page.
 *
 * State is what a teacher scans for — "what is open right now" — so it owns the
 * only colour on an otherwise neutral row. Whole class strings: Tailwind cannot
 * assemble `bg-${warna}-500`.
 */
export const WARNA_KUIS: Record<
  KuisStatus,
  { garis: string; ikon: string; kotak: string }
> = {
  dibuka: {
    garis: "bg-emerald-500",
    ikon: "text-emerald-600 dark:text-emerald-400",
    kotak:
      "border-emerald-600/25 bg-emerald-500/[0.08] dark:border-emerald-400/30 dark:bg-emerald-400/10",
  },
  belum: {
    garis: "bg-sky-500",
    ikon: "text-sky-600 dark:text-sky-400",
    kotak:
      "border-sky-600/25 bg-sky-500/[0.08] dark:border-sky-400/30 dark:bg-sky-400/10",
  },
  ditutup: {
    garis: "bg-muted-foreground/40",
    ikon: "text-muted-foreground",
    kotak: "border-border bg-muted/60",
  },
  draf: {
    garis: "bg-amber-500",
    ikon: "text-amber-600 dark:text-amber-400",
    kotak:
      "border-amber-600/30 bg-amber-500/[0.09] dark:border-amber-400/30 dark:bg-amber-400/10",
  },
};