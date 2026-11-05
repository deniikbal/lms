"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { simpanKelompokAction } from "@/app/actions/ruang-belajar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AnggotaRow, KelompokRow } from "@/lib/ruang-belajar-shared";
import { cn } from "@/lib/utils";

type BarisKelompok = {
  id: number | null;
  nama: string;
  siswaIds: string[];
};

/**
 * The teacher's group editor for one group task.
 *
 * The teacher pastes in the group composition they already have: add a row per
 * group, type the name, pick the members from the dropdown. A student sits in
 * exactly one group — picking them into a new group moves them. Saving rewrites
 * the whole set in one transaction; the server refuses to drop a group whose
 * members already submitted, so a save that would orphan work never lands.
 */
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
    kelompok.map((k) => ({
      id: k.id,
      nama: k.nama,
      siswaIds: k.anggota.map((a) => a.siswaId),
    })),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  function ubah(id: number | null, ubah: Partial<BarisKelompok>) {
    setBaris((b) => b.map((x) => (x.id === id ? { ...x, ...ubah } : x)));
    setError(null);
    setPesan(null);
  }

  function tambah() {
    setBaris((b) => [
      ...b,
      { id: null, nama: `Kelompok ${b.length + 1}`, siswaIds: [] },
    ]);
  }

  function hapus(id: number | null) {
    setBaris((b) => b.filter((x) => x.id !== id));
  }

  /** Putting a student in a group removes them from any other group. */
  function pilih(id: number | null, siswaId: string) {
    setBaris((b) =>
      b.map((x) => {
        const ada = x.siswaIds.includes(siswaId);
        const lainnya = x.siswaIds.filter((s) => s !== siswaId);
        if (x.id !== id) return { ...x, siswaIds: lainnya };
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
    <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Kelompok tugas
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {baris.length} kelompok · {anggota.length} siswa · satu siswa hanya
            di satu kelompok.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={tambah}>
          <PlusIcon />
          Tambah kelompok
        </Button>
      </header>

      {baris.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
          Belum ada kelompok. Buat kelompok pertama, lalu pilih anggotanya —
          siswa yang tidak masuk kelompok mana pun mengumpulkan seperti tugas
          individu.
        </p>
      ) : (
        <ul className="space-y-3">
          {baris.map((g) => (
            <li
              key={g.id ?? g.nama}
              className="rounded-lg border border-border/70 bg-background p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={g.nama}
                  onChange={(event) => ubah(g.id, { nama: event.target.value })}
                  className="w-full max-w-[14rem] font-medium"
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
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => hapus(g.id)}
                  aria-label={`Hapus ${g.nama}`}
                >
                  <TrashIcon />
                </Button>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {anggota
                  .filter((s) => g.siswaIds.includes(s.id))
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pilih(g.id, s.id)}
                      title="Klik untuk mengeluarkan dari kelompok"
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/20"
                    >
                      <UsersIcon className="size-3" />
                      {s.nama}
                      <XIcon className="size-3 opacity-60" />
                    </button>
                  ))}

                <select
                  className="h-7 max-w-[12rem] cursor-pointer rounded-md border border-dashed border-border bg-background px-1.5 text-xs text-muted-foreground outline-none focus-visible:border-ring"
                  value=""
                  onChange={(event) => {
                    if (event.target.value) pilih(g.id, event.target.value);
                  }}
                  aria-label={`Tambah anggota ke ${g.nama}`}
                >
                  <option value="">+ Tambah anggota…</option>
                  {anggota
                    .filter((s) => !g.siswaIds.includes(s.id))
                    .map((s) => {
                      const lama = baris.find((x) =>
                        x.siswaIds.includes(s.id),
                      );
                      return (
                        <option key={s.id} value={s.id}>
                          {s.nama}
                          {lama ? ` (dari ${lama.nama})` : ""}
                        </option>
                      );
                    })}
                </select>
              </div>
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
          seperti tugas individu.
        </p>
        <div className="mt-2.5 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
          {anggota.map((s) => {
            const diKelompok = baris.find((g) => g.siswaIds.includes(s.id));
            return (
              <span
                key={s.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                  diKelompok
                    ? "border-border bg-background text-foreground"
                    : "border-dashed border-border text-muted-foreground",
                )}
              >
                {s.nama}
                {diKelompok ? (
                  <span className="text-muted-foreground">
                    · {diKelompok.nama}
                  </span>
                ) : (
                  <span className="opacity-70">· belum</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
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
      </div>
    </section>
  );
}
