// ============================================================
// The Avenue On-Ramp QR code, for slides and the /onramp/admin page.
//
//   node scripts/tools/onramp-qr.mjs
//
// Writes public/images/onramp-qr.png (1200 x 1200) and
// public/images/onramp-qr.svg, both pointing at https://avenuemission.com/onramp.
// Error correction H (about 30% of the code can be covered or blurred and
// it still scans) and a 4-module white quiet zone, so it reads from the
// back of a room off a projector. Black on white for the best contrast.
// Re-run only if the address changes: printed slides use these files.
// ============================================================
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const URL = "https://avenuemission.com/onramp";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "images");
const options = { errorCorrectionLevel: "H", margin: 4, color: { dark: "#000000", light: "#ffffff" } };

await QRCode.toFile(join(OUT, "onramp-qr.png"), URL, { ...options, type: "png", width: 1200 });
writeFileSync(join(OUT, "onramp-qr.svg"), await QRCode.toString(URL, { ...options, type: "svg" }));
console.log(`Wrote onramp-qr.png and onramp-qr.svg for ${URL}`);
