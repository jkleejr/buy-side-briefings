// Stamp a verdict JSON with the moment it was finished.
//
//   node scripts/stamp-verdict.mjs data/verdicts/markets-2026-09-02-morning.json
//
// The routines run this as the last step before committing, so generated_at is
// written by the clock rather than typed by the model. Before this existed the
// model estimated the field: on 2026-09-01 a run that finished at 12:39Z was
// stamped 12:45:00Z, and the night run that finished at 00:14Z was stamped
// 00:35:00Z. The homepage eyebrow and the report page's "generated" line both
// print this field, so it has to be the real time.
//
// Rewrites only the one field, in place, so the file's formatting is left as
// the routine wrote it.
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/stamp-verdict.mjs <verdict.json>");
  process.exit(1);
}

const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const src = readFileSync(file, "utf8");
JSON.parse(src); // fail loudly on a broken file rather than stamping it

const re = /"generated_at"\s*:\s*"[^"]*"/;
if (!re.test(src)) {
  console.error(`${file}: no generated_at field to stamp`);
  process.exit(1);
}
writeFileSync(file, src.replace(re, `"generated_at": "${now}"`));
console.log(`${file}: generated_at = ${now}`);
