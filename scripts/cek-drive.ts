/**
 * Offline check for the Drive assertion: a core PHP-less LMS still has to sign
 * a JWT correctly, and Google's error for a malformed one says nothing useful.
 *
 *   pnpm tsx scripts/cek-drive.ts
 */
import { createVerify, generateKeyPairSync } from "node:crypto";
import assert from "node:assert/strict";

import { buatJwt } from "../src/lib/drive";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const jwt = buatJwt("lms@sekolah.iam.gserviceaccount.com", privateKey);
const [kepala, isi, tandaTangan] = jwt.split(".");
assert.equal(jwt.split(".").length, 3, "JWT harus tiga bagian");

assert.deepEqual(JSON.parse(Buffer.from(kepala, "base64url").toString()), {
  alg: "RS256",
  typ: "JWT",
});

const klaim = JSON.parse(Buffer.from(isi, "base64url").toString());
assert.equal(klaim.iss, "lms@sekolah.iam.gserviceaccount.com");
assert.equal(klaim.aud, "https://oauth2.googleapis.com/token");
assert.equal(klaim.exp - klaim.iat, 3600);

assert.ok(
  createVerify("RSA-SHA256")
    .update(`${kepala}.${isi}`)
    .verify(publicKey, Buffer.from(tandaTangan, "base64url")),
  "tanda tangan JWT harus sah",
);

// A key pasted with literal `\n` (the usual env-UI accident) is repaired.
assert.ok(
  buatJwt("a@b.c", privateKey.replace(/\n/g, "\\n").replace(/\\n/g, "\n")),
);

console.log("OK: JWT Drive sah dan bertanda tangan benar.");
