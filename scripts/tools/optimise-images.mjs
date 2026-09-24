// ============================================================
// Shrink the large photos in public/images, in place.
//
//   node scripts/tools/optimise-images.mjs          (rewrite in place)
//   node scripts/tools/optimise-images.mjs --check  (report only, no writes)
//
// For every JPG or PNG over 200 KB: resize to at most 2400 px wide, then
// re-encode in the SAME format under the SAME filename (some are linked by
// absolute avenuemission.com URLs in emails and metadata, so names never
// change). JPG: quality 80 with mozjpeg. PNG: lossless, compression level 9
// (palette quantisation was tried and dropped: it bands the photos, and the
// pages must look the same). A file is written only when the result is
// smaller. Orientation and colour profile are kept.
//
// Uses sharp, which ships with Next.
// ============================================================
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative } from "node:path";
import sharp from "sharp";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const DIR = join(REPO, "public", "images");
const MIN_BYTES = 200 * 1024;
const MAX_WIDTH = 2400;
const checkOnly = process.argv.includes("--check");

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function encode(image, ext) {
  if (ext === ".png") return image.png({ compressionLevel: 9, adaptiveFiltering: true });
  return image.jpeg({ quality: 80, mozjpeg: true });
}

let before = 0;
let after = 0;
let written = 0;
for await (const path of walk(DIR)) {
  const ext = extname(path).toLowerCase().replace(".jpeg", ".jpg");
  if (ext !== ".png" && ext !== ".jpg") continue;
  const size = (await stat(path)).size;
  if (size <= MIN_BYTES) continue;

  const input = await readFile(path);
  const image = sharp(input).autoOrient().keepIccProfile().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  const output = await encode(image, ext).toBuffer();
  const smaller = output.length < size;
  before += size;
  after += smaller ? output.length : size;
  const name = relative(DIR, path).replaceAll("\\", "/");
  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`${smaller ? "shrink" : "keep  "} ${name}: ${kb(size)} -> ${smaller ? kb(output.length) : "unchanged"}`);
  if (smaller && !checkOnly) {
    await writeFile(path, output);
    written++;
  }
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`\nFiles over 200 KB: ${mb(before)} -> ${mb(after)} (${written} written${checkOnly ? ", check only" : ""})`);
