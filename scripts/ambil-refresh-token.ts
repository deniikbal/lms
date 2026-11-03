/**
 * One-time consent: turns the OAuth web client into a refresh token.
 *
 *   pnpm tsx scripts/ambil-refresh-token.ts
 *
 * Add `http://localhost:53682/oauth2callback` to the client's *Authorized
 * redirect URIs* first, then open the printed link with the school's Drive
 * account. The refresh token it prints goes into `.env` and never expires unless
 * revoked.
 */
import { createServer } from "node:http";

import { REDIRECT_URI } from "../src/lib/drive";

// tsx does not read `.env`; Node can, so the script runs with the same file the
// app does instead of needing the vars exported by hand.
try {
  process.loadEnvFile();
} catch {
  // No .env — the check below still says what is missing.
}

const SCOPE = "https://www.googleapis.com/auth/drive";

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    "Isi GOOGLE_DRIVE_CLIENT_ID dan GOOGLE_DRIVE_CLIENT_SECRET di .env dulu.",
  );
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }

  const galat = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (galat || !code) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Google menolak: ${galat ?? "tanpa code"}`);
    server.close();
    process.exit(1);
  }

  const tukar = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const data = (await tukar.json()) as {
    refresh_token?: string;
    error_description?: string;
  };

  res.writeHead(tukar.ok ? 200 : 400, {
    "content-type": "text/plain; charset=utf-8",
  });
  res.end(
    data.refresh_token
      ? "Selesai. Refresh token tercetak di terminal — tutup tab ini."
      : `Gagal: ${data.error_description ?? "tanpa refresh_token"}`,
  );

  if (!data.refresh_token) {
    console.error(data);
    server.close();
    process.exit(1);
  }

  console.log("\nGOOGLE_DRIVE_REFRESH_TOKEN=" + data.refresh_token);
  console.log("\nSalin ke .env, lalu hapus baris ini dari riwayat terminal.\n");
  server.close();
  process.exit(0);
});

server.listen(53682, () => {
  const link = new URL("https://accounts.google.com/o/oauth2/auth");
  link.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  }).toString();

  console.log("Buka tautan ini dengan akun Google pemilik folder Drive:\n");
  console.log(link.toString());
  console.log(`\nMenunggu callback di ${REDIRECT_URI} …`);
});
