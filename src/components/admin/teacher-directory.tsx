"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  SearchIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react";

import {
  deleteTeacherAction,
  fetchTeachersAction,
  resetTeacherPasswordAction,
} from "@/app/actions/teachers";
import { PersonActions } from "@/components/admin/person-actions";
import {
  KelasChip,
  Monogram,
  RelativeTime,
  StatusDot,
} from "@/components/admin/person-cells";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GURU_PER_PAGE, type ListPeopleResult } from "@/lib/people-shared";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 350;

const HEAD =
  "px-4 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground";

/**
 * The teacher table — the student table's twin.
 *
 * Teachers carry no class, so there is no class filter; everything else
 * (state-held search, action-backed paging, 10 rows) matches `/admin/siswa`.
 */
export function TeacherDirectory({
  initial,
  initialQ,
}: {
  initial: ListPeopleResult;
  initialQ: string;
}) {
  const [term, setTerm] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Responses can land out of order when typing fast; only the newest wins.
  const latest = useRef(0);

  const load = useCallback((next: { q: string; page: number }) => {
    const ticket = ++latest.current;
    startTransition(async () => {
      const result = await fetchTeachersAction(next);
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

  const { rows, total, page, pageCount } = data;
  const firstRow = total === 0 ? 0 : (page - 1) * GURU_PER_PAGE + 1;
  const lastRow = Math.min(firstRow + rows.length - 1, total);

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Cari nama atau NIP…"
          aria-label="Cari nama atau NIP"
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

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        {rows.length > 0 ? (
          <div className={cn("transition-opacity", pending && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className={HEAD}>Guru</TableHead>
                  <TableHead className={HEAD}>L/P</TableHead>
                  <TableHead className={HEAD}>Wali kelas</TableHead>
                  <TableHead className={HEAD}>Status</TableHead>
                  <TableHead className={HEAD}>Terakhir aktif</TableHead>
                  <TableHead className={`${HEAD} text-right`}>Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-border/60 hover:bg-muted/40"
                  >
                    <TableCell className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Monogram name={row.name} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {row.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground tabular-nums">
                            {row.username ?? "tanpa NIP"}
                            {row.email ? ` · ${row.email}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                      {row.jk ?? "—"}
                    </TableCell>

                    <TableCell className="px-4 py-2.5">
                      <KelasChip nama={row.waliKelas} kosong="Bukan wali" />
                    </TableCell>

                    <TableCell className="px-4 py-2.5">
                      <StatusDot aktif={row.aktif} />
                    </TableCell>

                    <TableCell className="px-4 py-2.5">
                      <RelativeTime value={row.terakhirAktifAt} />
                    </TableCell>

                    <TableCell className="px-2 py-2.5">
                      <PersonActions
                        id={row.id}
                        name={row.name}
                        username={row.username}
                        idLabel="NIP"
                        editHref={`/admin/guru/${row.id}`}
                        resetAction={resetTeacherPasswordAction}
                        deleteAction={deleteTeacherAction}
                        onChanged={() => load({ q: query, page })}
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
                ? "Tidak ada guru yang cocok dengan pencarian ini."
                : "Belum ada data guru."}
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
        <Link href="/admin/kelas" className="underline-offset-4 hover:underline">
          Kelola kelas
        </Link>{" "}
        untuk menentukan wali kelas.
      </p>
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
