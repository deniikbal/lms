"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react";

import { fetchJurusanAction } from "@/app/actions/jurusan";
import { JurusanDialog } from "@/components/admin/jurusan-dialog";
import { JurusanRowActions } from "@/components/admin/jurusan-row-actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Jenjang } from "@/lib/kelas-shared";
import {
  istilahJurusan,
  JURUSAN_PER_PAGE,
  type JurusanPageData,
  type JurusanRow,
} from "@/lib/jurusan-shared";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 350;

const HEAD =
  "px-4 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground";

/**
 * The major table.
 *
 * Same shape as the class, subject, student and teacher lists — search and page
 * in component state, rows fetched through a Server Action, add/edit in a modal.
 */
export function JurusanDirectory({
  initial,
  jenjang,
}: {
  initial: JurusanPageData;
  jenjang: Jenjang;
}) {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JurusanRow | null>(null);

  // Responses can land out of order when typing fast; only the newest wins.
  const latest = useRef(0);

  const load = useCallback((next: { q: string; page: number }) => {
    const ticket = ++latest.current;
    startTransition(async () => {
      const result = await fetchJurusanAction(next);
      if (ticket === latest.current) setData(result);
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
  const firstRow = total === 0 ? 0 : (page - 1) * JURUSAN_PER_PAGE + 1;
  const lastRow = Math.min(firstRow + rows.length - 1, total);
  const istilah = istilahJurusan(jenjang);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: JurusanRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  function refresh() {
    load({ q: query, page });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 [&>*+*]:border-l [&>*+*]:border-border/60 [&>*+*]:pl-7">
        <Stat value={stats.total} label="Total jurusan" />
        <Stat value={stats.kelas} label="Kelas di jurusan" />
        <Stat value={stats.tanpaJurusan} label="Kelas tanpa jurusan" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Cari kode atau nama jurusan…"
            aria-label="Cari kode atau nama jurusan"
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

        <Button type="button" size="lg" onClick={openAdd}>
          <PlusIcon />
          Tambah jurusan
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        {rows.length > 0 ? (
          <div className={cn("transition-opacity", pending && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className={`${HEAD} w-24`}>Kode</TableHead>
                  <TableHead className={HEAD}>Nama jurusan</TableHead>
                  <TableHead className={`${HEAD} w-24 text-right`}>Kelas</TableHead>
                  <TableHead className={`${HEAD} w-24 text-right`}>Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-border/60 hover:bg-muted/40"
                  >
                    <TableCell className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] tracking-wide text-foreground">
                        {row.kode}
                      </span>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground">
                      {row.nama}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-right text-xs tabular-nums">
                      {row.kelasCount > 0 ? (
                        // The class screen keeps its filters in component state
                        // (no query string), so this lands on the full list
                        // rather than a pre-filtered one.
                        <Link
                          href="/admin/kelas"
                          className="group inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
                        >
                          {row.kelasCount}
                          <ArrowUpRightIcon className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>

                    <TableCell className="px-2 py-3">
                      <JurusanRowActions
                        id={row.id}
                        kode={row.kode}
                        nama={row.nama}
                        kelasCount={row.kelasCount}
                        onEdit={() => openEdit(row)}
                        onDeleted={refresh}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
            <SearchXIcon className="size-5 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {query
                ? "Tidak ada jurusan yang cocok dengan pencarian ini."
                : `Belum ada ${istilah}. Tambahkan lewat tombol di atas.`}
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
        {stats.kelas} kelas sudah punya jurusan
        {stats.tanpaJurusan > 0 ? `, ${stats.tanpaJurusan} belum` : ""}. Jurusan
        yang masih dipakai kelas tidak bisa dihapus. Nama kelas bebas diisi — tidak
        diturunkan dari jurusan, jadi tidak ada validasi silang di antara
        keduanya.
      </p>

      <JurusanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jurusan={editing}
        jenjang={jenjang}
        onSaved={refresh}
      />
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
