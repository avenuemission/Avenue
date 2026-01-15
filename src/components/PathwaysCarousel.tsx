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

  // Calculate scroll progress based on element position in viewport
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || isDragging) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate how far through the viewport the element has scrolled
      // 0 = element just entered bottom of viewport
      // 1 = element has left top of viewport
      const elementTop = rect.top;
      const elementHeight = rect.height;
      
      // Start animating when element enters viewport, finish when it leaves
      const startPoint = windowHeight;
      const endPoint = -elementHeight;
      const totalDistance = startPoint - endPoint;
      const currentPosition = startPoint - elementTop;
      
      const progress = Math.max(0, Math.min(1, currentPosition / totalDistance));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDragging]);

  // Manual drag handlers
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    setManualOffset((prev) => prev + diff);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (images.length === 0) {
    return null;
  }

  // Calculate the total width needed for scrolling
  // Each image is ~300px wide with gap, we want to scroll through all images
  const imageWidth = 300;
  const gap = 16;
  const totalWidth = images.length * (imageWidth + gap);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const maxScroll = Math.max(0, totalWidth - viewportWidth);
  
  // Combine scroll-based movement with manual offset
  const scrollBasedOffset = scrollProgress * maxScroll;
  const totalOffset = -scrollBasedOffset + manualOffset;

  return (
    <section className="bg-black py-12 overflow-hidden" ref={containerRef}>
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images.map((src, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[280px] md:w-[300px] h-[200px] md:h-[220px] relative rounded-xl overflow-hidden"
          >
            <Image
              src={src}
              alt={`Pathways community ${index + 1}`}
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
