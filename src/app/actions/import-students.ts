"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import * as XLSX from "xlsx";

import { pool } from "@/lib/db";
import { requireRole } from "@/lib/session";

export type ImportStudentResult = {
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

export async function importStudentsAction(
  formData: FormData,
): Promise<ImportStudentResult> {
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
    const { rows: kelasRows } = await client.query<{ id: number; nama: string }>(
      `select id, lower(trim(nama)) as nama from kelas`,
    );
    const kelasMap = new Map<string, number>();
    for (const k of kelasRows) {
      kelasMap.set(k.nama, k.id);
    }

    await client.query("begin");

    for (const [idx, row] of rawRows.entries()) {
      const rowNum = idx + 2; // header is row 1
      const nisn = getCell(row, ["nisn", "username", "nomorinduk"]);
      const name = getCell(row, ["nama", "namalengkap", "name"]);
      const jkRaw = getCell(row, ["jk", "jeniskelamin", "gender"]).toUpperCase();
      const kelasRaw = getCell(row, ["kelas", "namakelas"]);
      const email = getCell(row, ["email"]);
      const aktifRaw = getCell(row, ["aktif", "status"]).toLowerCase();

      if (!nisn) {
        errors.push(`Baris ${rowNum}: NISN kosong.`);
        continue;
      }
      if (!/^[a-zA-Z0-9_.]{3,50}$/.test(nisn)) {
        errors.push(`Baris ${rowNum}: NISN "${nisn}" tidak valid (3–50 karakter alfanumerik).`);
        continue;
      }
      if (!name || name.length < 2) {
        errors.push(`Baris ${rowNum}: Nama minimal 2 karakter.`);
        continue;
      }

      let jk: "L" | "P" | null = null;
      if (jkRaw === "L" || jkRaw === "LAKI-LAKI" || jkRaw === "LAKI") jk = "L";
      else if (jkRaw === "P" || jkRaw === "PEREMPUAN") jk = "P";

      let kelasId: number | null = null;
      if (kelasRaw) {
        const found = kelasMap.get(kelasRaw.toLowerCase());
        if (found !== undefined) {
          kelasId = found;
        } else {
          // create missing class automatically to avoid friction
          const insertKelas = await client.query<{ id: number }>(
            `insert into kelas (nama) values ($1) on conflict (nama) do nothing returning id`,
            [kelasRaw],
          );
          if (insertKelas.rows[0]?.id) {
            kelasId = insertKelas.rows[0].id;
            kelasMap.set(kelasRaw.toLowerCase(), kelasId);
          } else {
            const recheck = await client.query<{ id: number }>(
              `select id from kelas where lower(trim(nama)) = lower(trim($1))`,
              [kelasRaw],
            );
            kelasId = recheck.rows[0]?.id ?? null;
          }
        }
      }

      const aktif =
        aktifRaw === "" ||
        aktifRaw === "true" ||
        aktifRaw === "1" ||
        aktifRaw === "ya" ||
        aktifRaw === "aktif";

      const { rows: existing } = await client.query<{ id: string }>(
        `select id from "user" where username = $1 and role = 'siswa'`,
        [nisn],
      );

      const now = new Date();

      if (existing.length > 0) {
        const userId = existing[0].id;
        await client.query(
          `update "user"
              set name = $2,
                  email = coalesce($3, email),
                  jk = coalesce($4, jk),
                  kelas_id = coalesce($5, kelas_id),
                  aktif = $6,
                  "updatedAt" = now()
            where id = $1`,
          [userId, name, email || null, jk, kelasId, aktif],
        );
        updated++;
      } else {
        const userId = `siswa-${nisn}-${crypto.randomBytes(4).toString("hex")}`;
        await client.query(
          `insert into "user"
             (id, name, email, "emailVerified", "createdAt", "updatedAt",
              role, username, "displayUsername", jk, kelas_id, aktif)
           values ($1, $2, $3, false, $4, $4, 'siswa', $5, $5, $6, $7, $8)`,
          [userId, name, email || null, now, nisn, jk, kelasId, aktif],
        );

        const passwordHash = await hashPassword(nisn);
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
      message: error instanceof Error ? error.message : "Gagal memproses data import.",
    };
  } finally {
    client.release();
  }

  revalidatePath("/admin/siswa");
  revalidatePath("/admin/kelas");

  return {
    ok: true,
    totalRows: rawRows.length,
    inserted,
    updated,
    failed: errors.length,
    errors: errors.slice(0, 10),
  };
}
