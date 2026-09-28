// How far the desktop photo carousel slides for a given scroll position.
//
// The track moves sideways as its section passes through the window. With
// many photos (Vision pools all three areas) sliding the whole row made it
// race past, so the sideways speed is capped: it never moves more than
// MAX_TRACK_PER_SCROLL pixels for each pixel scrolled. Rows short enough to
// stay under the cap still slide their full length.

export const MAX_TRACK_PER_SCROLL = 1.5;

export interface CarouselGeometry {
  count: number;
  cardWidth: number;
  gap: number;
  viewportWidth: number;
  /** Pixels of page scroll over which the section passes through the window. */
  scrollDistance: number;
  /** 0 when the section enters from the bottom, 1 when it leaves at the top. */
  progress: number;
}

export function carouselOffset({ count, cardWidth, gap, viewportWidth, scrollDistance, progress }: CarouselGeometry): number {
  const p = Math.max(0, Math.min(1, progress));
  const fullTravel = Math.max(0, count * (cardWidth + gap) - viewportWidth);
  const cappedTravel = Math.min(fullTravel, MAX_TRACK_PER_SCROLL * Math.max(0, scrollDistance));
  return p * cappedTravel;
}
