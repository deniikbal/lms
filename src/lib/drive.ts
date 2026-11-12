import { createSign } from "node:crypto";

/**
 * Google Drive uploads without the `googleapis` dependency.
 *
 * Two ways in, picked by whichever env vars are filled:
 *
 * - `GOOGLE_DRIVE_REFRESH_TOKEN`: acts as a real school account. This is the one
 *   to use — a plain service account has no storage quota of its own and fails
 *   with `storageQuotaExceeded` unless the school owns a Shared Drive.
 * - `GOOGLE_DRIVE_PRIVATE_KEY`: a service account, for Workspace setups that do.
 *
 * Either way the folder must be shared with the account that uploads, and only
 * the returned link is ever stored — no bytes land in Postgres.
 */

// One consent covers both features: submissions go to Drive, meeting links come
// from Calendar and are then opened up through the Meet API. Space-separated,
// which is how the JWT assertion wants them.
const SCOPE = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/meetings.space.settings",
].join(" ");

/** The redirect the consent step must be registered with, exactly. */
export const REDIRECT_URI = "http://localhost:53682/oauth2callback";

export const BATAS_BERKAS = 10 * 1024 * 1024;

/** Photos from a phone camera and PDFs are what school work actually arrives as. */
export const MIME_DIIZINKAN = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export type Kredensial =
  | { jenis: "refresh"; clientId: string; clientSecret: string; refreshToken: string; folderId: string }
  | { jenis: "jwt"; email: string; kunci: string; folderId: string };

export function kredensial(): Kredensial | null {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!folderId) return null;

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();
  if (clientId && clientSecret && refreshToken) {
    return { jenis: "refresh", clientId, clientSecret, refreshToken, folderId };
  }

  // Pasted into a host's env UI the key arrives with literal `\n`, which OpenSSL
  // rejects with an unhelpful "bad base64 decode".
  const kunci = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
  if (!email || !kunci) return null;
  return { jenis: "jwt", email, kunci, folderId };
}

export function driveSiap(): boolean {
  return kredensial() !== null;
}

function b64(isi: string | Buffer): string {
  return Buffer.from(isi).toString("base64url");
}

/**
 * The signed assertion Google's token endpoint wants.
 *
 * Exported so it can be checked against a throwaway key without a network call.
 */
export function buatJwt(email: string, kunci: string, sekarang = Date.now()): string {
  const iat = Math.floor(sekarang / 1000);
  const tanpaTandaTangan = `${b64(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64(
    JSON.stringify({
      iss: email,
      scope: SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    }),
  )}`;
  const tandaTangan = b64(
    createSign("RSA-SHA256").update(tanpaTandaTangan).sign(kunci),
  );
  return `${tanpaTandaTangan}.${tandaTangan}`;
}

/**
 * Access token di-cache selama masa berlakunya: setiap render ruang memanggil
 * Drive, dan menukar refresh token tiap kali hanya menambah satu round-trip.
 */
const tokenTersimpan = new Map<string, { nilai: string; sampai: number }>();

export async function token(k: Kredensial): Promise<string> {
  const kunciCache = k.jenis === "refresh" ? k.refreshToken : k.email;
  const ada = tokenTersimpan.get(kunciCache);
  if (ada && ada.sampai > Date.now()) return ada.nilai;

  const body =
    k.jenis === "refresh"
      ? new URLSearchParams({
          grant_type: "refresh_token",
          client_id: k.clientId,
          client_secret: k.clientSecret,
          refresh_token: k.refreshToken,
        })
      : new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: buatJwt(k.email, k.kunci),
        });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Google menolak kredensial (${res.status}).`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google tidak mengirim access token.");
  tokenTersimpan.set(kunciCache, {
    nilai: data.access_token,
    sampai: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 120) * 1000,
  });
  return data.access_token;
}

/** Looks a folder up without creating anything — links must not make folders. */
async function cariFolder(access: string, induk: string, nama: string): Promise<string | null> {
  const aman = nama.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name = '${aman}' and mimeType = 'application/vnd.google-apps.folder' and '${induk}' in parents and trashed = false`,
  );
  const cari = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`,
    { headers: { authorization: `Bearer ${access}` } },
  );
  if (!cari.ok) throw new Error(`Google Drive gagal mencari folder (${cari.status}).`);
  const { files } = (await cari.json()) as { files?: { id: string }[] };
  return files?.[0]?.id ?? null;
}

/**
 * Finds or creates a folder, one path segment at a time.
 *
 * Drive has no "mkdir -p" and no unique names, so each level is looked up first
 * and only created when missing — otherwise the second student in a class would
 * get a second `XI RPL 1` folder. A name is matched exactly, quotes escaped, in
 * the configured root.
 */
async function folder(access: string, induk: string, nama: string): Promise<string> {
  const ada = await cariFolder(access, induk, nama);
  if (ada) return ada;

  const buat = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      authorization: `Bearer ${access}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: nama,
      mimeType: "application/vnd.google-apps.folder",
      parents: [induk],
    }),
  });
  if (!buat.ok) throw new Error(`Google Drive gagal membuat folder (${buat.status}).`);
  const { id } = (await buat.json()) as { id?: string };
  if (!id) throw new Error("Google Drive tidak mengembalikan id folder.");
  return id;
}

const tautanTersimpan = new Map<string, { url: string | null; sampai: number }>();

/**
 * Deep link to a folder under the root, so "buka Drive" lands the teacher in the
 * class's own cabinet instead of the Drive home page. Missing folders are not
 * created — looking must never write.
 */
export async function tautanFolderDrive(folderPath: string[]): Promise<string | null> {
  const kunciCache = folderPath.join("/");
  const ada = tautanTersimpan.get(kunciCache);
  if (ada && ada.sampai > Date.now()) return ada.url;

  const k = kredensial();
  if (!k) return null;
  let url: string | null = null;
  try {
    const access = await token(k);
    let induk = k.folderId;
    for (const segmen of folderPath) {
      const bersih = segmen.replace(/[\\/:*?"<>|]/g, " ").trim().slice(0, 100);
      if (!bersih) continue;
      const ketemu = await cariFolder(access, induk, bersih);
      if (!ketemu) {
        induk = "";
        break;
      }
      induk = ketemu;
    }
    if (induk) url = `https://drive.google.com/drive/folders/${induk}`;
  } catch {
    url = null;
  }
  // Folder yang belum ada di-cache sebentar saja: begitu guru mengunggah,
  // folder itu lahir dan link harus langsung terlihat.
  tautanTersimpan.set(kunciCache, { url, sampai: Date.now() + (url ? 30 : 2) * 60 * 1000 });
  return url;
}

/**
 * Uploads one file into `<root>/<segmen…>` and returns a viewable link.
 *
 * The path is the school's filing cabinet: class, then task, then the student's
 * own name as the file name — so a teacher can find a submission in Drive
 * without the LMS at all.
 */
export async function unggahKeDrive({
  nama,
  mime,
  data,
  folderPath = [],
}: {
  nama: string;
  mime: string;
  data: Buffer;
  /** Sub-folders under the configured root, created as needed. */
  folderPath?: string[];
}): Promise<{ id: string; url: string }> {
  const k = kredensial();
  if (!k) {
    throw new Error(
      "Google Drive belum dikonfigurasi. Isi GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, dan GOOGLE_DRIVE_FOLDER_ID.",
    );
  }
  const access = await token(k);

  let induk = k.folderId;
  for (const segmen of folderPath) {
    const bersih = segmen.replace(/[\\/:*?"<>|]/g, " ").trim().slice(0, 100);
    if (!bersih) continue;
    induk = await folder(access, induk, bersih);
  }

  const batas = `lms-${Date.now().toString(36)}`;

  // multipart/related: metadata part, then the bytes. Nothing resumable here —
  // a 10MB homework photo fits in one request.
  const body = new Blob([
    `--${batas}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify({ name: nama, parents: [induk] }),
    `\r\n--${batas}\r\ncontent-type: ${mime}\r\n\r\n`,
    new Uint8Array(data),
    `\r\n--${batas}--\r\n`,
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${access}`,
        "content-type": `multipart/related; boundary=${batas}`,
      },
      body,
    },
  );
  if (!res.ok) {
    throw new Error(`Google Drive menolak berkas (${res.status}).`);
  }
  const { id } = (await res.json()) as { id?: string };
  if (!id) throw new Error("Google Drive tidak mengembalikan id berkas.");

  // Files belong to the service account; without this the teacher opening the
  // link gets a 403 and the upload may as well not have happened.
  const izin = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}/permissions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${access}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    },
  );
  if (!izin.ok) {
    // Reported, not thrown: the file exists, and a retry would duplicate it.
    console.error(`Gagal membagikan berkas Drive ${id} (${izin.status}).`);
  }

  return { id, url: `https://drive.google.com/file/d/${id}/view` };
}

/**
 * Deletes a previously uploaded submission, permanently.
 *
 * Trash would leave the file in the account's Drive for 30 days and keep eating
 * quota, which is the exact thing a re-upload should not do.
 */
export async function hapusDariDrive(url: string): Promise<void> {
  const id = url.match(/\/d\/([\w-]+)/)?.[1] ?? url.match(/[?&]id=([\w-]+)/)?.[1];
  if (!id) return; // A hand-pasted link is not ours to delete.

  const k = kredensial();
  if (!k) return;
  const access = await token(k);

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}?deleteDataInTrash=true`,
    { method: "DELETE", headers: { authorization: `Bearer ${access}` } },
  );
  // 404 just means it was already gone from Drive — the LMS row is what matters.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Google Drive gagal menghapus berkas (${res.status}).`);
  }
}
