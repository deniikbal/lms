/**
 * The two small shells every room tab uses.
 *
 * They live here rather than inside one tab so Kuis, Tugas and Presensi all
 * agree on the spacing of a section heading and an empty state.
 */

export function Kosong({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 px-6 py-14 text-center">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export function Panel({
  judul,
  keterangan,
  children,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  children: React.ReactNode;
  aksi?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">{judul}</h2>
        <div className="flex items-center gap-2">
          {keterangan ? (
            <p className="text-xs text-muted-foreground">{keterangan}</p>
          ) : null}
          {aksi}
        </div>
      </div>
      {children}
    </section>
  );
}
