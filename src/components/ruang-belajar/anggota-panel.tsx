"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AnggotaRow } from "@/lib/ruang-belajar-shared";

const SARING_JK: { nilai: "L" | "P" | null; label: string }[] = [
  { nilai: null, label: "Semua" },
  { nilai: "L", label: "Laki-laki" },
  { nilai: "P", label: "Perempuan" },
];

/**
 * The class roster.
 *
 * A class holds 40+ names, so the teacher's job here is finding one student,
 * not admiring the layout: a searchable, scannable table beats a wall of cards.
 * NIS is a column of its own because it is the credential students type to sign
 * in, which makes handing it out a job that starts on this tab.
 */
export function AnggotaPanel({ anggota }: { anggota: AnggotaRow[] }) {
  const [cari, setCari] = useState("");
  const [jk, setJk] = useState<"L" | "P" | null>(null);

  const tampil = useMemo(() => {
    const kueri = cari.trim().toLowerCase();
    return anggota
      .map((murid, indeks) => ({ ...murid, no: indeks + 1 }))
      .filter((murid) => {
        if (jk !== null && murid.jk !== jk) return false;
        if (kueri === "") return true;
        return (
          murid.nama.toLowerCase().includes(kueri) ||
          (murid.nis ?? "").toLowerCase().includes(kueri)
        );
      });
  }, [anggota, cari, jk]);

  const tersaring = tampil.length !== anggota.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <div className="w-full sm:max-w-xs">
          <label
            htmlFor="cari-siswa"
            className="block text-xs font-medium text-foreground"
          >
            Cari siswa
          </label>
          <div className="relative mt-1">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="cari-siswa"
              type="search"
              value={cari}
              onChange={(event) => setCari(event.target.value)}
              placeholder="Nama atau NIS"
              className="h-9 w-full rounded-sm border border-input bg-background pr-2 pl-8 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>
        </div>

        <div
          role="group"
          aria-label="Saring jenis kelamin"
          className="flex items-center gap-1.5"
        >
          {SARING_JK.map((item) => {
            const aktif = jk === item.nilai;
            return (
              <button
                key={item.label}
                type="button"
                aria-pressed={aktif}
                onClick={() => setJk(item.nilai)}
                className={cn(
                  "h-8 cursor-pointer rounded-sm px-2 text-xs ring-1 transition-colors",
                  aktif
                    ? "bg-brand/10 font-medium text-brand ring-brand/30"
                    : "bg-card text-muted-foreground ring-border hover:bg-accent",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <p className="ml-auto text-xs text-muted-foreground tabular-nums">
          {tersaring
            ? `${tampil.length} dari ${anggota.length} siswa`
            : `${anggota.length} siswa`}
        </p>
      </div>

      <div className="overflow-hidden rounded-sm border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="hidden w-10 px-3 text-xs font-medium text-muted-foreground sm:table-cell">
                No
              </TableHead>
              <TableHead className="px-3 text-xs font-medium text-muted-foreground">
                Nama
              </TableHead>
              <TableHead className="w-24 px-3 text-xs font-medium text-muted-foreground">
                NIS
              </TableHead>
              <TableHead className="w-12 px-3 text-xs font-medium text-muted-foreground">
                JK
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {tampil.length === 0 ? (
              <TableRow className="border-border">
                <TableCell
                  colSpan={4}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada siswa yang cocok dengan pencarian. Coba kata kunci
                  lain, atau pilih Semua.
                </TableCell>
              </TableRow>
            ) : (
              tampil.map((murid) => (
                <TableRow key={murid.id} className="border-border">
                  <TableCell className="hidden px-3 py-2 text-xs text-muted-foreground tabular-nums sm:table-cell">
                    {murid.no}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm text-foreground">
                    {murid.nama}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    {murid.nis ?? "Belum ada"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                    {murid.jk ?? "Belum diisi"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}