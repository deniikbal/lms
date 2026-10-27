"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";

import { listTahunAjaranAction, type TahunAjaranRow } from "@/app/actions/tahun-ajaran";
import { TahunAjaranDialog } from "@/components/admin/tahun-ajaran-dialog";
import { TahunAjaranRowActions } from "@/components/admin/tahun-ajaran-row-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const HEAD =
  "px-4 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground";

export function TahunAjaranList({ initial }: { initial: TahunAjaranRow[] }) {
  const [rows, setRows] = useState<TahunAjaranRow[]>(initial);
  const [, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TahunAjaranRow | null>(null);

  const refresh = () => {
    startTransition(async () => {
      const result = await listTahunAjaranAction();
      setRows(result.rows);
    });
  };

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: TahunAjaranRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Tahun Ajaran
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola data tahun ajaran: nama periode, semester aktif/genap, dan status aktif.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div>
            <CardTitle>Tahun Ajaran</CardTitle>
            <CardDescription>
              Daftar periode tahun ajaran aktif dan lampau.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            onClick={openAdd}
            aria-label="Tambah tahun ajaran"
          >
            <PlusIcon className="size-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className={HEAD}>Tahun Ajaran</TableHead>
                <TableHead className={`${HEAD} w-28`}>Semester</TableHead>
                <TableHead className={`${HEAD} w-20 text-center`}>Status</TableHead>
                <TableHead className={`${HEAD} w-20 text-right`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-border/60 hover:bg-muted/40"
                >
                  <TableCell className="px-4 py-3 text-sm font-medium text-foreground">
                    {row.nama}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {row.semester}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-center">
                    {row.aktif ? (
                      <span className="inline-flex items-center rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Nonaktif
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="px-2 py-3">
                    <TahunAjaranRowActions
                      row={row}
                      onEdit={() => openEdit(row)}
                      onDeleted={refresh}
                    />
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Belum ada data tahun ajaran. Klik tombol + di atas untuk menambah.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TahunAjaranDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        row={editing}
        onSaved={refresh}
      />
    </div>
  );
}
