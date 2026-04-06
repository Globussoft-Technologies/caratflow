"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────

interface Product360Config {
  imageUrls: string[];
  frameCount: number;
  autoRotate: boolean;
  rotationSpeed: number;
  backgroundColor: string;
  zoomEnabled: boolean;
}

interface ProductView360Props {
  config: Product360Config;
  productName: string;
  fallbackImage?: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────

export default function ProductView360({
  config,
  productName,
  fallbackImage,
  className,
}: ProductView360Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [frameAtDragStart, setFrameAtDragStart] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(config.autoRotate);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const frameCount = config.imageUrls.length;
  const animationRef = useRef<number | null>(null);
  const lastFrameTime = useRef(0);

  // ─── Preload Images ───────────────────────────────────────

  useEffect(() => {
    if (config.imageUrls.length === 0) {
      setLoadFailed(true);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    config.imageUrls.forEach((url, idx) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        if (cancelled) return;
        loaded++;
        images[idx] = img;
        setLoadProgress(Math.round((loaded / config.imageUrls.length) * 100));

        if (loaded === config.imageUrls.length) {
          setLoadedImages(images);
          setIsLoading(false);
        }
      };

      img.onerror = () => {
        if (cancelled) return;
        loaded++;
        // Still count as progress, just skip broken frames
        setLoadProgress(Math.round((loaded / config.imageUrls.length) * 100));

        if (loaded === config.imageUrls.length) {
          const validImages = images.filter(Boolean);
          if (validImages.length === 0) {
            setLoadFailed(true);
          } else {
            setLoadedImages(images);
          }
          setIsLoading(false);
        }
      };

      img.src = url;
    });

    return () => {
      cancelled = true;
    };
  }, [config.imageUrls]);

  // ─── Auto-Rotation ────────────────────────────────────────

  const autoRotate = useCallback(() => {
    if (!isAutoRotating || isDragging || zoomLevel > 1) return;

    const now = performance.now();
    // Frames per ms based on rotation speed (frames per full rotation)
    const msPerFrame = (config.rotationSpeed * 1000) / frameCount / 60;

    if (now - lastFrameTime.current >= msPerFrame) {
      setCurrentFrame((prev) => (prev + 1) % frameCount);
      lastFrameTime.current = now;
    }

    animationRef.current = requestAnimationFrame(autoRotate);
  }, [isAutoRotating, isDragging, zoomLevel, config.rotationSpeed, frameCount]);

  useEffect(() => {
    if (isAutoRotating && !isLoading && !isDragging && zoomLevel <= 1) {
      lastFrameTime.current = performance.now();
      animationRef.current = requestAnimationFrame(autoRotate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAutoRotating, isLoading, isDragging, zoomLevel, autoRotate]);

  // ─── Mouse / Touch Drag ───────────────────────────────────

  function handlePointerDown(e: React.PointerEvent) {
    if (isLoading) return;
    setIsDragging(true);
    setIsAutoRotating(false);
    setDragStartX(e.clientX);
    setFrameAtDragStart(currentFrame);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const deltaX = e.clientX - dragStartX;
    // Sensitivity: full container width = one full rotation
    const frameDelta = Math.round((deltaX / containerWidth) * frameCount);
    let newFrame = (frameAtDragStart + frameDelta) % frameCount;
    if (newFrame < 0) newFrame += frameCount;
    setCurrentFrame(newFrame);
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  // ─── Zoom (scroll / pinch) ────────────────────────────────

  function handleWheel(e: React.WheelEvent) {
    if (!config.zoomEnabled) return;
    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newZoom = Math.max(1, Math.min(4, zoomLevel + delta));
    setZoomLevel(newZoom);

    if (newZoom > 1 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomOrigin({ x, y });
    }

    if (newZoom <= 1) {
      setIsAutoRotating(config.autoRotate);
    } else {
      setIsAutoRotating(false);
    }
  }

  // ─── Fullscreen ───────────────────────────────────────────

  function toggleFullscreen() {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // ─── Render ───────────────────────────────────────────────

  const currentImage = loadedImages[currentFrame];

  // Fallback if 360 not available or all images failed
  if (loadFailed) {
    if (fallbackImage) {
      return (
        <div className={cn("relative aspect-square rounded-xl overflow-hidden bg-warm-gray", className)}>
          <img
            src={fallbackImage}
            alt={productName}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-square rounded-xl overflow-hidden select-none touch-none",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
      style={{ backgroundColor: config.backgroundColor }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Loading Progress */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gold rounded-full transition-all duration-200"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <p className="text-navy/40 text-xs">Loading 360 view... {loadProgress}%</p>
        </div>
      )}

      {/* Current Frame */}
      {!isLoading && currentImage && (
        <img
          src={currentImage.src}
          alt={`${productName} - frame ${currentFrame + 1} of ${frameCount}`}
          className="w-full h-full object-contain transition-none"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
          }}
          draggable={false}
        />
      )}

      {/* Controls Overlay */}
      {!isLoading && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Left: drag hint */}
          <div className="bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 pointer-events-none">
            <svg className="w-3.5 h-3.5 text-navy/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            <span className="text-[10px] text-navy/50">Drag to rotate</span>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Auto-rotate toggle */}
            <button
              type="button"
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                isAutoRotating ? "bg-gold text-white" : "bg-white/80 text-navy/50 hover:bg-white"
              )}
              aria-label={isAutoRotating ? "Pause rotation" : "Start rotation"}
            >
              {isAutoRotating ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              )}
            </button>

            {/* Zoom reset */}
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setIsAutoRotating(config.autoRotate);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-navy/50 hover:bg-white transition-colors"
                aria-label="Reset zoom"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                </svg>
              </button>
            )}

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-navy/50 hover:bg-white transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Frame counter (subtle) */}
      {!isLoading && (
        <div className="absolute top-3 right-3 bg-white/60 backdrop-blur-sm rounded-full px-2 py-0.5">
          <span className="text-[9px] text-navy/40 font-mono">
            {currentFrame + 1}/{frameCount}
          </span>
        </div>
      )}
    </div>
  );
}
