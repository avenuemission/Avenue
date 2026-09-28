"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SCENE_THRESHOLD, playScene, stillScene } from "@/lib/client/sceneStage";

/**
 * Wraps one server-rendered night scene. When 35% of it is in view it adds
 * .play once (the CSS build) and starts its SMIL animations. With reduced
 * motion it adds .still instead: the finished picture, no motion.
 */
export default function SceneStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stillScene(node);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        playScene(node);
      },
      { threshold: SCENE_THRESHOLD }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="scene">
      {children}
    </div>
  );
}
