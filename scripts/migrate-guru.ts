/**
 * Migration: guru (role = "guru").
 *
 *   pnpm tsx scripts/migrate-guru.ts
 *
 * Idempotent — safe to re-run. Adds `kelas.wali_id` (a teacher can be a homeroom
 * teacher), tops up the class list with the SMK classes the sample teachers
 * teach, then seeds 10 teachers plus the `guru` / `guru123` demo login.
 *
 * Teachers share the `user` table with students: `username` holds the NIP,
 * `kelas_id` is forced to NULL (that column belongs to students).
 */
import { Pool } from "pg";

process.loadEnvFile(".env");

const KELAS_BARU = [
  { nama: "X AKL 1", tingkat: 10 },
  { nama: "XI BD 1", tingkat: 11 },
];

type Guru = {
  nip: string;
  nama: string;
  jk: "L" | "P";
  /** Kept for the Ruang Belajar module; not stored yet. */
  mapel: string;
};

const GURU: Guru[] = [
  { nip: "198203112008012004", nama: "Rina Kartikasari, S.Pd.", jk: "P", mapel: "Matematika" },
  { nip: "198507242010012011", nama: "Drs. Hadi Purnomo", jk: "L", mapel: "AI" },
  { nip: "199001052015031002", nama: "Sulastri, S.Pd.", jk: "P", mapel: "B. Indonesia + B. Jawa" },
  { nip: "198811172014022001", nama: "Yoga Pratama, S.Kom.", jk: "L", mapel: "Informatika" },
  { nip: "197905302005011006", nama: "Dewi Anggraeni, S.Pd.", jk: "P", mapel: "B. Inggris" },
  { nip: "199206142019031008", nama: "Bambang Setiawan, S.Pd.", jk: "L", mapel: "Sejarah + PPKn" },
  { nip: "198709092011012013", nama: "Arif Nugroho, S.Or.", jk: "L", mapel: "PJOK" },
  { nip: "199304212020122005", nama: "Fitri Handayani, S.E.", jk: "P", mapel: "Akuntansi Dasar" },
  { nip: "198612012009031009", nama: "Nanda Puspita, S.Pd.", jk: "P", mapel: "Matematika" },
  { nip: "198805172013011005", nama: "Teguh Wibowo, S.T.", jk: "L", mapel: "Dasar-dasar Teknik Jaringan" },
];

/** Homeroom teacher per class, by NIP. */
const WALI_KELAS: Record<string, string> = {
  "X TKJ 1": "198811172014022001", // Yoga
  "X AKL 1": "199304212020122005", // Fitri
  "XI TKJ 1": "198805172013011005", // Teguh
  "XI BD 1": "197905302005011006", // Dewi
  "XII TKJ 1": "198203112008012004", // Rina
};

/** Random "last active" between 1 and 40 hours ago. */
function randomLastActive(): Date {
  const hours = 1 + Math.random() * 39;
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(
      `alter table kelas add column if not exists wali_id text references "user"(id) on delete set null`,
    );

    for (const k of KELAS_BARU) {
      await client.query(
        `insert into kelas (nama, tingkat) values ($1, $2) on conflict (nama) do nothing`,
        [k.nama, k.tingkat],
      );
    }

    const { hashPassword } = await import("better-auth/crypto");
    const passwordGuru = await hashPassword("rahasia123");
    const now = new Date();
    let created = 0;

    for (const guru of GURU) {
      const id = `guru-${guru.nip}`;

      const inserted = await client.query(
        `insert into "user"
           (id, name, email, "emailVerified", "createdAt", "updatedAt",
            role, username, "displayUsername", jk, kelas_id, aktif, terakhir_aktif_at)
         values ($1, $2, null, false, $3, $3, 'guru', $4, $4, $5, null, true, $6)
         on conflict (id) do nothing`,
        [id, guru.nama, now, guru.nip, guru.jk, randomLastActive()],
      );

      if (inserted.rowCount === 0) continue;

      await client.query(
        `insert into account
           (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $2, $3, $4, $4)
         on conflict (id) do nothing`,
        [`acc-${id}`, id, passwordGuru, now],
      );

      created += 1;
    }

    // Keep the old demo login working, now with a NIP-less username.
    const demo = await client.query<{ id: string }>(
      `select id from "user" where email = 'guru@lms.test'`,
    );

    if (demo.rows[0]) {
      const demoId = demo.rows[0].id;
      await client.query(
        `update "user"
            set name = 'Guru Demo', username = 'guru', "displayUsername" = 'guru',
                jk = coalesce(jk, 'P'), kelas_id = null, aktif = true,
                terakhir_aktif_at = $2, "updatedAt" = now()
          where id = $1`,
        [demoId, randomLastActive()],
      );
      await client.query(
        `update account set password = $2, "updatedAt" = now()
          where "userId" = $1 and "providerId" = 'credential'`,
        [demoId, await hashPassword("guru123")],
      );
    }

    for (const [namaKelas, nip] of Object.entries(WALI_KELAS)) {
      await client.query(
        `update kelas set wali_id = (select id from "user" where username = $1)
          where nama = $2`,
        [nip, namaKelas],
      );
    }

    await client.query("commit");

    console.log(`Migration guru selesai. ${created} guru baru, ${KELAS_BARU.length} kelas ditambah.`);
    console.log("Login: NIP + rahasia123, atau akun demo guru / guru123.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
