"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import * as XLSX from "xlsx";

import { pool } from "@/lib/db";
import { requireRole } from "@/lib/session";

export type ImportTeacherResult = {
  ok: boolean;
  message?: string;
  totalRows?: number;
  inserted?: number;
  updated?: number;
  failed?: number;
  errors?: string[];
};

type RowRecord = Record<string, unknown>;

function getCell(row: RowRecord, keys: string[]): string {
  const normKeys = Object.keys(row).map((k) => ({
    raw: k,
    clean: k.toLowerCase().replace(/[^a-z0-9]/g, ""),
  }));

  for (const key of keys) {
    const cleanTarget = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const match = normKeys.find((item) => item.clean === cleanTarget);
    if (match && row[match.raw] !== undefined && row[match.raw] !== null) {
      return String(row[match.raw]).trim();
    }
  }
  return "";
}

export async function importTeachersAction(
  formData: FormData,
): Promise<ImportTeacherResult> {
  await requireRole("admin");

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, message: "File excel wajib diunggah." };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return { ok: false, message: "Format file tidak valid atau rusak." };
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { ok: false, message: "File excel tidak memiliki worksheet." };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<RowRecord>(sheet, { defval: "" });

  if (rawRows.length === 0) {
    return { ok: false, message: "Data pada file excel kosong." };
  }

  const client = await pool.connect();
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;

  try {
    await client.query("begin");

    for (const [idx, row] of rawRows.entries()) {
      const rowNum = idx + 2; // header is row 1
      const nip = getCell(row, ["nip", "username", "nomorinduk", "nuptk"]);
      const name = getCell(row, ["nama", "namalengkap", "name"]);
      const jkRaw = getCell(row, ["jk", "jeniskelamin", "gender"]).toUpperCase();
      const email = getCell(row, ["email"]);
      const aktifRaw = getCell(row, ["aktif", "status"]).toLowerCase();

      if (!nip) {
        errors.push(`Baris ${rowNum}: NIP kosong.`);
        continue;
      }
      if (!/^[a-zA-Z0-9_.]{3,50}$/.test(nip)) {
        errors.push(`Baris ${rowNum}: NIP "${nip}" tidak valid (3–50 karakter alfanumerik).`);
        continue;
      }
      if (!name || name.length < 2) {
        errors.push(`Baris ${rowNum}: Nama minimal 2 karakter.`);
        continue;
      }

      let jk: "L" | "P" | null = null;
      if (jkRaw === "L" || jkRaw === "LAKI-LAKI" || jkRaw === "LAKI") jk = "L";
      else if (jkRaw === "P" || jkRaw === "PEREMPUAN") jk = "P";

      const aktif =
        aktifRaw === "" ||
        aktifRaw === "true" ||
        aktifRaw === "1" ||
        aktifRaw === "ya" ||
        aktifRaw === "aktif";

      const { rows: existing } = await client.query<{ id: string }>(
        `select id from "user" where username = $1 and role = 'guru'`,
        [nip],
      );

      const now = new Date();

      if (existing.length > 0) {
        const userId = existing[0].id;
        await client.query(
          `update "user"
              set name = $2,
                  email = coalesce($3, email),
                  jk = coalesce($4, jk),
                  aktif = $5,
                  "updatedAt" = now()
            where id = $1`,
          [userId, name, email || null, jk, aktif],
        );
        updated++;
      } else {
        const userId = `guru-${nip}-${crypto.randomBytes(4).toString("hex")}`;
        await client.query(
          `insert into "user"
             (id, name, email, "emailVerified", "createdAt", "updatedAt",
              role, username, "displayUsername", jk, kelas_id, aktif)
           values ($1, $2, $3, false, $4, $4, 'guru', $5, $5, $6, null, $7)`,
          [userId, name, email || null, now, nip, jk, aktif],
        );

        const passwordHash = await hashPassword(nip);
        await client.query(
          `insert into account
             (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
           values ($1, $2, 'credential', $3, $4, $5, $5)
           on conflict (id) do nothing`,
          [`acc-${userId}`, userId, userId, passwordHash, now],
        );
        inserted++;
      }
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Gagal memproses data import guru.",
    };
  } finally {
    client.release();
  }

  revalidatePath("/admin/guru");

  return {
    ok: true,
    totalRows: rawRows.length,
    inserted,
    updated,
    failed: errors.length,
    errors: errors.slice(0, 10),
  };
}
