"use client";

import { useRef, useState, useTransition } from "react";
import { DownloadIcon, Loader2Icon, UploadIcon } from "lucide-react";
import * as XLSX from "xlsx";

import {
  importTeachersAction,
  type ImportTeacherResult,
} from "@/app/actions/import-teachers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ImportTeachersDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportTeacherResult | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function downloadTemplate() {
    const templateData = [
      {
        NIP: "198203112008012004",
        Nama: "Drs. Budi Santoso, M.Pd.",
        JK: "L",
        Email: "budi.santoso@sekolah.sch.id",
        Status: "Aktif",
      },
      {
        NIP: "199001052015031002",
        Nama: "Siti Rahmawati, S.Pd.",
        JK: "P",
        Email: "siti.rahmawati@sekolah.sch.id",
        Status: "Aktif",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guru");
    XLSX.writeFile(workbook, "template_import_guru.xlsx");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await importTeachersAction(formData);
      setResult(res);
      if (res.ok) {
        onImported();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          onOpenChange(next);
          if (!next) resetState();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Data Guru (Excel)</DialogTitle>
          <DialogDescription>
            Unggah file format .xlsx atau .xls. Password default otomatis diset sama dengan NIP.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            <span>Belum punya format? Gunakan template resmi:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
            >
              <DownloadIcon className="size-3.5" />
              Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="excel-teacher-file"
              className="text-xs font-medium text-foreground"
            >
              Pilih File Excel
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="excel-teacher-file"
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                disabled={pending}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80"
              />
            </div>
          </div>

          {result ? (
            result.ok ? (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-700 dark:text-green-300 space-y-1">
                <p className="font-semibold">Import Berhasil!</p>
                <p>
                  Total: {result.totalRows} data (Ditambahkan: {result.inserted}, Diperbarui: {result.updated})
                </p>
                {result.failed && result.failed > 0 ? (
                  <p className="text-destructive font-medium">Gagal diproses: {result.failed} data</p>
                ) : null}
                {result.errors && result.errors.length > 0 ? (
                  <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-0.5">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>{result.message ?? "Gagal memproses import."}</AlertDescription>
              </Alert>
            )
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Tutup
            </Button>
            <Button type="submit" disabled={!file || pending}>
              {pending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Mengimpor…
                </>
              ) : (
                <>
                  <UploadIcon className="size-4" />
                  Mulai Import
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
