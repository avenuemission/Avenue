import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Lets the server hand the browser a piece of text it wrote (the APEST
// reflection) and later accept it back unchanged, bound to the data it was
// written for, without storing anything. The key is derived from the
// service role key, so no new secret is needed and the browser can never
// make a valid signature itself.
const KEY_LABEL = "avenue-apest-email-v1";

function signingKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("signedText: SUPABASE_SERVICE_ROLE_KEY is not set");
  return createHmac("sha256", secret).update(KEY_LABEL).digest();
}

// Exactly the text plus the bound values, with the keys sorted so the
// object's key order never matters.
function canonical(text: string, bound: Record<string, string | number>): string {
  const entries = Object.keys(bound)
    .sort()
    .map((k) => [k, bound[k]]);
  return JSON.stringify({ text, bound: entries });
}

function mac(text: string, bound: Record<string, string | number>): Buffer {
  return createHmac("sha256", signingKey()).update(canonical(text, bound)).digest();
}

// Hex HMAC-SHA256, 64 characters.
export function signText(text: string, bound: Record<string, string | number>): string {
  return mac(text, bound).toString("hex");
}

export function verifyText(text: string, bound: Record<string, string | number>, signature: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(signature)) return false;
  return timingSafeEqual(mac(text, bound), Buffer.from(signature, "hex"));
}
