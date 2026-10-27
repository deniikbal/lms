"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
  deleteStudentAction,
  fetchStudentsAction,
  resetStudentPasswordAction,
} from "@/app/actions/students";
import { PersonActions } from "@/components/admin/person-actions";
import {
  KelasChip,
  Monogram,
  RelativeTime,
  StatusDot,
} from "@/components/admin/person-cells";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SISWA_PER_PAGE,
  type KelasOption,
  type ListPeopleResult,
} from "@/lib/people-shared";
import { cn } from "@/lib/utils";

/** Sentinel for "no class filter" — Base UI Select wants a non-empty value. */
const ALL = "all";
const DEBOUNCE_MS = 350;

const HEAD =
  "px-4 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground";

/**
 * The student table.
 *
 * Filters and the page number live in component state, not the query string, so
 * typing in the search box does not rewrite the URL. Paging is served by a
 * Server Action, which keeps the filtering and the 10-row window on the server.
 */
export function StudentDirectory({
  initial,
  kelas,
  initialQ,
  initialKelas,
}: {
  initial: ListPeopleResult;
  kelas: KelasOption[];
  initialQ: string;
  initialKelas: number | null;
}) {
  const [term, setTerm] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [kelasId, setKelasId] = useState<number | null>(initialKelas);
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();

  // Responses can land out of order when typing fast; only the newest wins.
  const latest = useRef(0);

  const load = useCallback(
    (next: { q: string; kelasId: number | null; page: number }) => {
      const ticket = ++latest.current;
      startTransition(async () => {
        const result = await fetchStudentsAction(next);
        if (ticket === latest.current) setData(result);
      });
    },
    [],
  );

  // Debounced typing. The guard stops the effect from re-firing once `query`
  // has caught up with what was typed.
  useEffect(() => {
    if (term.trim() === query) return;
    const timer = setTimeout(() => {
      const next = term.trim();
      setQuery(next);
      load({ q: next, kelasId, page: 1 });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term, query, kelasId, load]);

  const kelasItems = useMemo(() => {
    const items: Record<string, string> = { [ALL]: "Semua kelas" };
    for (const item of kelas) items[String(item.id)] = item.nama;
    return items;
  }, [kelas]);

  const filtered = Boolean(query || kelasId);
  const { rows, total, page, pageCount } = data;
  const firstRow = total === 0 ? 0 : (page - 1) * SISWA_PER_PAGE + 1;
  const lastRow = Math.min(firstRow + rows.length - 1, total);

  function changeKelas(value: string) {
    const next = value === ALL ? null : Number(value);
    setKelasId(next);
    load({ q: query, kelasId: next, page: 1 });
  }

  function goTo(nextPage: number) {
    load({ q: query, kelasId, page: nextPage });
  }

  function reset() {
    setTerm("");
    setQuery("");
    setKelasId(null);
    load({ q: "", kelasId: null, page: 1 });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Cari nama atau NISN…"
            aria-label="Cari nama atau NISN"
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
          <Select
            items={kelasItems}
            value={kelasId === null ? ALL : String(kelasId)}
            onValueChange={(value) => changeKelas(String(value))}
          >
            <SelectTrigger
              aria-label="Filter kelas"
              className="w-44 justify-between data-[size=default]:h-9"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(kelasItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtered ? (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        {rows.length > 0 ? (
          <div className={cn("transition-opacity", pending && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className={HEAD}>Siswa</TableHead>
                  <TableHead className={HEAD}>Kelas</TableHead>
                  <TableHead className={HEAD}>L/P</TableHead>
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
                            {row.username ?? "tanpa NISN"}
                            {row.email ? ` · ${row.email}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-2.5">
                      <KelasChip nama={row.kelasNama} />
                    </TableCell>

                    <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                      {row.jk ?? "—"}
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
                        idLabel="NISN"
                        editHref={`/admin/siswa/${row.id}`}
                        resetAction={resetStudentPasswordAction}
                        deleteAction={deleteStudentAction}
                        onChanged={() =>
                          load({ q: query, kelasId, page })
                        }
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
              {filtered
                ? "Tidak ada siswa yang cocok dengan filter ini."
                : "Belum ada data siswa."}
            </p>
            {filtered ? (
              <button
                type="button"
                onClick={reset}
                className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
              >
                Bersihkan filter
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
                onClick={() => goTo(page - 1)}
                label="Halaman sebelumnya"
              >
                <ChevronLeftIcon />
              </PageButton>
              <span className="px-1 text-xs text-muted-foreground tabular-nums">
                {page} / {pageCount}
              </span>
              <PageButton
                disabled={page >= pageCount || pending}
                onClick={() => goTo(page + 1)}
                label="Halaman berikutnya"
              >
                <ChevronRightIcon />
              </PageButton>
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        <Link
          href="/admin/kelas"
          className="underline-offset-4 hover:underline"
        >
          Kelola kelas
        </Link>{" "}
        untuk memindahkan siswa antar kelas.
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
