"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface ImageCarouselProps {
  /** Public image paths, read on the server (getCarouselImages). */
  images: string[];
}

const DESKTOP_MIN_WIDTH = 768; // Tailwind md

// Mobile: an endless auto-scroll. Desktop: scroll-linked, with drag. Both
// tracks are in the server HTML and CSS shows one, so the section has its
// full height from the first paint (no layout shift when it hydrates).
export default function ImageCarousel({ images }: ImageCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [manualOffset, setManualOffset] = useState(0);

  // Desktop only: move the track with the element's position in the viewport.
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || isDragging || window.innerWidth < DESKTOP_MIN_WIDTH) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const startPoint = windowHeight;
      const endPoint = -rect.height;
      const totalDistance = startPoint - endPoint;
      const currentPosition = startPoint - rect.top;
      const progress = Math.max(0, Math.min(1, currentPosition / totalDistance));

      const imageWidth = 300;
      const gap = 16;
      const totalWidth = images.length * (imageWidth + gap);
      const maxScroll = Math.max(0, totalWidth - window.innerWidth);
      setScrollOffset(progress * maxScroll);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDragging, images.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    setManualOffset((prev) => prev + diff);
    setStartX(e.clientX);
  };

  const handleMouseUp = () => setIsDragging(false);

  // Mobile: images twice over for a seamless loop.
  const mobileImages = [...images, ...images];

  return (
    <section className="bg-black py-12 overflow-hidden" ref={containerRef}>
      {/* Mobile: infinite auto-scroll */}
      <div className="relative md:hidden">
        <div
          className="flex gap-4 animate-scroll-infinite min-h-[180px]"
          style={{
            width: `${mobileImages.length * (240 + 16)}px`,
            // Duration scales with image count so scroll SPEED (px/s) is
            // identical on every page, regardless of how many images.
            animationDuration: `${images.length * 3.5}s`,
          }}
        >
          {mobileImages.map((src, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[240px] h-[180px] relative rounded-xl overflow-hidden"
            >
              <Image
                src={src}
                alt={`Community ${(index % images.length) + 1}`}
                fill
                className="object-cover"
                sizes="240px"
                // The first card is fully in view at load and is the LCP
                // element on mobile, so it loads first instead of competing
                // with the lazy cards behind it.
                preload={index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: scroll-linked with manual drag */}
      <div
        className={`hidden md:flex gap-4 min-h-[220px] ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          transform: `translateX(${-scrollOffset + manualOffset}px)`,
          transition: isDragging ? "none" : "transform 0.1s ease-out",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {images.map((src, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[300px] h-[220px] relative rounded-xl overflow-hidden"
          >
            <Image
              src={src}
              alt={`Community ${index + 1}`}
              fill
              className="object-cover pointer-events-none"
              sizes="300px"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
