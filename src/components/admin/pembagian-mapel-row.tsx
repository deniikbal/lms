"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  VideoIcon,
  XIcon,
} from "lucide-react";

import {
  hapusJadwalAction,
  hapusRuangAction,
  simpanRuangAction,
  tambahJadwalAction,
} from "@/app/actions/pembagian";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HARI,
  JAM_MULAI_DEFAULT,
  JAM_SELESAI_DEFAULT,
  namaHari,
  type Board,
  type GuruOption,
  type RuangRow,
} from "@/lib/pembagian-shared";

/** Base UI's Select cannot hold an empty string, so "nobody" needs a stand-in. */
const NONE = "none";

/**
 * One subject of one class: its teacher, its weekly slots, and the delete
 * button.
 *
 * Every mutation here replaces the whole board from the server response, so the
 * row never drifts from the database.
 */
export function PembagianMapelRow({
  ruang,
  kelasId,
  guruOptions,
  onBoard,
}: {
  ruang: RuangRow;
  kelasId: number;
  guruOptions: GuruOption[];
  onBoard: (board: Board) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [hari, setHari] = useState(1);
  const [jamMulai, setJamMulai] = useState(JAM_MULAI_DEFAULT);
  const [jamSelesai, setJamSelesai] = useState(JAM_SELESAI_DEFAULT);
  const [linkMeet, setLinkMeet] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Kept apart from `error` so a refusal stays visible inside the confirm
  // dialog instead of hiding behind its overlay.
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const guruItems: Record<string, React.ReactNode> = { [NONE]: "Belum ada guru" };
  for (const guru of guruOptions) guruItems[guru.id] = guru.name;

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function handleGuru(value: string | null) {
    const guruId = value === NONE || !value ? null : value;
    setError(null);
    startTransition(async () => {
      const result = await simpanRuangAction({
        kelasId,
        mapelId: ruang.mapelId,
        guruId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.board) onBoard(result.board);
      flashSaved();
    });
  }

  function handleTambahJadwal() {
    setError(null);
    startTransition(async () => {
      const result = await tambahJadwalAction({
        kelasId,
        ruangId: ruang.id,
        hari,
        jamMulai,
        jamSelesai,
        linkMeet: linkMeet.trim() || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.board) onBoard(result.board);
      setFormOpen(false);
      setLinkMeet("");
    });
  }

  function handleHapusJadwal(jadwalId: number) {
    setError(null);
    startTransition(async () => {
      const result = await hapusJadwalAction({ kelasId, jadwalId });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.board) onBoard(result.board);
    });
  }

  function handleHapusRuang() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await hapusRuangAction({ kelasId, ruangId: ruang.id });
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setConfirmOpen(false);
      if (result.board) onBoard(result.board);
    });
  }

  return (
    <div className="border-b border-border/60 px-4 py-3 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/ruang/${ruang.id}`}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {ruang.nama}
            </Link>
            <span className="font-mono text-[0.65rem] tracking-wide text-muted-foreground">
              {ruang.kode}
            </span>
            {saved ? (
              <CheckIcon className="size-3.5 text-primary" aria-label="Tersimpan" />
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {ruang.jadwal.length > 0 ? (
              ruang.jadwal.map((slot) => (
                <span
                  key={slot.id}
                  className="group inline-flex items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-1.5 text-[0.7rem] text-muted-foreground"
                >
                  <span className="tabular-nums">
                    {namaHari(slot.hari)} {slot.jamMulai}–{slot.jamSelesai}
                  </span>
                  {slot.linkMeet ? (
                    <a
                      href={slot.linkMeet}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Link Meet ${namaHari(slot.hari)} ${slot.jamMulai}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <VideoIcon className="size-3" />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Hapus jadwal ${namaHari(slot.hari)} ${slot.jamMulai}`}
                    onClick={() => handleHapusJadwal(slot.id)}
                    disabled={pending}
                    className="grid size-4 place-items-center rounded-sm text-muted-foreground/60 transition-colors hover:bg-background hover:text-destructive"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-[0.7rem] text-muted-foreground">
                Belum ada jadwal
              </span>
            )}

            <button
              type="button"
              aria-label={`Tambah jadwal ${ruang.nama}`}
              onClick={() => {
                setFormOpen((open) => !open);
                setError(null);
              }}
              className="inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[0.7rem] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              <PlusIcon className="size-3" />
              jadwal
            </button>
          </div>

          {formOpen ? (
            <div className="mt-2 space-y-1.5 rounded-lg border border-border/70 bg-muted/30 p-2">
              <div className="flex flex-wrap items-end gap-1.5">
                <Select
                  items={Object.fromEntries(HARI.map((h) => [String(h.value), h.label]))}
                  value={String(hari)}
                  onValueChange={(value) => setHari(Number(value))}
                >
                  <SelectTrigger
                    aria-label="Hari"
                    className="w-24 justify-between data-[size=default]:h-8"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HARI.map((h) => (
                      <SelectItem key={h.value} value={String(h.value)}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="time"
                  aria-label="Jam mulai"
                  value={jamMulai}
                  onChange={(event) => setJamMulai(event.target.value)}
                  className="h-8 w-[6.5rem]"
                />
                <span className="pb-1.5 text-xs text-muted-foreground">–</span>
                <Input
                  type="time"
                  aria-label="Jam selesai"
                  value={jamSelesai}
                  onChange={(event) => setJamSelesai(event.target.value)}
                  className="h-8 w-[6.5rem]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Input
                  type="url"
                  aria-label="Link Meet"
                  placeholder="Link Meet (opsional)"
                  value={linkMeet}
                  onChange={(event) => setLinkMeet(event.target.value)}
                  className="h-8 flex-1"
                />

                <Button
                  type="button"
                  size="sm"
                  onClick={handleTambahJadwal}
                  disabled={pending}
                >
                  {pending ? <Loader2Icon className="animate-spin" /> : null}
                  Tambah
                </Button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-1.5 text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-1 sm:w-56">
          <Select
            items={guruItems}
            value={ruang.guruId ?? NONE}
            onValueChange={handleGuru}
            disabled={pending}
          >
            <SelectTrigger
              aria-label={`Guru ${ruang.nama}`}
              className="w-full justify-between data-[size=default]:h-8 text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(guruItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog
            open={confirmOpen}
            onOpenChange={(next) => {
              setConfirmOpen(next);
              if (!next) setDeleteError(null);
            }}
          >
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Hapus ${ruang.nama} dari kelas`}
                  title="Hapus mapel dari kelas"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                />
              }
            >
              <Trash2Icon />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Hapus {ruang.nama} dari kelas ini?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Ruang belajarnya ikut terhapus, termasuk {ruang.jadwal.length}{" "}
                  slot jadwal. Kalau yang salah hanya gurunya, ganti lewat dropdown
                  guru saja.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {deleteError ? (
                <p className="text-xs text-destructive" role="alert">
                  {deleteError}
                </p>
              ) : null}

              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={handleHapusRuang}
                >
                  {pending ? "Menghapus…" : "Hapus"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
