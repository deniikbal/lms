"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { deleteKelasBulkAction, fetchKelasAction } from "@/app/actions/kelas";
import { KelasDialog } from "@/components/admin/kelas-dialog";
import { KelasRowActions } from "@/components/admin/kelas-row-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  hasJurusan,
  KELAS_PER_PAGE,
  type Jenjang,
  type JurusanOption,
  type KelasPageData,
  type KelasRow,
  type WaliOption,
} from "@/lib/kelas-shared";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 350;

const HEAD =
  "px-4 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground";

export function KelasDirectory({
  initial,
  jenjang,
  jurusan,
  wali,
}: {
  initial: KelasPageData;
  jenjang: Jenjang;
  jurusan: JurusanOption[];
  wali: WaliOption[];
}) {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KelasRow | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAlertOpen, setBulkAlertOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const latest = useRef(0);

  const load = useCallback((next: { q: string; page: number }) => {
    const ticket = ++latest.current;
    startTransition(async () => {
      const result = await fetchKelasAction(next);
      if (ticket === latest.current) {
        setData(result);
        setSelectedIds([]);
      }
    });
  }, []);

  useEffect(() => {
    if (term.trim() === query) return;
    const timer = setTimeout(() => {
      const next = term.trim();
      setQuery(next);
      load({ q: next, page: 1 });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, query, load]);

  const { rows, total, page, pageCount, stats } = data;
  const firstRow = total === 0 ? 0 : (page - 1) * KELAS_PER_PAGE + 1;
  const lastRow = Math.min(firstRow + rows.length - 1, total);
  const showJurusan = hasJurusan(jenjang);

  const allVisibleSelected =
    rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r.id));
    }
  }

  function toggleSelectRow(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function confirmBulkDelete() {
    if (selectedIds.length === 0) return;

    setBulkDeleting(true);
    const res = await deleteKelasBulkAction(selectedIds);
    setBulkDeleting(false);
    setBulkAlertOpen(false);

    if (res.ok) {
      if (res.skippedClasses && res.skippedClasses.length > 0) {
        alert(
          `Berhasil menghapus ${res.deletedCount} kelas.\n\nKelas berikut tidak dapat dihapus karena masih memiliki siswa:\n- ${res.skippedClasses.join("\n- ")}`,
        );
      }
      refresh();
    } else {
      alert(res.error ?? "Gagal menghapus kelas.");
    }
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: KelasRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  function refresh() {
    load({ q: query, page });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 [&>*+*]:border-l [&>*+*]:border-border/60 [&>*+*]:pl-7">
        <Stat value={stats.total} label="Total kelas" />
        <Stat value={stats.siswa} label="Siswa terdaftar" />
        <Stat value={stats.tanpaWali} label="Tanpa wali" />
        <Stat value={stats.ruang} label="Ruang belajar" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Cari kelas, jurusan, atau wali…"
            aria-label="Cari kelas, jurusan, atau wali"
            className="h-9 w-full rounded-lg border border-border bg-card pr-8 pl-8 text-sm outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
          />
          {pending ? (
            <Loader2Icon className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : term ? (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
              onClick={() => setTerm("")}
              className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 ? (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              onClick={() => setBulkAlertOpen(true)}
              disabled={bulkDeleting}
            >
              <Trash2Icon className="size-4" />
              Hapus ({selectedIds.length})
            </Button>
          ) : null}

          <Button type="button" size="lg" onClick={openAdd}>
            <PlusIcon />
            Tambah kelas
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        {rows.length > 0 ? (
          <div className={cn("transition-opacity", pending && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="w-10 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Pilih semua kelas di halaman ini"
                      className="size-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </TableHead>
                  <TableHead className={HEAD}>Kelas</TableHead>
                  <TableHead className={HEAD}>Tingkat</TableHead>
                  {showJurusan ? (
                    <TableHead className={HEAD}>Jurusan</TableHead>
                  ) : null}
                  <TableHead className={HEAD}>Wali kelas</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Siswa</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Mapel</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const isSelected = selectedIds.includes(row.id);
                  return (
                    <TableRow
                      key={row.id}
                      data-state={isSelected ? "selected" : undefined}
                      className="border-border/60 hover:bg-muted/40"
                    >
                      <TableCell className="w-10 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row.id)}
                          aria-label={`Pilih ${row.nama}`}
                          className="size-4 cursor-pointer rounded border-border accent-primary"
                        />
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <Link
                          href={`/admin/siswa?kelas=${row.id}`}
                          className="group inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {row.nama}
                          <ArrowUpRightIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                        {row.tingkat ?? "—"}
                      </TableCell>

                      {showJurusan ? (
                        <TableCell className="px-4 py-3">
                          {row.jurusanKode ? (
                            <span
                              title={row.jurusanNama ?? undefined}
                              className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                            >
                              {row.jurusanKode}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}

                      <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                        {row.waliNama ?? "Belum ada wali"}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-right text-xs tabular-nums">
                        <Link
                          href={`/admin/siswa?kelas=${row.id}`}
                          className="text-foreground underline-offset-4 hover:underline"
                        >
                          {row.siswaCount}
                        </Link>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-right text-xs tabular-nums">
                        <Link
                          href={`/admin/ruang?kelas=${row.id}`}
                          className="text-foreground underline-offset-4 hover:underline"
                        >
                          {row.ruangCount}
                        </Link>
                      </TableCell>

                      <TableCell className="px-2 py-3">
                        <KelasRowActions
                          id={row.id}
                          nama={row.nama}
                          siswaCount={row.siswaCount}
                          onEdit={() => openEdit(row)}
                          onDeleted={refresh}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
            <SearchXIcon className="size-5 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {query
                ? "Tidak ada kelas yang cocok dengan pencarian ini."
                : "Belum ada kelas. Tambahkan lewat tombol di atas."}
            </p>
            {query ? (
              <button
                type="button"
                onClick={() => setTerm("")}
                className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
              >
                Bersihkan pencarian
              </button>
            ) : null}
          </div>
        )}

        {rows.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2">
            <p className="text-xs text-muted-foreground tabular-nums">
              {firstRow}–{lastRow} dari {total}
            </p>
            <div className="flex items-center gap-1">
              <PageButton
                disabled={page <= 1 || pending}
                onClick={() => load({ q: query, page: page - 1 })}
                label="Halaman sebelumnya"
              >
                <ChevronLeftIcon />
              </PageButton>
              <span className="px-1 text-xs text-muted-foreground tabular-nums">
                {page} / {pageCount}
              </span>
              <PageButton
                disabled={page >= pageCount || pending}
                onClick={() => load({ q: query, page: page + 1 })}
                label="Halaman berikutnya"
              >
                <ChevronRightIcon />
              </PageButton>
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Kelas yang masih berisi siswa tidak bisa dihapus — pindahkan siswanya
        dulu. Menghapus kelas ikut menghapus ruang belajar dan pengumumannya.
      </p>

      <KelasDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jenjang={jenjang}
        jurusan={jurusan}
        wali={wali}
        kelas={editing}
        onSaved={refresh}
      />

      <AlertDialog open={bulkAlertOpen} onOpenChange={setBulkAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangleIcon className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus Kelas Terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus <strong>{selectedIds.length} kelas</strong> terpilih beserta ruang belajar dan pengumuman terkait. Kelas yang masih memiliki siswa akan dilewati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={bulkDeleting}
              onClick={confirmBulkDelete}
            >
              {bulkDeleting ? "Menghapus…" : `Hapus (${selectedIds.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="text-muted-foreground"
    >
      {children}
    </Button>
  );
}
