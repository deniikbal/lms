import { Skeleton } from "@/components/ui/skeleton";

/** Neutral placeholder shown while a session-dependent section streams in. */
export function LoadingPanel({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-8 w-64" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
