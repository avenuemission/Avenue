"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface ImageCarouselProps {
  folder?: string;
}

export default function ImageCarousel({ folder = "pathways_carousel" }: ImageCarouselProps) {
  const [images, setImages] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [manualOffset, setManualOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch images on mount
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`/api/carousel-images?folder=${folder}`);
        const data = await response.json();
        setImages(data.images || []);
      } catch (error) {
        console.error("Error fetching carousel images:", error);
      }
    };
    fetchImages();
  }, [folder]);

  // Calculate scroll progress based on element position in viewport (desktop only)
  useEffect(() => {
    if (isMobile) return;

    const handleScroll = () => {
      if (!containerRef.current || isDragging) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const elementTop = rect.top;
      const elementHeight = rect.height;
      
      const startPoint = windowHeight;
      const endPoint = -elementHeight;
      const totalDistance = startPoint - endPoint;
      const currentPosition = startPoint - elementTop;
      
      const progress = Math.max(0, Math.min(1, currentPosition / totalDistance));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDragging, isMobile]);

  // Manual drag handlers (desktop only)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile || !isDragging) return;
    const diff = e.clientX - startX;
    setManualOffset((prev) => prev + diff);
    setStartX(e.clientX);
  };

  const handleMouseUp = () => {
    if (isMobile) return;
    setIsDragging(false);
  };

  if (images.length === 0) {
    return null;
  }

  // Desktop: Calculate scroll-based offset
  const imageWidth = 300;
  const gap = 16;
  const totalWidth = images.length * (imageWidth + gap);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const maxScroll = Math.max(0, totalWidth - viewportWidth);
  const scrollBasedOffset = scrollProgress * maxScroll;
  const totalOffset = -scrollBasedOffset + manualOffset;

  // Mobile: Duplicate images for seamless infinite scroll
  const mobileImages = isMobile ? [...images, ...images] : images;

  return (
    <section className="bg-black py-12 overflow-hidden" ref={containerRef}>
      {isMobile ? (
        // Mobile: Infinite auto-scroll
        <div className="relative">
          <div
            className="flex gap-4 animate-scroll-infinite"
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
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Desktop: Scroll-linked with manual drag
        <div
          ref={trackRef}
          className={`flex gap-4 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{
            transform: `translateX(${totalOffset}px)`,
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
      )}
    </section>
  );
}
