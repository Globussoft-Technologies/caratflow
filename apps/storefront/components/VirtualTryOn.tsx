"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────

type JewelryCategory = "RING" | "NECKLACE" | "EARRING" | "BANGLE" | "BRACELET" | "PENDANT" | "CHAIN";

interface TryOnConfig {
  productId: string;
  productName: string;
  productImage: string;
  category: JewelryCategory;
  overlayUrl: string | null;
  overlayPositioning: {
    scale: number;
    offsetX: number;
    offsetY: number;
    rotation: number;
  };
}

interface VirtualTryOnProps {
  config: TryOnConfig;
  onClose: () => void;
  onAddToCart?: (productId: string) => void;
  onShare?: (productId: string, via: string) => void;
}

// ─── Overlay Zone Defaults by Category ────────────────────────

const CATEGORY_ZONES: Record<JewelryCategory, {
  label: string;
  guideText: string;
  /** Position as percentage of video frame */
  defaultPosition: { x: number; y: number };
  defaultScale: number;
}> = {
  RING: {
    label: "Ring",
    guideText: "Position your hand in the highlighted area",
    defaultPosition: { x: 50, y: 65 },
    defaultScale: 0.15,
  },
  NECKLACE: {
    label: "Necklace",
    guideText: "Position your neck/chest in the highlighted area",
    defaultPosition: { x: 50, y: 40 },
    defaultScale: 0.4,
  },
  PENDANT: {
    label: "Pendant",
    guideText: "Position your neck/chest in the highlighted area",
    defaultPosition: { x: 50, y: 42 },
    defaultScale: 0.3,
  },
  EARRING: {
    label: "Earring",
    guideText: "Position your face in the center",
    defaultPosition: { x: 50, y: 35 },
    defaultScale: 0.12,
  },
  BANGLE: {
    label: "Bangle",
    guideText: "Position your wrist in the highlighted area",
    defaultPosition: { x: 50, y: 60 },
    defaultScale: 0.2,
  },
  BRACELET: {
    label: "Bracelet",
    guideText: "Position your wrist in the highlighted area",
    defaultPosition: { x: 50, y: 60 },
    defaultScale: 0.2,
  },
  CHAIN: {
    label: "Chain",
    guideText: "Position your neck/chest in the highlighted area",
    defaultPosition: { x: 50, y: 40 },
    defaultScale: 0.35,
  },
};

// ─── Component ────────────────────────────────────────────────

export default function VirtualTryOn({
  config,
  onClose,
  onAddToCart,
  onShare,
}: VirtualTryOnProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [scale, setScale] = useState(config.overlayPositioning.scale || CATEGORY_ZONES[config.category].defaultScale);
  const [overlayPosition, setOverlayPosition] = useState(CATEGORY_ZONES[config.category].defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart] = useState(Date.now());

  const overlayImage = config.overlayUrl ?? config.productImage;
  const zone = CATEGORY_ZONES[config.category];

  // ─── Camera Setup ─────────────────────────────────────────

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraError("Camera access denied. You can still view the product on a model photo.");
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, [facingMode, startCamera, stopCamera]);

  // Track session start
  useEffect(() => {
    const id = `tryon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(id);
  }, []);

  // ─── Flip Camera ──────────────────────────────────────────

  function flipCamera() {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }

  // ─── Overlay Drag ─────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDragOffset({ x: x - overlayPosition.x, y: y - overlayPosition.y });
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOverlayPosition({
      x: Math.max(5, Math.min(95, x - dragOffset.x)),
      y: Math.max(5, Math.min(95, y - dragOffset.y)),
    });
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  // ─── Screenshot ───────────────────────────────────────────

  function captureScreenshot() {
    if (!containerRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Draw video frame
    if (videoRef.current && cameraActive) {
      ctx.drawImage(videoRef.current, 0, 0, rect.width, rect.height);
    } else {
      ctx.fillStyle = "#F0F0EC";
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    // Draw overlay image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const overlayWidth = rect.width * scale;
      const overlayHeight = (overlayWidth / img.width) * img.height;
      const ox = (overlayPosition.x / 100) * rect.width - overlayWidth / 2;
      const oy = (overlayPosition.y / 100) * rect.height - overlayHeight / 2;

      ctx.save();
      const centerX = ox + overlayWidth / 2;
      const centerY = oy + overlayHeight / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((config.overlayPositioning.rotation * Math.PI) / 180);
      ctx.drawImage(img, -overlayWidth / 2, -overlayHeight / 2, overlayWidth, overlayHeight);
      ctx.restore();

      const url = canvas.toDataURL("image/png");
      setScreenshotUrl(url);
    };
    img.src = overlayImage;
  }

  // ─── Share ────────────────────────────────────────────────

  function handleShare(via: string) {
    if (!screenshotUrl) return;

    if (via === "download") {
      const link = document.createElement("a");
      link.download = `tryon-${config.productName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = screenshotUrl;
      link.click();
    } else if (via === "whatsapp") {
      // WhatsApp share -- opens text share (image share needs native share API)
      const text = `Check out how this ${config.productName} looks on me! ${window.location.href}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } else if (via === "native" && navigator.share) {
      fetch(screenshotUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "tryon.png", { type: "image/png" });
          navigator.share({
            title: `Virtual Try-On: ${config.productName}`,
            text: `Check out how this ${config.productName} looks!`,
            files: [file],
          }).catch(() => {
            // Fallback if share fails
          });
        });
    }

    onShare?.(config.productId, via);
    setShowShareMenu(false);
  }

  // ─── Add to Cart ──────────────────────────────────────────

  function handleAddToCart() {
    onAddToCart?.(config.productId);
  }

  // ─── Render Earring Overlay (Left + Right) ────────────────

  function renderOverlay() {
    const baseStyle = {
      width: `${scale * 100}%`,
      transform: `rotate(${config.overlayPositioning.rotation}deg)`,
      filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
    };

    if (config.category === "EARRING") {
      // Render two earrings for left and right ears
      return (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${overlayPosition.x - 15}%`,
              top: `${overlayPosition.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <img
              src={overlayImage}
              alt="Left earring"
              className="max-w-none"
              style={baseStyle}
              draggable={false}
            />
          </div>
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${overlayPosition.x + 15}%`,
              top: `${overlayPosition.y}%`,
              transform: "translate(-50%, -50%) scaleX(-1)",
            }}
          >
            <img
              src={overlayImage}
              alt="Right earring"
              className="max-w-none"
              style={baseStyle}
              draggable={false}
            />
          </div>
        </>
      );
    }

    return (
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${overlayPosition.x}%`,
          top: `${overlayPosition.y}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <img
          src={overlayImage}
          alt={config.productName}
          className="max-w-none"
          style={baseStyle}
          draggable={false}
        />
      </div>
    );
  }

  // ─── Render Guide Zone ────────────────────────────────────

  function renderGuideZone() {
    if (cameraActive) return null;

    const zoneStyles: Record<JewelryCategory, string> = {
      RING: "w-28 h-36 bottom-[20%] left-1/2 -translate-x-1/2 rounded-xl",
      NECKLACE: "w-48 h-32 top-[30%] left-1/2 -translate-x-1/2 rounded-full",
      PENDANT: "w-40 h-28 top-[32%] left-1/2 -translate-x-1/2 rounded-full",
      EARRING: "w-56 h-48 top-[20%] left-1/2 -translate-x-1/2 rounded-full",
      BANGLE: "w-32 h-28 bottom-[25%] left-1/2 -translate-x-1/2 rounded-xl",
      BRACELET: "w-32 h-28 bottom-[25%] left-1/2 -translate-x-1/2 rounded-xl",
      CHAIN: "w-44 h-32 top-[30%] left-1/2 -translate-x-1/2 rounded-full",
    };

    return (
      <div
        className={cn(
          "absolute border-2 border-dashed border-gold/40 bg-gold/5",
          zoneStyles[config.category]
        )}
      >
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gold/60 text-center px-2">
          {zone.guideText}
        </span>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <h2 className="text-white text-sm font-semibold">Virtual Try-On</h2>
            <p className="text-white/50 text-[10px]">{config.productName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Flip camera */}
          {cameraActive && (
            <button
              type="button"
              onClick={flipCamera}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Flip camera"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Camera / Fallback View */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-warm-gray touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Video feed */}
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            facingMode === "user" && "scale-x-[-1]",
            !cameraActive && "hidden"
          )}
          playsInline
          muted
          autoPlay
        />

        {/* Fallback: model photo with product */}
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-warm-gray">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gold/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-gold/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
              <p className="text-navy/50 text-xs mb-1">
                {cameraError ?? "Camera not available"}
              </p>
              <p className="text-navy/30 text-[10px]">
                Drag the jewelry to reposition it
              </p>
            </div>
          </div>
        )}

        {/* Guide zone */}
        {renderGuideZone()}

        {/* Product overlay */}
        {renderOverlay()}

        {/* Screenshot preview */}
        {screenshotUrl && (
          <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center">
            <div className="relative max-w-sm w-full mx-4">
              <img
                src={screenshotUrl}
                alt="Screenshot"
                className="w-full rounded-xl shadow-2xl"
              />
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => handleShare("download")}
                  className="px-4 py-2 bg-white/10 text-white text-xs rounded-lg hover:bg-white/20 transition-colors"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => handleShare("whatsapp")}
                  className="px-4 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                >
                  WhatsApp
                </button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button
                    type="button"
                    onClick={() => handleShare("native")}
                    className="px-4 py-2 bg-white/10 text-white text-xs rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Share
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setScreenshotUrl(null)}
                  className="px-4 py-2 bg-white/10 text-white text-xs rounded-lg hover:bg-white/20 transition-colors"
                >
                  Retake
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/80 backdrop-blur-sm px-4 py-3 space-y-3">
        {/* Size slider */}
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-[10px] w-8">Size</span>
          <input
            type="range"
            min="0.05"
            max="0.8"
            step="0.01"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-gold"
          />
          <span className="text-white/50 text-[10px] w-10 text-right">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Capture */}
          <button
            type="button"
            onClick={captureScreenshot}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-white text-xs font-medium">Capture</span>
          </button>

          {/* Add to Cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gold hover:bg-gold-dark rounded-xl transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span className="text-white text-xs font-semibold">Add to Cart</span>
          </button>
        </div>
      </div>

      {/* Hidden canvas for screenshots */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
