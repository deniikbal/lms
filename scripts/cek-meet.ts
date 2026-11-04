/**
 * Offline check for the Meet slot maths: `tambahJam("23:30", 60)` wrapping to
 * `00:30` is the kind of off-by-one that only shows up in a 23:00 meeting.
 *
 *   pnpm tsx scripts/cek-meet.ts
 */
import assert from "node:assert/strict";

import { kodeMeet, tambahJam } from "../src/lib/meet";

assert.equal(tambahJam("07:00", 60), "08:00");
assert.equal(tambahJam("07:45", 60), "08:45");
assert.equal(tambahJam("23:30", 60), "00:30");
assert.equal(tambahJam("00:10", 120), "02:10");

// Only the canonical room link has a space id; a hand-pasted Meet home page does not.
assert.equal(
  kodeMeet("https://meet.google.com/abc-defg-hij?authuser=0"),
  "abc-defg-hij",
);
// A nickname link has no room code we can patch — left as the teacher typed it.
assert.equal(kodeMeet("https://meet.google.com/lookup/lms123"), null);
assert.equal(kodeMeet("https://meet.google.com/"), null);
assert.equal(kodeMeet("https://drive.google.com/file/d/x/view"), null);

console.log("OK: tambahJam membungkus tengah malam dengan benar.");
