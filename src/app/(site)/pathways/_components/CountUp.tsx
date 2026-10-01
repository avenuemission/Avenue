"use client";

import { useEffect, useState } from "react";

// Counts from 0 up to `end` over `duration` ms once mounted. The final number
// is also in the HTML as visually hidden text, so screen readers and
// crawlers read the real figure, not the 0 the animation starts from.
export default function CountUp({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | undefined;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (startTime === undefined) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <>
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{end}</span>
    </>
  );
}
