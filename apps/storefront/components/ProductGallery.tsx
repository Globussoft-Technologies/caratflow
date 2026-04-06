"use client";

import { useState } from "react";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const selectedImage = sorted[selectedIndex];

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  }

  return (
    <div className="flex gap-4">
      {/* Thumbnails */}
      <div className="flex flex-col gap-2 w-16 lg:w-20 flex-shrink-0">
        {sorted.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setSelectedIndex(idx)}
            className={cn(
              "w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden border-2 transition-all",
              idx === selectedIndex ? "border-gold ring-2 ring-gold/20" : "border-gray-100 hover:border-gold/40"
            )}
          >
            <img
              src={img.url}
              alt={img.alt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Main image */}
      <div
        className="flex-1 aspect-square rounded-xl overflow-hidden bg-warm-gray cursor-crosshair relative"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <img
          src={selectedImage?.url}
          alt={selectedImage?.alt ?? productName}
          className={cn(
            "w-full h-full object-cover transition-transform duration-200",
            isZoomed && "scale-150"
          )}
          style={isZoomed ? { transformOrigin: `${mousePos.x}% ${mousePos.y}%` } : undefined}
        />
        {/* Zoom hint */}
        {!isZoomed && (
          <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1 text-[10px] text-navy/50">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
            </svg>
            Hover to zoom
          </div>
        )}
      </div>
    </div>
  );
}
