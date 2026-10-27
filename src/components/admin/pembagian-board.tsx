"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { PembagianMapelRow } from "@/components/admin/pembagian-mapel-row";
import { PembagianTambahMapel } from "@/components/admin/pembagian-tambah-mapel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Board, KelasRingkas } from "@/lib/pembagian-shared";

/**
 * The two-card teaching-assignment board.
 *
 * The class picker navigates (`?kelas=`) because it selects *what the page is
 * about*, not a filter within one dataset — the deep links from Kelas and Mapel
 * land here the same way.
 */
export function PembagianBoard({
  initial,
  kelasList,
}: {
  initial: Board;
  kelasList: KelasRingkas[];
}) {
  const [board, setBoard] = useState(initial);
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();

  const kelasItems: Record<string, React.ReactNode> = {};
  for (const kelas of kelasList) kelasItems[String(kelas.id)] = kelas.nama;

  function pilihKelas(value: string | null) {
    if (!value || Number(value) === board.kelas.id) return;
    startNavigation(() => {
      router.push(`/admin/ruang?kelas=${value}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tahun ajaran</span>
          <Badge variant="secondary">
            {board.ta.nama} · {board.ta.semester}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Kelas</span>
          <Select
            items={kelasItems}
            value={String(board.kelas.id)}
            onValueChange={pilihKelas}
          >
            <SelectTrigger
              aria-label="Pilih kelas"
              className="w-48 justify-between data-[size=default]:h-9"
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
          {navigating ? (
            <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-sm">
              Kelas {board.kelas.nama} · {board.ruang.length} mapel
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {board.ruang.length > 0 ? (
              board.ruang.map((ruang) => (
                <PembagianMapelRow
                  key={ruang.id}
                  ruang={ruang}
                  kelasId={board.kelas.id}
                  guruOptions={board.guru}
                  onBoard={setBoard}
                />
              ))
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada mapel di kelas ini. Tambahkan lewat kartu di samping.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <PembagianTambahMapel
          kelasId={board.kelas.id}
          kelasNama={board.kelas.nama}
          tersedia={board.tersedia}
          guruOptions={board.guru}
          onBoard={setBoard}
        />
      </div>
    </div>
  );
}
