import { kredensial, token } from "./drive";

/**
 * Google Meet links, created as Calendar events on the school account.
 *
 * A Meet link cannot be minted on its own: Google hands one out only as the
 * `hangoutLink` of a Calendar event. So `+ Pertemuan` creates the event, and the
 * link it returns is what the LMS stores — opening it joins the same meeting the
 * school account sees in its own Calendar.
 *
 * Reuses the Drive credentials: same OAuth client, same refresh token. The token
 * must carry the `calendar.events` scope, which means consent has to be redone
 * once with `scripts/ambil-refresh-token.ts`.
 */

const KALENDER = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const ZONA = "Asia/Jakarta";

export type WaktuMeet = {
  judul: string;
  /** YYYY-MM-DD */
  tanggal: string;
  /** HH:MM Asia/Jakarta */
  mulai: string;
  selesai: string;
};

export type HasilMeet =
  | { ok: true; eventId: string; link: string }
  | { ok: false; error: string };

/** Whether the env vars for Calendar exist — the dialog hides the switch if not. */
export function meetSiap(): boolean {
  return kredensial() !== null;
}

/** `07:00` + 60 → `08:00`, so a meeting without a window still has a length. */
export function tambahJam(jam: string, menit: number): string {
  const [h, m] = jam.split(":").map(Number);
  const total = (h * 60 + m + menit) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function waktu(w: WaktuMeet) {
  return {
    start: { dateTime: `${w.tanggal}T${w.mulai}:00`, timeZone: ZONA },
    end: { dateTime: `${w.tanggal}T${w.selesai}:00`, timeZone: ZONA },
  };
}

async function panggil(
  metode: "POST" | "PATCH" | "GET",
  eventId: string | null,
  isi?: unknown,
): Promise<{ id?: string; hangoutLink?: string }> {
  const k = kredensial();
  if (!k) {
    throw new Error(
      "Google belum dikonfigurasi. Isi GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, dan GOOGLE_DRIVE_REFRESH_TOKEN.",
    );
  }
  const access = await token(k);
  const url = eventId
    ? `${KALENDER}/${encodeURIComponent(eventId)}?conferenceDataVersion=1`
    : `${KALENDER}?conferenceDataVersion=1`;

  const res = await fetch(url, {
    method: metode,
    headers: {
      authorization: `Bearer ${access}`,
      "content-type": "application/json",
    },
    body: isi === undefined ? undefined : JSON.stringify(isi),
  });
  if (!res.ok) {
    // Google's own message is the only thing that distinguishes "scope missing"
    // from "API not enabled" — both arrive as 403, and guessing wrong sends the
    // teacher to redo consent for nothing.
    const teks = await res.text().catch(() => "");
    if (/has not been used in project|it is disabled/i.test(teks)) {
      const proyek = teks.match(/project (\d+)/)?.[1];
      throw new Error(
        `Google Calendar API belum diaktifkan${proyek ? ` di project ${proyek}` : ""}. Buka console.cloud.google.com → APIs & Services → aktifkan “Google Calendar API”, tunggu beberapa menit.`,
      );
    }
    if (/insufficient authentication scopes/i.test(teks)) {
      throw new Error(
        "Akun Google menolak akses Calendar. Ulangi scripts/ambil-refresh-token.ts lalu perbarui GOOGLE_DRIVE_REFRESH_TOKEN.",
      );
    }
    if (res.status === 401) {
      throw new Error(
        "Kredensial Google ditolak. Ulangi scripts/ambil-refresh-token.ts lalu perbarui GOOGLE_DRIVE_REFRESH_TOKEN.",
      );
    }
    throw new Error(`Google Calendar gagal (${res.status}). ${teks.slice(0, 200)}`);
  }
  return res.json() as Promise<{ id?: string; hangoutLink?: string }>;
}

/**
 * Google sometimes answers with the conference still `pending`, so the link is
 * missing from the first response. Two short reads cover it without waiting on a
 * webhook.
 */
async function tautan(eventId: string): Promise<string | null> {
  for (let coba = 0; coba < 3; coba++) {
    const ev = await panggil("GET", eventId);
    if (ev.hangoutLink) return ev.hangoutLink;
    await new Promise((selesai) => setTimeout(selesai, 400));
  }
  return null;
}

/** `https://meet.google.com/abc-defg-hij` → `abc-defg-hij`, the space id. */
export function kodeMeet(link: string): string | null {
  const cocok = link.match(/meet\.google\.com\/(?:lookup\/)?([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return cocok?.[1] ?? null;
}

/**
 * Opens the room to anyone holding the link — no knock, no Google account.
 *
 * Calendar cannot say this: `conferenceData` has no access field, and the default
 * for a personal account is "request to join", which leaves a class of 30
 * waiting for one teacher to admit each of them. The Meet API can, so the link is
 * patched right after the event exists.
 *
 * Best-effort on purpose: a school whose Workspace admin pins the domain policy
 * gets a 400 here, and that must not fail the meeting — the link still works, it
 * just knocks.
 */
export async function bukaAkses(link: string): Promise<void> {
  const kode = kodeMeet(link);
  if (!kode) return;

  try {
    const k = kredensial();
    if (!k) return;
    const access = await token(k);

    // The space is addressed by its internal name, not the meeting code, and the
    // mask names the field (`config.accessType`) — both wrong spellings get
    // rejected without ever touching the config.
    const nama = await fetch(`https://meet.googleapis.com/v2/spaces/${kode}`, {
      headers: { authorization: `Bearer ${access}` },
    });
    if (!nama.ok) {
      console.error(`Meet ${kode} tidak ditemukan (${nama.status}).`);
      return;
    }
    const idRuang = ((await nama.json()) as { name?: string }).name;
    if (!idRuang) return;

    const res = await fetch(
      `https://meet.googleapis.com/v2/${idRuang}?updateMask=${encodeURIComponent("config.accessType")}`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${access}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ config: { accessType: "OPEN" } }),
      },
    );
    if (!res.ok) {
      console.error(
        `Meet ${kode} tidak dibuka untuk umum (${res.status}): ${(await res.text()).slice(0, 200)}`,
      );
    }
  } catch (galat) {
    console.error(`Meet ${kode} tidak dibuka untuk umum: ${(galat as Error).message}`);
  }
}

/** Creates the event (and with it the Meet room). */
export async function buatMeet(w: WaktuMeet): Promise<HasilMeet> {
  try {
    const ev = await panggil("POST", null, {
      summary: w.judul,
      ...waktu(w),
      conferenceData: {
        createRequest: {
          // Any unique string; Google uses it to drop duplicate retries.
          requestId: `lms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    });
    if (!ev.id) return { ok: false, error: "Google Calendar tidak mengembalikan id event." };

    const link = ev.hangoutLink ?? (await tautan(ev.id));
    if (!link) {
      return { ok: false, error: "Google belum menyiapkan tautan Meet. Coba lagi sebentar." };
    }
    await bukaAkses(link);
    return { ok: true, eventId: ev.id, link };
  } catch (galat) {
    return { ok: false, error: (galat as Error).message };
  }
}

/**
 * Moves/renames an existing meeting without making a second room.
 *
 * The conference is left alone on purpose: patching `conferenceData` would
 * replace the room and invalidate the link students already have.
 */
export async function ubahMeet(eventId: string, w: WaktuMeet): Promise<HasilMeet> {
  try {
    const ev = await panggil("PATCH", eventId, { summary: w.judul, ...waktu(w) });
    const link = ev.hangoutLink ?? (await tautan(eventId));
    // Idempotent, and it repairs a room created before access was opened.
    if (link) await bukaAkses(link);
    return { ok: true, eventId, link: link ?? "" };
  } catch (galat) {
    return { ok: false, error: (galat as Error).message };
  }
}

/** Best-effort cleanup; a missing event is not an error. */
export async function hapusMeet(eventId: string): Promise<void> {
  try {
    await panggil("PATCH", eventId, { status: "cancelled" });
  } catch {
    // The link is already gone from the LMS; a stale calendar row can be deleted
    // by hand.
  }
}
