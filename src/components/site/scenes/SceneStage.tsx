"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SCENE_THRESHOLD, playScene, sceneVisibility, stillScene } from "@/lib/client/sceneStage";

interface SceneStageProps {
  children: ReactNode;
  /** "view" (default): play when 35% is in view. "load": play as soon as the page loads. */
  trigger?: "view" | "load";
  /** Extra classes on the .scene wrapper, such as a scene's own timing set. */
  className?: string;
}

/**
 * Wraps one server-rendered night scene. It adds .play once (the CSS build)
 * and starts its SMIL animations: when 35% of it is in view, or on load. It
 * keeps watching afterwards and adds .paused while the scene is off screen,
 * so the endless breathing costs nothing there. With reduced motion it adds
 * .still instead: the finished picture, no motion.
 */
export default function SceneStage({ children, trigger = "view", className }: SceneStageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stillScene(node);
      return;
    }
    let played = false;
    if (trigger === "load") {
      playScene(node);
      played = true;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const view = sceneVisibility(entries[entries.length - 1], played);
        if (view.play) {
          playScene(node);
          played = true;
        }
        node.classList.toggle("paused", view.paused);
      },
      { threshold: [0, SCENE_THRESHOLD] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [trigger]);

  return (
    <div ref={ref} className={className ? `scene ${className}` : "scene"}>
      {children}
    </div>
  );
}
