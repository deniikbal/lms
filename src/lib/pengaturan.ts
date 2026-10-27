import { pool } from "@/lib/db";

export type Jenjang = "SD" | "SMP" | "SMA" | "SMK";

export type PengaturanSekolah = {
  nama_sekolah: string;
  alamat: string;
  jenjang: Jenjang;
  kepala_sekolah: string;
  kkm: number;
  npsn: string;
};

/** Fetch all school settings as a shaped object. */
export async function getPengaturanSekolah(): Promise<PengaturanSekolah> {
  const { rows } = await pool.query<{ kunci: string; nilai: string }>(
    `select kunci, nilai from pengaturan where kunci in (
      'nama_sekolah', 'alamat', 'jenjang', 'kepala_sekolah', 'kkm', 'npsn'
    )`,
  );

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.kunci] = row.nilai;
  }

  const jenjangValue = settings["jenjang"] ?? "SMK";

  // Validate jenjang
  const validJenjang: Jenjang =
    jenjangValue === "SD" || jenjangValue === "SMP" || jenjangValue === "SMA" || jenjangValue === "SMK"
      ? jenjangValue
      : "SMK";

  return {
    nama_sekolah: settings["nama_sekolah"] ?? "",
    alamat: settings["alamat"] ?? "",
    jenjang: validJenjang,
    kepala_sekolah: settings["kepala_sekolah"] ?? "",
    kkm: parseInt(settings["kkm"] ?? "75", 10),
    npsn: settings["npsn"] ?? "",
  };
}

/** Update a single setting key-value pair. */
export async function updatePengaturan(
  kunci: string,
  nilai: string,
): Promise<void> {
  await pool.query(
    `insert into pengaturan (kunci, nilai) values ($1, $2)
     on conflict (kunci) do update set nilai = excluded.nilai, updated_at = now()`,
    [kunci, nilai],
  );
}

/** Bulk update multiple settings. */
export async function updatePengaturanBatch(
  settings: Record<string, string>,
): Promise<void> {
  for (const [kunci, nilai] of Object.entries(settings)) {
    await updatePengaturan(kunci, nilai);
  }
}