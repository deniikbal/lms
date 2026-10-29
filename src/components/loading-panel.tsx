import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a route shows while its data is still streaming in.
 *
 * Every page is a `<Suspense>` boundary that reads the session, the URL and the
 * database, so each navigation needs a placeholder. One generic panel made every
 * route look like the dashboard; the variants here draw the shape of the page
 * that is actually coming, so the layout does not jump when the data lands.
 *
 * Shapes are deliberately coarse: real content, not a low-fidelity copy of it.
 * A skeleton that guesses wrong is more distracting than an honest block.
 */
export type VarianSkeleton =
  | "daftar" // a heading plus a grid of cards — room lists, topic lists
  | "detail" // breadcrumb, title, fact boxes, content panel — one room
  | "form" // a heading and a stack of fields — new/edit pages
  | "panel" // one wide panel — quiz sheets, grade tables, question details
  | "papan"; // sidebar-ish split: main column plus a narrow column

export function LoadingPanel({
  varian = "daftar",
  /**
   * Set false when the placeholder renders inside a shell that already draws the
   * page frame — otherwise the skeleton gets a second set of page margins.
   */
  bingkai = true,
}: {
  varian?: VarianSkeleton;
  bingkai?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy
      className={cn("w-full", bingkai && "mx-auto max-w-5xl px-4 py-10 sm:px-6")}
    >
      {/* No caption: the pulsing blocks say "loading" by themselves, and a word
          under every placeholder only draws the eye to how long it takes. The
          `role="status"` text stays for screen readers. */}
      <span className="sr-only">Memuat</span>
      <Isi varian={varian} />
    </div>
  );
}

function Isi({ varian }: { varian: VarianSkeleton }) {
  switch (varian) {
    case "detail":
      return (
        <div className="space-y-4">
          <Skeleton className="h-3 w-36" />
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-32 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-72" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      );

    case "form":
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3.5 w-80" />
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className={i === 2 ? "h-24 w-full rounded-md" : "h-9 w-full rounded-md"} />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>
        </div>
      );

    case "panel":
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-64" />
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2 border-t border-border/60 pt-2">
                <Skeleton className="h-3.5 w-full max-w-lg" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      );

    case "papan":
      return (
        <div className="space-y-5">
          <Skeleton className="h-7 w-56" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <div className="space-y-3">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        </div>
      );

    case "daftar":
    default:
      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-3.5 w-96 max-w-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      );
  }
}
