/**
 * One accent hue per subject, shared by the topic list and the topic page.
 *
 * Colour is a memory aid — every PKWU topic looks like every other PKWU topic —
 * so the hue is derived from the subject code, never from position or random.
 * A colour that changes between visits is worse than no colour at all.
 *
 * Whole class strings, because Tailwind only sees literal text in the source.
 */
export const WARNA_MAPEL = [
  {
    garis: "bg-indigo-500",
    kotak:
      "border-indigo-600/25 bg-indigo-500/[0.08] dark:border-indigo-400/30 dark:bg-indigo-400/10",
    ikon: "text-indigo-600 dark:text-indigo-400",
    chip: "bg-indigo-500/10 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/15 dark:text-indigo-300 dark:ring-indigo-400/25",
  },
  {
    garis: "bg-emerald-500",
    kotak:
      "border-emerald-600/25 bg-emerald-500/[0.08] dark:border-emerald-400/30 dark:bg-emerald-400/10",
    ikon: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/25",
  },
  {
    garis: "bg-sky-500",
    kotak:
      "border-sky-600/25 bg-sky-500/[0.08] dark:border-sky-400/30 dark:bg-sky-400/10",
    ikon: "text-sky-600 dark:text-sky-400",
    chip: "bg-sky-500/10 text-sky-700 ring-sky-600/20 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-400/25",
  },
  {
    garis: "bg-violet-500",
    kotak:
      "border-violet-600/25 bg-violet-500/[0.08] dark:border-violet-400/30 dark:bg-violet-400/10",
    ikon: "text-violet-600 dark:text-violet-400",
    chip: "bg-violet-500/10 text-violet-700 ring-violet-600/20 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/25",
  },
  {
    garis: "bg-amber-500",
    kotak:
      "border-amber-600/30 bg-amber-500/[0.09] dark:border-amber-400/30 dark:bg-amber-400/10",
    ikon: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-500/10 text-amber-700 ring-amber-600/25 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25",
  },
  {
    garis: "bg-rose-500",
    kotak:
      "border-rose-600/25 bg-rose-500/[0.08] dark:border-rose-400/30 dark:bg-rose-400/10",
    ikon: "text-rose-600 dark:text-rose-400",
    chip: "bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:bg-rose-400/15 dark:text-rose-300 dark:ring-rose-400/25",
  },
] as const;

/**
 * Stable hue for one row of a list. Topics mix the subject with their own id, so
 * a long topic list is not one flat colour; rooms use `warnaMapelSaja` instead,
 * where every class of the same subject must look identical.
 */
export function warnaMapel(item: { mapelKode: string | null; id: number }) {
  let sidik = item.id;
  for (const huruf of item.mapelKode ?? "") {
    sidik = (sidik * 31 + huruf.charCodeAt(0)) % 9973;
  }
  return WARNA_MAPEL[sidik % WARNA_MAPEL.length]!;
}
/**
 * The subject's hue, and nothing else.
 *
 * All eleven PKWU rooms wear the same colour on purpose: on a page of twelve
 * rooms the useful signal is "this one is the other subject", not a rainbow.
 */
export function warnaMapelSaja(
  kode: string | null,
  nama: string | null,
  fallbackId: number,
) {
  const bahan = kode ?? nama;
  if (!bahan) return WARNA_MAPEL[fallbackId % WARNA_MAPEL.length]!;

  let sidik = 0;
  for (const huruf of bahan) {
    sidik = (sidik * 31 + huruf.charCodeAt(0)) % 9973;
  }
  return WARNA_MAPEL[sidik % WARNA_MAPEL.length]!;
}
