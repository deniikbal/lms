import { Suspense } from "react";
import type { Metadata } from "next";

import { setUserRole } from "@/app/actions/users";
import { LoadingPanel } from "@/components/loading-panel";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/roles";
import { requireRole } from "@/lib/session";
import { countUsersByRole, listUsers, type UserRow } from "@/lib/users";

export const metadata: Metadata = {
  title: "Dashboard Admin · LMS Sekolah",
};

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingPanel varian="panel" />}>
      <AdminDashboard />
    </Suspense>
  );
}

async function AdminDashboard() {
  // Secure check: role comes from the session in the database, not the cookie.
  const user = await requireRole("admin");
  const [users, counts] = await Promise.all([listUsers(), countUsersByRole()]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard Admin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola peran pengguna. Perubahan langsung berlaku pada permintaan
          berikutnya.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <StatCard key={role} label={ROLE_LABEL[role]} value={counts[role]} />
        ))}
      </section>

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>Pengguna</CardTitle>
          <CardDescription>{users.length} akun</CardDescription>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Nama</TableHead>
              <TableHead className="px-4">Peran</TableHead>
              <TableHead className="px-4">Terdaftar</TableHead>
              <TableHead className="px-4">Ubah peran</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((row) => (
              <UserTableRow key={row.id} row={row} isSelf={row.id === user.id} />
            ))}
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Belum ada pengguna.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-xs font-medium tracking-wide uppercase">
          {label}
        </CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function UserTableRow({ row, isSelf }: { row: UserRow; isSelf: boolean }) {
  return (
    <TableRow>
      <TableCell className="px-4 py-3">
        <p className="font-medium text-foreground">
          {row.name}
          {isSelf ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (akun Anda)
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">{row.email ?? "—"}</p>
      </TableCell>
      <TableCell className="px-4">
        <RoleBadge role={row.role} />
      </TableCell>
      <TableCell className="px-4 text-muted-foreground">
        {new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
        }).format(row.createdAt)}
      </TableCell>
      <TableCell className="px-4">
        {isSelf ? (
          <span className="text-xs text-muted-foreground">
            Tidak dapat diubah
          </span>
        ) : (
          <form action={setUserRole} className="flex items-center gap-2">
            <input type="hidden" name="userId" value={row.id} />
            <NativeSelect
              name="role"
              size="sm"
              defaultValue={row.role satisfies Role}
              aria-label={`Peran untuk ${row.name}`}
              className="w-32"
            >
              {ROLES.map((role) => (
                <NativeSelectOption key={role} value={role}>
                  {ROLE_LABEL[role]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button type="submit" variant="outline" size="sm">
              Simpan
            </Button>
          </form>
        )}
      </TableCell>
    </TableRow>
  );
}
