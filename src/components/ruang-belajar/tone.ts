import type { Badge } from "@/lib/ruang-belajar-shared";

/**
 * Badge colours for the room page.
 *
 * Tailwind cannot build a class name from a variable, so the tones are spelled
 * out here rather than interpolated at the call site.
 */
export const TONE: Record<Badge["tone"], string> = {
  netral: "bg-muted text-muted-foreground ring-border",
  hijau:
    "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/25",
  kuning:
    "bg-amber-500/15 text-amber-700 ring-amber-600/25 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25",
  biru: "bg-blue-500/10 text-blue-700 ring-blue-600/20 dark:bg-blue-400/15 dark:text-blue-300 dark:ring-blue-400/25",
  merah:
    "bg-destructive/10 text-destructive ring-destructive/20 dark:bg-destructive/20 dark:ring-destructive/30",
  ungu: "bg-violet-500/10 text-violet-700 ring-violet-600/20 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/25",
};

/**
 * Solid fills for the attendance buttons.
 *
 * The badge palette above is a tint plus a ring; inside a segmented control that
 * reads as four boxes. A pressed cell is a filled block instead.
 */
export const TONE_PENUH: Record<"hijau" | "kuning" | "biru" | "merah", string> = {
  hijau: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950",
  kuning: "bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950",
  biru: "bg-blue-600 text-white dark:bg-blue-500",
  merah: "bg-destructive text-destructive-foreground",
};

/** Initials for the avatar circles in Anggota and Nilai. */
export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "?";
  if (kata.length === 1) return kata[0].slice(0, 2).toUpperCase();
  return (kata[0][0] + kata[kata.length - 1][0]).toUpperCase();
}
