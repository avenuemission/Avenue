// Link and image checks for values an admin or leader stores and other
// people's browsers later render (href, img src). Pure: no fetches.

// A link that is safe to render as an href: it parses as an absolute URL,
// uses https (so never javascript:, data: or plain http), and carries no
// user name or password.
export function isSafeHttpsUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:" && url.hostname !== "" && url.username === "" && url.password === "";
}

const AVATAR_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export const MAX_AVATAR_CHARS = 400_000; // ~300KB of base64

// A profile photo: only an inline png, jpeg or webp data URL of at most
// MAX_AVATAR_CHARS. An external link, even https, is refused because it
// would load from someone else's server for every leader who views it.
export function isSafeAvatar(value: string): boolean {
  return value.length <= MAX_AVATAR_CHARS && AVATAR_DATA_URL.test(value);
}
