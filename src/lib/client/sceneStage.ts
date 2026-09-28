// Play logic for the night scenes (components/site/scenes/SceneStage.tsx).
// Kept free of React so it can be unit tested with plain objects.

/** A scene plays once this share of it is in view. */
export const SCENE_THRESHOLD = 0.35;

interface SmilAnimation {
  dataset: { at?: string };
  beginElementAt(offset: number): void;
}

/** The parts of the scene's wrapper element these helpers touch. */
export interface SceneRoot {
  classList: { add(token: string): void };
  querySelectorAll(selector: string): ArrayLike<SmilAnimation> & Iterable<SmilAnimation>;
}

/** Start the CSS build (the play class) and every SMIL animation at its data-at offset. */
export function playScene(root: SceneRoot): void {
  root.classList.add("play");
  for (const anim of root.querySelectorAll("animate, animateMotion")) {
    const at = Number.parseFloat(anim.dataset.at ?? "");
    if (!Number.isFinite(at)) throw new Error(`night scene: animation has no usable data-at ("${anim.dataset.at}")`);
    anim.beginElementAt(at);
  }
}

/** Reduced motion: show the finished picture with no motion. */
export function stillScene(root: SceneRoot): void {
  root.classList.add("still");
}

/** What an IntersectionObserver entry means for a scene. */
interface SceneView {
  isIntersecting: boolean;
  intersectionRatio: number;
}

/**
 * Decide from one observer entry whether to start the scene (the first time
 * enough of it is in view) and whether its breathing should pause (any time
 * it is fully off screen, so infinite animations cost nothing there).
 */
export function sceneVisibility(view: SceneView, played: boolean): { play: boolean; paused: boolean } {
  return {
    play: !played && view.isIntersecting && view.intersectionRatio >= SCENE_THRESHOLD,
    paused: !view.isIntersecting,
  };
}
