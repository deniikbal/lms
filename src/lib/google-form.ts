import { pool } from "@/lib/db";
import { kunciTersimpan, nilaiPercobaan, pilihanTersimpan } from "@/lib/ruang-belajar-shared";
import type { SoalRow } from "@/lib/ruang-belajar-shared";

/**
 * Google Form integration, OAuth model.
 *
 * The teacher connects their Google account once (refresh token stored in the
 * `account` table); after that the LMS itself creates the form from a bank
 * topic via the Forms API and pulls responses back. Matching to a student is
 * by the NIS question the form always carries first; the score is computed by
 * the LMS from the stored answer key, the same path an in-app attempt takes.
 *
 * Setup needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env and the Forms
 * API enabled on that Cloud project. Redirect URI:
 *   https://lms.bethari.my.id/api/google/callback
 */

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const URL_APP = process.env.APP_URL ?? "https://lms.bethari.my.id";
const CALLBACK = `${URL_APP}/api/google/callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/forms.responses.readonly",
].join(" ");

const PROVIDER = "google-forms";

/** Whether the server is configured for the Google flow at all. */
export function googleTersedia(): boolean {
  return CLIENT_ID !== "" && CLIENT_SECRET !== "";
}

export function urlConnect(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function statusGoogle(guruId: string): Promise<boolean> {
  if (!googleTersedia()) return false;
  const { rows } = await pool.query(
    `select 1 from account where "userId" = $1 and providerId = $2 and "refreshToken" is not null limit 1`,
    [guruId, PROVIDER],
  );
  return rows.length > 0;
}

type BarisToken = { refresh_token: string | null; access_token: string | null; expires_at: Date | null };

async function bacaAkun(guruId: string): Promise<BarisToken | null> {
  const { rows } = await pool.query<BarisToken>(
    `select "refreshToken" as refresh_token, "accessToken" as access_token,
            "accessTokenExpiresAt" as expires_at
       from account where "userId" = $1 and providerId = $2 limit 1`,
    [guruId, PROVIDER],
  );
  return rows[0] ?? null;
}

const cacheToken = new Map<string, { token: string; kedaluwarsa: number }>();

/** Access token for the teacher's Google account, refreshed when stale. */
export async function tokenGoogle(guruId: string): Promise<string | null> {
  const gudang = cacheToken.get(guruId);
  if (gudang && Date.now() < gudang.kedaluwarsa) return gudang.token;

  const akun = await bacaAkun(guruId);
  if (!akun?.refresh_token) return null;

  const masihHidup = akun.access_token && akun.expires_at && akun.expires_at.getTime() - 60_000 > Date.now();
  if (masihHidup) return akun.access_token!;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: akun.refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;

  const kedaluwarsa = Date.now() + (data.expires_in ?? 3600) * 1000 - 120_000;
  cacheToken.set(guruId, { token: data.access_token, kedaluwarsa });
  await pool.query(
    `update account set "accessToken" = $3, "accessTokenExpiresAt" = $4, "updatedAt" = now()
      where "userId" = $1 and providerId = $2`,
    [guruId, PROVIDER, data.access_token, new Date(kedaluwarsa)],
  );
  return data.access_token;
}

/** Exchanges the consent code for tokens and stores the refresh token. */
export async function simpanKodeOauth(guruId: string, kode: string): Promise<boolean> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: kode,
    grant_type: "authorization_code",
    redirect_uri: CALLBACK,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.refresh_token || !data.access_token) return false;

  const kedaluwarsa = new Date(Date.now() + (data.expires_in ?? 3600) * 1000 - 120_000);
  await pool.query(
    `insert into account (id, "accountId", providerId, "userId", "accessToken", "refreshToken", "accessTokenExpiresAt", "updatedAt")
     values ($1, $1, $2, $3, $4, $5, $6, now())
     on conflict (id) do update
       set "accessToken" = excluded."accessToken",
           "refreshToken" = excluded."refreshToken",
           "accessTokenExpiresAt" = excluded."accessTokenExpiresAt",
           "updatedAt" = now()`,
    [`gf-${guruId}`, PROVIDER, guruId, data.access_token, data.refresh_token, kedaluwarsa],
  );
  cacheToken.delete(guruId);
  return true;
}

// ------------------------------------------------------------------ form API

async function formsApi(token: string, jalur: string, metode: string, isi?: unknown): Promise<unknown> {
  const res = await fetch(`https://forms.googleapis.com/v1/${jalur}`, {
    method: metode,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: isi === undefined ? undefined : JSON.stringify(isi),
  });
  if (!res.ok) throw new Error(`Forms API ${res.status}: ${await res.text()}`);
  return res.json();
}

export type RuangPilihan = {
  id: number;
  kelasNama: string;
  mapelNama: string | null;
};

/** The teacher's rooms, newest subject match first — the dialog's dropdown. */
export async function listRuangUntukForm(guruId: string, mapelId: number | null): Promise<RuangPilihan[]> {
  const { rows } = await pool.query<{
    id: number;
    kelas_nama: string;
    mapel_nama: string | null;
  }>(
    `select r.id, coalesce(k.nama, 'Tanpa kelas') as kelas_nama, m.nama as mapel_nama
       from ruang r
       left join kelas k on k.id = r.kelas_id
       left join mapel m on m.id = r.mapel_id
      where r.guru_id = $1
      order by (r.mapel_id is not distinct from $2) desc, k.nama asc nulls last`,
    [guruId, mapelId],
  );
  return rows.map((row) => ({ id: row.id, kelasNama: row.kelas_nama, mapelNama: row.mapel_nama }));
}

type SoalForm = {
  soalId: number;
  jenis: "pg" | "esai";
  pertanyaan: string;
  opsi: string[];
  /** Option text of the key, null for an essay. */
  kunciTeks: string | null;
  bobot: number;
};

/**
 * Creates the draft quiz, copies the topic's questions, builds the Google Form
 * and links everything back. The form's first question is always NIS.
 */
export async function buatKuisGoogleForm(
  guruId: string,
  topikId: number,
  ruangId: number,
  judul: string,
): Promise<{ ok: true; kuisId: number; formUrl: string } | { ok: false; error: string }> {
  const bersih = judul.trim();
  if (!bersih || bersih.length > 120) {
    return { ok: false, error: "Judul wajib diisi (maks. 120 karakter)." };
  }

  const token = await tokenGoogle(guruId);
  if (!token) return { ok: false, error: "Hubungkan akun Google dulu." };

  const { rows: topik } = await pool.query<{ nama: string }>(
    `select nama from topik_bank where id = $2 and guru_id = $1`,
    [guruId, topikId],
  );
  if (!topik[0]) return { ok: false, error: "Topik tidak ditemukan di bank Anda." };

  const { rows: ruang } = await pool.query(`select 1 from ruang where id = $1 and guru_id = $2`, [
    ruangId,
    guruId,
  ]);
  if (ruang.length === 0) return { ok: false, error: "Ruang tidak ditemukan." };

  const { rows: soalBank } = await pool.query<{
    id: number;
    jenis: string;
    pertanyaan: string;
    pilihan: unknown;
    jawaban: string | null;
    bobot: number;
  }>(
    `select id, jenis, pertanyaan, pilihan, jawaban, bobot
       from bank_soal where guru_id = $1 and topik_id = $2 order by id asc`,
    [guruId, topikId],
  );
  if (soalBank.length === 0) return { ok: false, error: "Topik itu belum punya soal." };

  const soalForm: SoalForm[] = soalBank.map((s) => {
    const pilihan = s.jenis === "pg" ? pilihanTersimpan(s.pilihan) : {};
    const kunci = s.jenis === "pg" ? kunciTersimpan(pilihan, s.jawaban) : null;
    return {
      soalId: s.id,
      jenis: s.jenis === "pg" ? "pg" : "esai",
      pertanyaan: s.pertanyaan,
      opsi: Object.keys(pilihan).sort().map((huruf) => pilihan[huruf]),
      kunciTeks: kunci ? pilihan[kunci] ?? null : null,
      bobot: s.bobot,
    };
  });

  // 1. Create the empty form, 2. turn on quiz mode, 3. add the items.
  const form = (await formsApi(token, "forms", "POST", {
    info: { title: bersih, documentTitle: bersih },
  })) as { formId?: string; responderUri?: string };
  if (!form.formId) return { ok: false, error: "Google menolak pembuatan form." };

  try {
    await formsApi(token, `forms/${form.formId}`, "PATCH", {
      settings: { quizSettings: { isQuiz: true } },
      updateMask: "settings.quizSettings.isQuiz",
    });

    const permintaan: unknown[] = [
      {
        createItem: {
          item: {
            title: "NIS",
            description: "Isi Nomor Induk Siswa Anda",
            textItem: {},
            required: true,
          },
          location: { index: 0 },
        },
      },
    ];
    soalForm.forEach((s, i) => {
      const question = s.jenis === "pg"
        ? {
            choiceQuestion: { type: "RADIO", options: s.opsi.map((value) => ({ value })), shuffle: false },
            grading: {
              pointValue: s.bobot,
              correctAnswers: { answers: [{ value: s.kunciTeks }] },
            },
          }
        : {
            textQuestion: { paragraph: true },
            grading: { pointValue: s.bobot },
          };
      permintaan.push({
        createItem: {
          item: {
            title: s.pertanyaan,
            questionItem: { question, required: true },
          },
          location: { index: i + 1 },
        },
      });
    });

    const hasil = (await formsApi(token, `forms/${form.formId}:batchUpdate`, "POST", {
      requests: permintaan,
    })) as { replies?: { createItem?: { itemId?: string } }[] };

    // The NIS item is reply 0; the questions follow in the order sent.
    const idItemNis = hasil.replies?.[0]?.createItem?.itemId ?? null;
    const petaSoal: Record<string, number> = {};
    soalForm.forEach((s, i) => {
      const itemId = hasil.replies?.[i + 1]?.createItem?.itemId;
      if (itemId) petaSoal[itemId] = s.soalId;
    });

    // 4. The quiz row, with the topic's questions copied into it.
    const client = await pool.connect();
    let kuisId = 0;
    try {
      await client.query("begin");
      const { rows } = await client.query<{ id: number }>(
        `insert into kuis (ruang_id, judul, form_id, form_url, form_items)
         values ($1, $2, $3, $4, $5::jsonb) returning id`,
        [
          ruangId,
          bersih,
          form.formId,
          form.responderUri ?? null,
          JSON.stringify({ nis: idItemNis, soal: petaSoal }),
        ],
      );
      kuisId = rows[0].id;

      for (let urutan = 0; urutan < soalBank.length; urutan += 1) {
        const s = soalBank[urutan];
        const pilihan = s.jenis === "pg" ? pilihanTersimpan(s.pilihan) : {};
        await client.query(
          `insert into soal (kuis_id, pertanyaan, pilihan, jawaban, bobot, urutan, jenis, bank_soal_id)
           values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)`,
          [
            kuisId,
            s.pertanyaan,
            JSON.stringify(pilihan),
            s.jenis === "pg" ? kunciTersimpan(pilihan, s.jawaban) : null,
            s.bobot,
            urutan + 1,
            s.jenis,
            s.id,
          ],
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    return {
      ok: true,
      kuisId,
      formUrl: form.responderUri ?? `https://docs.google.com/forms/d/${form.formId}/edit`,
    };
  } catch (error) {
    // The empty form exists but the LMS never linked it — delete it so the
    // teacher's Drive is not littered with orphans, then surface the error.
    await fetch(`https://forms.googleapis.com/v1/forms/${form.formId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
    throw error;
  }
}

export type HasilSinkron =
  | { ok: true; baru: number; diperbarui: number; tanpaNis: number }
  | { ok: false; perluHubung?: boolean; error: string };

/** Upserts one attempt, preserving essay scores already given. */
async function catatPercobaan(
  kuisId: number,
  soal: { id: number; jenis: string; jawaban: string | null; bobot: number }[],
  nis: string,
  kelasId: number | null,
  jawaban: Record<string, string>,
): Promise<"baru" | "diperbarui" | "nis"> {
  const { rows: siswa } = await pool.query<{ id: string; name: string }>(
    `select id, name from "user"
      where role = 'siswa' and aktif and username = $1
        and ($2::int is null or kelas_id = $2)
      limit 1`,
    [nis, kelasId],
  );
  if (!siswa[0]) return "nis";

  const nilai = nilaiPercobaan(
    soal.map((s) => ({ id: s.id, jenis: s.jenis as SoalRow["jenis"], bobot: s.bobot, jawaban: s.jawaban })),
    jawaban,
    {},
  );

  const { rows: ada } = await pool.query(`select 1 from percobaan where kuis_id = $1 and siswa_id = $2`, [
    kuisId,
    siswa[0].id,
  ]);

  await pool.query(
    `insert into percobaan (kuis_id, siswa_id, mulai, selesai, nilai, jawaban, nilai_esai)
     values ($1, $2, now(), now(), $3, $4::jsonb, '{}'::jsonb)
     on conflict (kuis_id, siswa_id) do update
       set selesai = now(), nilai = excluded.nilai, jawaban = excluded.jawaban,
           -- An edited response must not wipe essay scores already given.
           nilai_esai = percobaan.nilai_esai`,
    [kuisId, siswa[0].id, nilai, JSON.stringify(jawaban)],
  );
  return ada.length > 0 ? "diperbarui" : "baru";
}

/**
 * Pulls every form response into `percobaan`.
 *
 * Idempotent: responses already recorded are simply upserted again, so calling
 * this on every page load is safe. The form may also hand back Google's own
 * quiz score, but the LMS deliberately recomputes from its own answer key.
 */
export async function sinkronJawabanForm(kuisId: number): Promise<HasilSinkron> {
  const { rows: kuis } = await pool.query<{
    form_id: string | null;
    form_items: unknown;
    kelas_id: number | null;
    guru_id: string;
  }>(
    `select q.form_id, q.form_items, r.kelas_id, r.guru_id
       from kuis q join ruang r on r.id = q.ruang_id
      where q.id = $1`,
    [kuisId],
  );
  const baris = kuis[0];
  if (!baris?.form_id) return { ok: false, error: "Kuis ini tidak tertaut Google Form." };

  const token = await tokenGoogle(baris.guru_id);
  if (!token) return { ok: false, perluHubung: true, error: "Akun Google guru belum terhubung." };

  const peta = baris.form_items as { nis?: string; soal?: Record<string, number> } | null;
  if (!peta?.nis || !peta.soal) return { ok: false, error: "Pemetaan soal form tidak lengkap." };

  const { rows: soal } = await pool.query<{
    id: number;
    jenis: string;
    pilihan: unknown;
    jawaban: string | null;
    bobot: number;
  }>(`select id, jenis, pilihan, jawaban, bobot from soal where kuis_id = $1 order by urutan asc, id asc`, [
    kuisId,
  ]);
  // Option text → letter, so a form answer ("Laju reaksi") scores like "A".
  const teksKeHuruf = new Map<number, Map<string, string>>();
  for (const s of soal) {
    if (s.jenis !== "pg") continue;
    const pilihan = pilihanTersimpan(s.pilihan);
    const balik = new Map<string, string>();
    for (const [huruf, teks] of Object.entries(pilihan)) balik.set(teks, huruf);
    teksKeHuruf.set(s.id, balik);
  }

  const data = (await formsApi(
    token,
    `forms/${baris.form_id}/responses?pageSize=500`,
    "GET",
  )) as {
    responses?: {
      answers?: Record<string, { answers?: { value?: string }[] }>;
    }[];
  };

  let baru = 0;
  let diperbarui = 0;
  let tanpaNis = 0;

  for (const respons of data.responses ?? []) {
    const jawabanApi = respons.answers ?? {};
    const nis = (jawabanApi[peta.nis]?.answers?.[0]?.value ?? "").trim();
    if (!nis) {
      tanpaNis += 1;
      continue;
    }

    const jawaban: Record<string, string> = {};
    for (const [itemId, isi] of Object.entries(jawabanApi)) {
      const soalId = peta.soal[itemId];
      if (!soalId) continue;
      const teks = isi.answers?.[0]?.value;
      if (!teks) continue;
      const huruf = teksKeHuruf.get(soalId)?.get(teks);
      jawaban[String(soalId)] = huruf ?? teks.slice(0, 5000);
    }

    const hasil = await catatPercobaan(kuisId, soal, nis.slice(0, 32), baris.kelas_id, jawaban);
    if (hasil === "baru") baru += 1;
    else if (hasil === "diperbarui") diperbarui += 1;
    else tanpaNis += 1;
  }

  return { ok: true, baru, diperbarui, tanpaNis };
}
