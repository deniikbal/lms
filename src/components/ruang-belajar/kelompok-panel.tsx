"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { simpanKelompokAction } from "@/app/actions/ruang-belajar";
import { TONE } from "@/components/ruang-belajar/tone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { InputGroupAddon } from "@/components/ui/input-group";
import type { AnggotaRow, KelompokRow } from "@/lib/ruang-belajar-shared";
import { cn } from "@/lib/utils";

type BarisKelompok = {
  /** Stable client-side key: server ids repeat (and are null) for new rows. */
  kunci: string;
  id: number | null;
  nama: string;
  siswaIds: string[];
};

/**
 * The teacher's group editor for one group task.
 *
 * The teacher pastes in the group composition they already have: add a row per
 * group, type the name, pick the members from the dropdown. A student sits in
 * exactly one group — a placed student drops out of every picker, so moving
 * them means removing them from their group first. Saving rewrites the whole
 * set in one transaction; the server refuses to drop a group whose members
 * already submitted, so a save that would orphan work never lands.
 */

/**
 * Group colours, cycled by group index.
 *
 * The swatch is the only cue tying a name in the roster to the group it sits
 * in, so it must be stable while groups are added or removed — hence an
 * index-based cycle rather than hashing the name.
 */
const WARNA_KELOMPOK = [
  TONE.biru,
  TONE.ungu,
  TONE.kuning,
  TONE.hijau,
  TONE.merah,
];

function warnaKelompok(daftar: BarisKelompok[], kunci: string): string {
  const i = daftar.findIndex((x) => x.kunci === kunci);
  return WARNA_KELOMPOK[(i < 0 ? daftar.length : i) % WARNA_KELOMPOK.length];
}

export function KelompokPanel({
  ruangId,
  tugasId,
  anggota,
  kelompok,
}: {
  ruangId: number;
  tugasId: number;
  /** Every active student of the class, loaded by the server page. */
  anggota: AnggotaRow[];
  /** The task's groups as they stand, loaded by the server page. */
  kelompok: KelompokRow[];
}) {
  const [baris, setBaris] = useState<BarisKelompok[]>(() =>
    kelompok.map((k, i) => ({
      kunci: `g${k.id ?? i}`,
      id: k.id,
      nama: k.nama,
      siswaIds: k.anggota.map((a) => a.siswaId),
    })),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  /** Students not in any group yet — the only ones the pickers offer. */
  const tersedia = anggota.filter(
    (s) => !baris.some((g) => g.siswaIds.includes(s.id)),
  );

  function ubah(kunci: string, ubah: Partial<BarisKelompok>) {
    setBaris((b) => b.map((x) => (x.kunci === kunci ? { ...x, ...ubah } : x)));
    setError(null);
    setPesan(null);
  }

  function tambah() {
    setBaris((b) => [
      ...b,
      {
        kunci: `baru-${b.length}-${Date.now()}`,
        id: null,
        nama: `Kelompok ${b.length + 1}`,
        siswaIds: [],
      },
    ]);
  }

  function hapus(kunci: string) {
    setBaris((b) => b.filter((x) => x.kunci !== kunci));
  }

  /** Putting a student in a group removes them from any other group. */
  function pilih(kunci: string, siswaId: string) {
    setBaris((b) =>
      b.map((x) => {
        const ada = x.siswaIds.includes(siswaId);
        const lainnya = x.siswaIds.filter((s) => s !== siswaId);
        if (x.kunci !== kunci) return { ...x, siswaIds: lainnya };
        return { ...x, siswaIds: ada ? lainnya : [...x.siswaIds, siswaId] };
      }),
    );
    setError(null);
    setPesan(null);
  }

  function simpan() {
    setError(null);
    setPesan(null);
    for (const g of baris) {
      if (!g.nama.trim()) {
        setError("Ada kelompok tanpa nama.");
        return;
      }
      if (g.siswaIds.length === 0) {
        setError(`Kelompok "${g.nama}" belum punya anggota.`);
        return;
      }
    }
    startTransition(async () => {
      const hasil = await simpanKelompokAction({
        ruangId,
        tugasId,
        kelompok: baris,
      });
      if (hasil.error) {
        setError(hasil.error);
        return;
      }
      // The action returns the saved groups with their real ids, so the panel
      // keeps working without a round trip through the server page.
      const segara = hasil.kelompok ?? [];
      setBaris(
        segara.map((k) => ({
          kunci: `g${k.id}`,
          id: k.id,
          nama: k.nama,
          siswaIds: k.anggota.map((a) => a.siswaId),
        })),
      );
      setPesan(
        segara.length === 1
          ? "1 kelompok tersimpan."
          : `${segara.length} kelompok tersimpan.`,
      );
    });
  }

  const tanpaKelompok =
    anggota.length - new Set(baris.flatMap((g) => g.siswaIds)).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kelompok tugas</CardTitle>
        <CardDescription>
          {baris.length} kelompok · {anggota.length} siswa · satu siswa hanya di
          satu kelompok.
        </CardDescription>
        <CardAction>
          <Button type="button" size="sm" variant="outline" onClick={tambah}>
            <PlusIcon />
            Tambah kelompok
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        {baris.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
            Belum ada kelompok. Buat kelompok pertama, lalu pilih anggotanya —
            siswa yang tidak masuk kelompok mana pun mengumpulkan seperti tugas
            individu.
          </p>
        ) : (
          <ul className="space-y-3">
            {baris.map((g) => (
              <li key={g.kunci}>
                <Card size="sm" className="gap-2">
                  <CardHeader className="flex items-center gap-2">
                    <Input
                      value={g.nama}
                      onChange={(event) =>
                        ubah(g.kunci, { nama: event.target.value })
                      }
                      className="max-w-[14rem] font-medium"
                      aria-label="Nama kelompok"
                      placeholder="Kelompok 1"
                    />
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {g.siswaIds.length} anggota
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => hapus(g.kunci)}
                      aria-label={`Hapus ${g.nama}`}
                    >
                      <TrashIcon />
                    </Button>
                  </CardHeader>

                  <CardContent className="flex flex-wrap items-center gap-1.5">
                    {anggota
                      .filter((s) => g.siswaIds.includes(s.id))
                      .map((s) => (
                        <Button
                          key={s.id}
                          type="button"
                          size="xs"
                          variant="secondary"
                          onClick={() => pilih(g.kunci, s.id)}
                          title="Klik untuk mengeluarkan dari kelompok"
                        >
                          <UsersIcon />
                          {s.nama}
                          <XIcon className="opacity-60" />
                        </Button>
                      ))}

                    {/*
                      Searchable picker. Only unassigned students are offered,
                      so a name vanishes from every picker once it is placed —
                      moving someone means removing them from their group first.
                    */}
                    {tersedia.length > 0 ? (
                      <Combobox
                        // Always unselected: this is an "add" action, so it shows
                        // its placeholder again the moment a name is picked.
                        value={null}
                        items={tersedia.map((s) => ({
                          value: s.id,
                          label: s.nama,
                        }))}
                        onValueChange={(nilai) => {
                          if (nilai) pilih(g.kunci, String(nilai));
                        }}
                      >
                        <ComboboxInput
                          showTrigger
                          placeholder="+ Cari & tambah anggota…"
                          aria-label={`Tambah anggota ke ${g.nama}`}
                          className="w-full sm:w-72"
                        >
                          <InputGroupAddon>
                            <SearchIcon />
                          </InputGroupAddon>
                        </ComboboxInput>
                        <ComboboxContent>
                          <ComboboxEmpty>
                            Tidak ada siswa yang cocok.
                          </ComboboxEmpty>
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item.value} value={item.value}>
                                <span className="truncate">{item.label}</span>
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Semua siswa sudah masuk kelompok.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {/* Roster: read-only overview of who sits where. */}
        <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
          <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
            Siswa kelas
          </p>
          <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
            {tanpaKelompok} siswa belum masuk kelompok — mereka mengumpulkan
            seperti tugas individu. Warna label mengikuti kelompoknya.
          </p>
          <div className="mt-2.5 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
            {anggota.map((s) => {
              const diKelompok = baris.find((g) => g.siswaIds.includes(s.id));
              return (
                <Badge
                  key={s.id}
                  variant="outline"
                  className={cn(
                    diKelompok
                      ? warnaKelompok(baris, diKelompok.kunci)
                      : "border-dashed text-muted-foreground",
                  )}
                >
                  {s.nama}
                  {diKelompok ? (
                    <span className="font-normal opacity-80">
                      · {diKelompok.nama}
                    </span>
                  ) : (
                    <span className="font-normal opacity-70">· belum</span>
                  )}
                </Badge>
              );
            })}
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className="justify-between">
        <p className="text-xs text-muted-foreground" role="status">
          {pesan ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <CheckIcon className="size-3.5" />
              {pesan}
            </span>
          ) : null}
        </p>
        <Button type="button" size="sm" onClick={simpan} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Simpan kelompok
        </Button>
      </CardFooter>
    </Card>
  );
}
