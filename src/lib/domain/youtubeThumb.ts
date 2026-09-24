// Foundations thumbnails as YouTube shows them (round 3 spec 1). Pure.
// maxresdefault is the 1280x720 16:9 image. Not every video has one, so
// fall back to sddefault, then hqdefault (both 4:3 with black bars, which
// object-cover in a 16:9 box crops away). YouTube answers a missing size
// with a 120x90 grey placeholder, so a loaded image that narrow counts as
// missing too.
export const THUMB_ORDER = ["maxresdefault", "sddefault", "hqdefault"] as const;
export type ThumbSize = (typeof THUMB_ORDER)[number];

const PLACEHOLDER_MAX_WIDTH = 120;

export function thumbUrl(youtubeId: string, size: ThumbSize): string {
  return `https://img.youtube.com/vi/${youtubeId}/${size}.jpg`;
}

export function nextThumbSize(size: ThumbSize): ThumbSize | null {
  const i = THUMB_ORDER.indexOf(size);
  return i >= 0 && i < THUMB_ORDER.length - 1 ? THUMB_ORDER[i + 1] : null;
}

export function isPlaceholderThumb(naturalWidth: number): boolean {
  return naturalWidth <= PLACEHOLDER_MAX_WIDTH;
}
