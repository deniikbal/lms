"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterBank, MapelBankOption } from "@/lib/bank-soal-shared";

/** Sentinel for "no filter" — Base UI treats `null` as unset, not as a choice. */
const SEMUA = "__semua__";

/**
 * The filter bar.
 *
 * It is client-side only so the two dropdowns can be real Base UI selects: those
 * do not submit a native form value, but they can push a URL. The URL stays the
 * single source of truth, so the filter survives a refresh and can be shared.
 */
export function FilterTopik({
  base,
  filter,
  mapel,
}: {
  base: string;
  filter: FilterBank;
  mapel: MapelBankOption[];
}) {
  const router = useRouter();
  const [cari, setCari] = useState(filter.cari);

  function pindah(berikut: { mapel?: number | null; jenis?: string | null; cari?: string }) {
    const params = new URLSearchParams();
    const mapelId = berikut.mapel !== undefined ? berikut.mapel : filter.mapelId;
    const jenis = berikut.jenis !== undefined ? berikut.jenis : filter.jenis;
    const kata = berikut.cari !== undefined ? berikut.cari : cari;

    if (mapelId) params.set("mapel", String(mapelId));
    if (jenis) params.set("jenis", jenis);
    if (kata.trim()) params.set("cari", kata.trim());

    const query = params.toString();
    router.push(query ? `${base}?${query}` : base);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        pindah({});
      }}
      className="rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="cari"
            value={cari}
            onChange={(event) => setCari(event.target.value)}
            placeholder="Cari topik atau pertanyaan…"
            maxLength={100}
            className="pl-8"
          />
        </div>

        <Select
          items={[
            { value: SEMUA, label: "Semua mapel saya" },
            ...mapel.map((item) => ({
              value: String(item.id),
              label: `${item.nama} (${item.soal})`,
            })),
          ]}
          value={filter.mapelId ? String(filter.mapelId) : SEMUA}
          onValueChange={(nilai) =>
            pindah({ mapel: nilai === SEMUA ? null : Number(nilai) })
          }
        >
          <SelectTrigger className="min-w-44" aria-label="Filter mapel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua mapel saya</SelectItem>
            {mapel.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.nama} ({item.soal})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: SEMUA, label: "Semua jenis" },
            { value: "pg", label: "Hanya pilihan ganda" },
            { value: "esai", label: "Hanya esai" },
          ]}
          value={filter.jenis ?? SEMUA}
          onValueChange={(nilai) => pindah({ jenis: nilai === SEMUA ? null : nilai })}
        >
          <SelectTrigger className="min-w-40" aria-label="Filter jenis soal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua jenis</SelectItem>
            <SelectItem value="pg">Hanya pilihan ganda</SelectItem>
            <SelectItem value="esai">Hanya esai</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit" size="sm" variant="secondary">
          Cari
        </Button>
      </div>
    </form>
  );
}
