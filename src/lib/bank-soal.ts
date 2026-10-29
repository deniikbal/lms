import { pool } from "@/lib/db";
import {
  bandingAlami,
  kunciTersimpan,
  pilihanTersimpan,
} from "@/lib/ruang-belajar-shared";
import {
  HURUF,
  type BankSoalRow,
  type FilterBank,
  type JenisSoalBank,
  type MapelBankOption,
  type TopikRingkas,
} from "@/lib/bank-soal-shared";

// Server-side consumers import everything from here; the pure pieces live in
// `bank-soal-shared` so Client Components can use them without pulling in `pg`.
export * from "@/lib/bank-soal-shared";

function objek<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export type Hasil =
  | { ok: true; topikId?: number | null }
  | { ok: false; error: string };

/** Drops blanks and stray keys, so the stored JSONB is always A–E only. */
function rapikanPilihan(pilihan: Record<string, string>): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const huruf of HURUF) {
    const isi = String(pilihan[huruf] ?? "").trim();
    if (isi) hasil[huruf] = isi;
  }
  return hasil;
}

// ------------------------------------------------------------------- scope

/**
 * The subjects this teacher may keep a bank for.
 *
 * A bank row is scoped to (teacher, subject), and the subject has to be one
 * they actually teach — otherwise the picker would offer thirty subjects from
 * other departments and the bank would fill up with questions nobody can find.
 * Rooms from every year count: a teacher who lost a class this year still owns
 * last year's questions.
 */
export async function listMapelBank(guruId: string): Promise<MapelBankOption[]> {
  const { rows } = await pool.query<{
    id: number;
    kode: string;
    nama: string;
    ruang: number;
    soal: number;
  }>(
    `select m.id, m.kode, m.nama,
            (select count(*)::int from ruang r
              where r.mapel_id = m.id and r.guru_id = $1) as ruang,
            (select count(*)::int from bank_soal b
              where b.mapel_id = m.id and b.guru_id = $1) as soal
       from mapel m
      where exists (
        select 1 from ruang r
         where r.mapel_id = m.id and r.guru_id = $1
      )
      order by m.nama asc`,
    [guruId],
  );

  // "Matematika" and "Matematika Wajib" sort next to each other by name, but
  // "Bahasa Indonesia" against "Bahasa Inggris" does not — hence the collator.
  return rows.sort((a, b) => bandingAlami(a.nama, b.nama));
}

/** True when `guruId` holds at least one room for `mapelId`. */
export async function bolehMapel(guruId: string, mapelId: number): Promise<boolean> {
  const { rows } = await pool.query(
    `select 1 from ruang where guru_id = $1 and mapel_id = $2 limit 1`,
    [guruId, mapelId],
  );
  return rows.length > 0;
}

/**
 * The subject choices shown inside a room's quiz editor.
 *
 * The room's own subject is always present, in first place. That matters for
 * the case the picker is really for: an admin editing a colleague's quiz has no
 * rooms of their own, and the room's subject may predate the teacher's current
 * timetable. The bank itself stays scoped to the owner — this only shapes the
 * dropdown.
 */
export async function opsiMapelRuang(
  pemilikId: string | null,
  ruangId: number,
): Promise<{ mapelId: number | null; mapel: MapelBankOption[] }> {
  const { rows } = await pool.query<{
    mapel_id: number | null;
    kode: string | null;
    nama: string | null;
  }>(
    `select r.mapel_id, m.kode, m.nama
       from ruang r left join mapel m on m.id = r.mapel_id
      where r.id = $1`,
    [ruangId],
  );

  const milikRuang = rows[0];
  const mapelId = milikRuang?.mapel_id ?? null;
  const daftar = pemilikId ? await listMapelBank(pemilikId) : [];

  if (mapelId === null || !milikRuang?.nama) {
    return { mapelId, mapel: daftar };
  }
  if (daftar.some((item) => item.id === mapelId)) {
    // Still first: the quiz's own subject is the one being written right now.
    const lain = daftar.filter((item) => item.id !== mapelId);
    return {
      mapelId,
      mapel: [daftar.find((item) => item.id === mapelId)!, ...lain],
    };
  }

  return {
    mapelId,
    mapel: [
      { id: mapelId, kode: milikRuang.kode ?? "", nama: milikRuang.nama, ruang: 1, soal: 0 },
      ...daftar,
    ],
  };
}

// ------------------------------------------------------------------- topik

/**
 * The teacher's topics — the bank's index.
 *
 * A topic exists whether or not it holds questions yet, which is the point of
 * making it a row: "Laju Reaksi" is created first, opened, and filled. Counting
 * is left-joined so a fresh topic still appears, with zeroes.
 */
export async function listTopik(
  guruId: string,
  filter: FilterBank = { mapelId: null, jenis: null, cari: "" },
): Promise<TopikRingkas[]> {
  const { rows } = await pool.query<{
    id: number;
    nama: string;
    mapel_id: number | null;
    mapel_kode: string | null;
    mapel_nama: string | null;
    soal: number;
    jumlah_pg: number;
    jumlah_esai: number;
    bobot: number;
    dipakai: number;
    diperbarui: string;
  }>(
    `select t.id, t.nama, t.mapel_id, m.kode as mapel_kode, m.nama as mapel_nama,
            count(b.id)::int as soal,
            count(b.id) filter (where b.jenis = 'pg')::int as jumlah_pg,
            count(b.id) filter (where b.jenis = 'esai')::int as jumlah_esai,
            coalesce(sum(b.bobot), 0)::int as bobot,
            coalesce(sum((
              select count(*) from soal s
                join kuis q on q.id = s.kuis_id
                join ruang r on r.id = q.ruang_id
               where s.bank_soal_id = b.id and r.guru_id = t.guru_id
            )), 0)::int as dipakai,
            to_char(greatest(t.updated_at, coalesce(max(b.updated_at), t.updated_at))
                    at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as diperbarui
       from topik_bank t
       left join mapel m on m.id = t.mapel_id
       left join bank_soal b on b.topik_id = t.id
      where t.guru_id = $1
        and ($2::int is null or t.mapel_id = $2)
        and ($3::text is null or b.jenis = $3)
        and ($4::text = '' or t.nama ilike '%' || $4 || '%'
             or exists (select 1 from bank_soal b2
                         where b2.topik_id = t.id
                           and b2.pertanyaan ilike '%' || $4 || '%'))
      group by t.id, t.nama, t.mapel_id, t.guru_id, t.updated_at, m.kode, m.nama
      order by m.nama asc nulls last, t.nama asc`,
    [guruId, filter.mapelId, filter.jenis, filter.cari],
  );

  return rows
    .map((row) => ({
      id: row.id,
      nama: row.nama,
      mapelId: row.mapel_id,
      mapelKode: row.mapel_kode,
      mapelNama: row.mapel_nama,
      soal: row.soal,
      jumlahPg: row.jumlah_pg,
      jumlahEsai: row.jumlah_esai,
      bobot: row.bobot,
      dipakai: row.dipakai,
      diperbarui: row.diperbarui,
    }))
    .sort(
      (a, b) =>
        bandingAlami(a.mapelNama, b.mapelNama) || bandingAlami(a.nama, b.nama),
    );
}

/** One topic, scoped to its owner. */
export async function getTopik(guruId: string, topikId: number): Promise<TopikRingkas | null> {
  const daftar = await listTopik(guruId);
  return daftar.find((item) => item.id === topikId) ?? null;
}

/**
 * Creates a topic and hands back its id.
 *
 * Case-insensitive uniqueness lives in a database index, so the check here is
 * only for a readable message; a racing double-submit still cannot slip past.
 */
export async function tambahTopik(
  guruId: string,
  nama: string,
  mapelId: number | null,
): Promise<Hasil & { id?: number }> {
  const bersih = nama.trim();
  if (bersih === "") return { ok: false, error: "Nama topik masih kosong." };
  if (bersih.length > 80) return { ok: false, error: "Nama topik maksimal 80 karakter." };

  const { rows: kembar } = await pool.query(
    `select 1 from topik_bank
      where guru_id = $1
        and mapel_id is not distinct from $2
        and lower(btrim(nama)) = lower($3)
      limit 1`,
    [guruId, mapelId, bersih],
  );
  if (kembar.length > 0) {
    return { ok: false, error: `Topik "${bersih}" sudah ada di mapel itu.` };
  }

  const { rows } = await pool.query<{ id: number }>(
    `insert into topik_bank (guru_id, mapel_id, nama) values ($1, $2, $3) returning id`,
    [guruId, mapelId, bersih],
  );
  return { ok: true, id: rows[0].id };
}

/**
 * Renames a topic and carries the label into every question that used it.
 *
 * `bank_soal.topik` is a copy of the name, kept for the quiz's own listing.
 * Renaming only one of the two would leave the bank showing a topic whose
 * questions claim another — hence one transaction, both writes.
 */
export async function ubahTopik(
  guruId: string,
  topikId: number,
  nama: string,
  mapelId: number | null,
): Promise<Hasil> {
  const bersih = nama.trim();
  if (bersih === "") return { ok: false, error: "Nama topik masih kosong." };
  if (bersih.length > 80) return { ok: false, error: "Nama topik maksimal 80 karakter." };

  const { rows: kembar } = await pool.query(
    `select 1 from topik_bank
      where guru_id = $1
        and mapel_id is not distinct from $3
        and lower(btrim(nama)) = lower($2)
        and id <> $4
      limit 1`,
    [guruId, bersih, mapelId, topikId],
  );
  if (kembar.length > 0) {
    return { ok: false, error: `Topik "${bersih}" sudah ada di mapel itu.` };
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rowCount } = await client.query(
      `update topik_bank
          set nama = $3, mapel_id = $4, updated_at = now()
        where id = $2 and guru_id = $1`,
      [guruId, topikId, bersih, mapelId],
    );
    if (rowCount === 0) {
      await client.query("rollback");
      return { ok: false, error: "Topik tidak ditemukan." };
    }
    await client.query(
      `update bank_soal
          set topik = $3, mapel_id = $4, updated_at = now()
        where topik_id = $2 and guru_id = $1`,
      [guruId, topikId, bersih, mapelId],
    );
    await client.query("commit");
    return { ok: true };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deletes a topic and every question in it.
 *
 * Copying is deliberately not offered: a question belongs to exactly one
 * topic, and a silent copy would appear twice in the picker with no way to
 * tell which is which. The rows are removed, not orphaned — questions without
 * a topic would be invisible to the topic-based picker.
 */
export async function hapusTopik(
  guruId: string,
  topikId: number,
): Promise<Hasil & { soal: number }> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ n: number }>(
      `select count(*)::int as n from bank_soal where topik_id = $2 and guru_id = $1`,
      [guruId, topikId],
    );
    const { rowCount } = await client.query(
      `delete from topik_bank where id = $2 and guru_id = $1`,
      [guruId, topikId],
    );
    if (rowCount === 0) {
      await client.query("rollback");
      return { ok: false, error: "Topik tidak ditemukan.", soal: 0 };
    }
    await client.query("commit");
    return { ok: true, soal: rows[0].n };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------- read

const KOLOM_SOAL = `
  b.id,
  b.topik_id,
  b.mapel_id,
  m.kode as mapel_kode,
  m.nama as mapel_nama,
  b.jenis,
  b.pertanyaan,
  b.pilihan,
  b.jawaban,
  b.bobot,
  b.topik,
  -- Counted across every class the teacher holds, which is what makes a bank
  -- question worth reusing: one item, twelve classes, one usage figure.
  (select count(*)::int
     from soal s
     join kuis q on q.id = s.kuis_id
     join ruang r on r.id = q.ruang_id
    where s.bank_soal_id = b.id and r.guru_id = b.guru_id) as dipakai,
  to_char(b.created_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as dibuat,
  to_char(b.updated_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') as diperbarui
`;

type RawBank = {
  id: number;
  topik_id: number | null;
  mapel_id: number | null;
  mapel_kode: string | null;
  mapel_nama: string | null;
  jenis: JenisSoalBank;
  pertanyaan: string;
  pilihan: unknown;
  jawaban: string | null;
  bobot: number;
  topik: string | null;
  dipakai: number;
  dibuat: string;
  diperbarui: string;
};

function toBank(row: RawBank): BankSoalRow {
  return {
    id: row.id,
    topikId: row.topik_id,
    mapelId: row.mapel_id,
    mapelKode: row.mapel_kode,
    mapelNama: row.mapel_nama,
    jenis: row.jenis,
    pertanyaan: row.pertanyaan,
    pilihan: pilihanTersimpan(row.pilihan),
    jawaban: kunciTersimpan(row.pilihan, row.jawaban),
    bobot: row.bobot,
    topik: row.topik,
    dipakai: row.dipakai,
    dibuat: row.dibuat,
    diperbarui: row.diperbarui,
  };
}

/**
 * The questions of one topic, in the order they were written.
 *
 * Ordered by id rather than by update time: the quiz receives them in exactly
 * this order, and a teacher expects question 3 to stay question 3 even after
 * they fixed a typo in it.
 */
export async function listSoalTopik(
  guruId: string,
  topikId: number,
  jenis: JenisSoalBank | null = null,
  cari = "",
): Promise<BankSoalRow[]> {
  const { rows } = await pool.query<RawBank>(
    `select ${KOLOM_SOAL}
       from bank_soal b
       left join mapel m on m.id = b.mapel_id
      where b.guru_id = $1
        and b.topik_id = $2
        and ($3::text is null or b.jenis = $3)
        and ($4::text = '' or b.pertanyaan ilike '%' || $4 || '%')
      order by b.id asc`,
    [guruId, topikId, jenis, cari],
  );
  return rows.map(toBank);
}

export async function getBankSoal(
  guruId: string,
  bankId: number,
): Promise<BankSoalRow | null> {
  const { rows } = await pool.query<RawBank>(
    `select ${KOLOM_SOAL}
       from bank_soal b
       left join mapel m on m.id = b.mapel_id
      where b.id = $2 and b.guru_id = $1`,
    [guruId, bankId],
  );
  return rows[0] ? toBank(rows[0]) : null;
}

/**
 * The question ids of one topic, in bank order.
 *
 * Exists so "assign the whole topic" is one click. The ids are resolved on the
 * server from the topic itself rather than posted from the client, so the set a
 * teacher confirmed is exactly the set that lands in the quiz.
 */
export async function idsTopik(guruId: string, topikId: number): Promise<number[]> {
  const { rows } = await pool.query<{ id: number }>(
    `select id from bank_soal
      where guru_id = $1 and topik_id = $2
      order by id asc`,
    [guruId, topikId],
  );
  return rows.map((row) => row.id);
}

export type RingkasBank = {
  topik: number;
  total: number;
  pg: number;
  esai: number;
  dipakai: number;
  kosong: number;
};

/** Headline numbers for the bank header, deliberately unfiltered. */
export async function ringkasBank(guruId: string): Promise<RingkasBank> {
  const { rows } = await pool.query<RingkasBank>(
    `select (select count(*)::int from topik_bank where guru_id = $1) as topik,
            (select count(*)::int from topik_bank t
              where t.guru_id = $1
                and not exists (select 1 from bank_soal b where b.topik_id = t.id)) as kosong,
            (select count(*)::int from bank_soal where guru_id = $1) as total,
            (select count(*)::int from bank_soal where guru_id = $1 and jenis = 'pg') as pg,
            (select count(*)::int from bank_soal where guru_id = $1 and jenis = 'esai') as esai,
            (select count(*)::int
               from soal s
               join kuis q on q.id = s.kuis_id
               join ruang r on r.id = q.ruang_id
              where r.guru_id = $1 and s.bank_soal_id is not null) as dipakai`,
    [guruId],
  );
  const r = rows[0];
  return {
    topik: r?.topik ?? 0,
    total: r?.total ?? 0,
    pg: r?.pg ?? 0,
    esai: r?.esai ?? 0,
    dipakai: r?.dipakai ?? 0,
    kosong: r?.kosong ?? 0,
  };
}

export type PemakaianTopik = {
  ruangId: number;
  kuisId: number;
  kuis: string;
  kelas: string;
  taNama: string;
  /** How many questions of this topic the quiz holds. */
  jumlah: number;
  /** Students who sat that quiz — the denominator behind the topic's usage. */
  peserta: number;
};

/** Every quiz that holds a copy of at least one question in this topic. */
export async function listPemakaianTopik(
  guruId: string,
  topikId: number,
): Promise<PemakaianTopik[]> {
  const { rows } = await pool.query<{
    ruang_id: number;
    kuis_id: number;
    kuis: string;
    kelas: string;
    ta_nama: string;
    jumlah: number;
    peserta: number;
  }>(
    `select r.id as ruang_id, q.id as kuis_id, q.judul as kuis,
            coalesce(k.nama, 'Tanpa kelas') as kelas,
            coalesce(ta.nama, '—') as ta_nama,
            count(*)::int as jumlah,
            (select count(*)::int from percobaan p where p.kuis_id = q.id) as peserta
       from soal s
       join bank_soal b on b.id = s.bank_soal_id
       join kuis q on q.id = s.kuis_id
       join ruang r on r.id = q.ruang_id
       left join kelas k on k.id = r.kelas_id
       left join tahun_ajaran ta on ta.id = r.tahun_ajaran_id
      where b.guru_id = $1 and b.topik_id = $2 and r.guru_id = b.guru_id
      group by r.id, q.id, q.judul, k.nama, ta.nama
      order by k.nama asc, q.judul asc`,
    [guruId, topikId],
  );
  return rows.map((row) => ({
    ruangId: row.ruang_id,
    kuisId: row.kuis_id,
    kuis: row.kuis,
    kelas: row.kelas,
    taNama: row.ta_nama,
    jumlah: row.jumlah,
    peserta: row.peserta,
  }));
}

export type PemakaianBank = {
  soalId: number;
  ruangId: number;
  kuisId: number;
  kuisJudul: string;
  kelasNama: string;
  taNama: string;
  jumlahPercobaan: number;
  /** Students whose submission contains an answer to this question. */
  menjawab: number;
  /** Answers that scored full marks. */
  benar: number;
};

/**
 * One question's reach, per quiz.
 *
 * Correctness is read from the submissions rather than recomputed: the quiz
 * already stores the marks it gave, and a bank screen that disagreed with the
 * grade book would be worse than no screen at all. Essay answers only count as
 * "benar" when the teacher gave them the full weight.
 */
export async function listPemakaianBank(
  guruId: string,
  bankId: number,
): Promise<PemakaianBank[]> {
  const { rows } = await pool.query<{
    soal_id: number;
    ruang_id: number;
    kuis_id: number;
    kuis_judul: string;
    kelas_nama: string;
    ta_nama: string;
    jumlah_percobaan: number;
    menjawab: number;
    benar: number;
  }>(
    `select s.id as soal_id, r.id as ruang_id, q.id as kuis_id,
            q.judul as kuis_judul,
            coalesce(k.nama, 'Tanpa kelas') as kelas_nama,
            coalesce(ta.nama, '—') as ta_nama,
            (select count(*)::int from percobaan p where p.kuis_id = q.id) as jumlah_percobaan,
            (select count(*)::int from percobaan p
              where p.kuis_id = q.id and p.jawaban ? (s.id::text)) as menjawab,
            (select count(*)::int from percobaan p
              where p.kuis_id = q.id
                and ((s.jenis = 'pg' and p.jawaban ->> (s.id::text) = s.jawaban)
                  or (s.jenis = 'esai'
                      and (p.nilai_esai ->> (s.id::text))::int >= s.bobot))) as benar
       from soal s
       join kuis q on q.id = s.kuis_id
       join ruang r on r.id = q.ruang_id
       left join kelas k on k.id = r.kelas_id
       left join tahun_ajaran ta on ta.id = r.tahun_ajaran_id
      where s.bank_soal_id = $2 and r.guru_id = $1
      order by k.nama asc, q.judul asc`,
    [guruId, bankId],
  );
  return rows.map((row) => ({
    soalId: row.soal_id,
    ruangId: row.ruang_id,
    kuisId: row.kuis_id,
    kuisJudul: row.kuis_judul,
    kelasNama: row.kelas_nama,
    taNama: row.ta_nama,
    jumlahPercobaan: row.jumlah_percobaan,
    menjawab: row.menjawab,
    benar: row.benar,
  }));
}

// ---------------------------------------------------------------- mutations

export type SoalBankMasuk = {
  jenis: JenisSoalBank;
  pertanyaan: string;
  pilihan: Record<string, string>;
  jawaban: string | null;
  bobot: number;
};

/** Normalises an incoming question, the single place that decides its shape. */
export function rapikanSoalBank(soal: SoalBankMasuk) {
  const pilihan = soal.jenis === "pg" ? rapikanPilihan(soal.pilihan) : {};
  return {
    jenis: soal.jenis,
    pertanyaan: soal.pertanyaan.trim(),
    pilihan,
    jawaban: soal.jenis === "pg" ? soal.jawaban : null,
    bobot: soal.bobot,
  };
}

/**
 * Appends one question to a topic.
 *
 * The subject and the topic label are read from the topic row rather than sent
 * by the browser: the editor no longer asks which topic this belongs to — it
 * was decided when the topic was opened — so there is nothing for the client
 * to get wrong.
 */
export async function tambahBankSoal(
  guruId: string,
  topikId: number,
  soal: SoalBankMasuk,
): Promise<Hasil & { id?: number }> {
  const { rows: topik } = await pool.query<{ mapel_id: number | null; nama: string }>(
    `select mapel_id, nama from topik_bank where id = $2 and guru_id = $1`,
    [guruId, topikId],
  );
  if (!topik[0]) return { ok: false, error: "Topik tidak ditemukan di bank Anda." };

  const bersih = rapikanSoalBank(soal);
  if (bersih.pertanyaan === "") return { ok: false, error: "Pertanyaan masih kosong." };

  const { rows } = await pool.query<{ id: number }>(
    `insert into bank_soal (guru_id, topik_id, mapel_id, jenis, pertanyaan, pilihan, jawaban, bobot, topik)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
     returning id`,
    [
      guruId,
      topikId,
      topik[0].mapel_id,
      bersih.jenis,
      bersih.pertanyaan,
      JSON.stringify(bersih.pilihan),
      bersih.jawaban,
      bersih.bobot,
      topik[0].nama,
    ],
  );

  // The topic's own timestamp drives "diperbarui" on the list, so touching a
  // question has to touch the topic too.
  await pool.query(`update topik_bank set updated_at = now() where id = $1`, [topikId]);
  return { ok: true, id: rows[0].id };
}

/** Edits a question in place. Moving it to another topic is not supported. */
export async function ubahBankSoal(
  guruId: string,
  bankId: number,
  soal: SoalBankMasuk,
): Promise<Hasil> {
  const bersih = rapikanSoalBank(soal);
  if (bersih.pertanyaan === "") return { ok: false, error: "Pertanyaan masih kosong." };

  const { rows } = await pool.query<{ topik_id: number | null }>(
    `update bank_soal
        set jenis = $3, pertanyaan = $4, pilihan = $5::jsonb, jawaban = $6,
            bobot = $7, updated_at = now()
      where id = $2 and guru_id = $1
      returning topik_id`,
    [
      guruId,
      bankId,
      bersih.jenis,
      bersih.pertanyaan,
      JSON.stringify(bersih.pilihan),
      bersih.jawaban,
      bersih.bobot,
    ],
  );
  if (!rows[0]) return { ok: false, error: "Soal tidak ditemukan di bank Anda." };
  if (rows[0].topik_id) {
    await pool.query(`update topik_bank set updated_at = now() where id = $1`, [
      rows[0].topik_id,
    ]);
  }
  return { ok: true };
}

export async function hapusBankSoal(guruId: string, bankId: number): Promise<Hasil> {
  // `returning` so the action knows which topic to refresh — the question's page
  // cannot tell it once the row is gone.
  const { rows } = await pool.query<{ topik_id: number | null }>(
    `delete from bank_soal where id = $2 and guru_id = $1 returning topik_id`,
    [guruId, bankId],
  );
  if (rows.length === 0) return { ok: false, error: "Soal tidak ditemukan di bank Anda." };
  return { ok: true, topikId: rows[0].topik_id };
}

export type SoalBankImpor = {
  jenis: JenisSoalBank;
  pertanyaan: string;
  pilihan: Record<string, string>;
  jawaban: string | null;
  bobot: number;
};

/**
 * Bulk import into a topic, de-duplicated against what that topic already holds.
 *
 * Re-importing the same file is a common accident, and a topic of doubled
 * questions is worse than a topic of none: the picker fills with pairs you have
 * to tell apart by eye. Identical questions are counted as skipped, not failed.
 */
export async function imporBankSoal(
  guruId: string,
  topikId: number,
  daftar: SoalBankImpor[],
): Promise<Hasil & { jumlah: number; dilewati: number }> {
  if (daftar.length === 0) {
    return {
      ok: false,
      error: "Tidak ada soal yang bisa dibaca dari teks itu.",
      jumlah: 0,
      dilewati: 0,
    };
  }

  const { rows: topik } = await pool.query<{ mapel_id: number | null; nama: string }>(
    `select mapel_id, nama from topik_bank where id = $2 and guru_id = $1`,
    [guruId, topikId],
  );
  if (!topik[0]) return { ok: false, error: "Topik tidak ditemukan.", jumlah: 0, dilewati: 0 };

  const client = await pool.connect();
  let jumlah = 0;
  let dilewati = 0;
  try {
    await client.query("begin");

    for (const item of daftar) {
      const bersih = rapikanSoalBank(item);
      if (bersih.pertanyaan === "") {
        dilewati += 1;
        continue;
      }
      const { rows: ada } = await client.query(
        `select 1 from bank_soal
          where guru_id = $1 and topik_id = $2 and lower(btrim(pertanyaan)) = lower($3)
          limit 1`,
        [guruId, topikId, bersih.pertanyaan],
      );
      if (ada.length > 0) {
        dilewati += 1;
        continue;
      }
      await client.query(
        `insert into bank_soal (guru_id, topik_id, mapel_id, jenis, pertanyaan, pilihan, jawaban, bobot, topik)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
        [
          guruId,
          topikId,
          topik[0].mapel_id,
          bersih.jenis,
          bersih.pertanyaan,
          JSON.stringify(bersih.pilihan),
          bersih.jawaban,
          bersih.bobot,
          topik[0].nama,
        ],
      );
      jumlah += 1;
    }

    await client.query(`update topik_bank set updated_at = now() where id = $1`, [topikId]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  if (jumlah === 0) {
    return {
      ok: false,
      error:
        dilewati > 0
          ? "Semua soal itu sudah ada di topik ini."
          : "Tidak ada soal yang bisa dibaca dari teks itu.",
      jumlah,
      dilewati,
    };
  }
  return { ok: true, jumlah, dilewati };
}
