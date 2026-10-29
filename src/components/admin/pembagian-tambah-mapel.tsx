"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";

import { simpanRuangAction } from "@/app/actions/pembagian";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import type { Board, GuruOption, MapelOption } from "@/lib/pembagian-shared";

const NONE = "none";

/**
 * Right-hand card: put a subject into the selected class.
 *
 * Only subjects that are not in the class yet are offered — one room per
 * subject per class per year, so a duplicate cannot be created here.
 */
export function PembagianTambahMapel({
  kelasId,
  kelasNama,
  tersedia,
  guruOptions,
  onBoard,
}: {
  kelasId: number;
  kelasNama: string;
  tersedia: MapelOption[];
  guruOptions: GuruOption[];
  onBoard: (board: Board) => void;
}) {
  const [mapelId, setMapelId] = useState(NONE);
  const [guruId, setGuruId] = useState(NONE);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mapelItems: Record<string, React.ReactNode> = {};
  for (const mapel of tersedia) {
    mapelItems[String(mapel.id)] = `${mapel.kode} — ${mapel.nama}`;
  }

  const guruItems: Record<string, React.ReactNode> = { [NONE]: "Belum ditentukan" };
  for (const guru of guruOptions) guruItems[guru.id] = guru.name;

  function handleTambah() {
    if (mapelId === NONE) {
      setError("Pilih mapel yang mau ditambahkan.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await simpanRuangAction({
        kelasId,
        mapelId: Number(mapelId),
        guruId: guruId === NONE ? null : guruId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.board) onBoard(result.board);
      setMapelId(NONE);
      setGuruId(NONE);
    });
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-sm">Tambah mapel ke {kelasNama}</CardTitle>
        <CardDescription>
          Satu mapel di satu kelas = satu ruang belajar.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {tersedia.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Semua mapel sudah ada di kelas ini.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <label
                htmlFor="mapel-baru"
                className="text-xs font-medium text-foreground"
              >
                Mapel
              </label>
              <Select
                items={mapelItems}
                // `null`, not the sentinel: the sentinel is not in `items`, so
                // Base UI would print the raw string "none" in the trigger.
                value={mapelId === NONE ? null : mapelId}
                onValueChange={(value) => {
                  setMapelId(String(value ?? NONE));
                  setError(null);
                }}
              >
                <SelectTrigger
                  id="mapel-baru"
                  aria-label="Mapel"
                  className="w-full justify-between data-[size=default]:h-9"
                >
                  <SelectValue placeholder="Pilih mapel" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(mapelItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="guru-baru"
                className="text-xs font-medium text-foreground"
              >
                Guru pengampu
              </label>
              <Select
                items={guruItems}
                value={guruId}
                onValueChange={(value) => {
                  setGuruId(String(value ?? NONE));
                  setError(null);
                }}
              >
                <SelectTrigger
                  id="guru-baru"
                  aria-label="Guru pengampu"
                  className="w-full justify-between data-[size=default]:h-9"
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
            </div>

            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </>
        )}
      </CardContent>

      {tersedia.length > 0 ? (
        <CardFooter>
          <Button
            type="button"
            size="sm"
            onClick={handleTambah}
            disabled={pending}
            className="w-full"
          >
            {pending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <PlusIcon />
            )}
            Tambah
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
