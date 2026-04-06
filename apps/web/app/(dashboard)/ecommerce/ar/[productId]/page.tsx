'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import {
  Upload,
  Trash2,
  Eye,
  RotateCcw,
  Camera,
  Image as ImageIcon,
  Save,
  X,
  Plus,
  GripVertical,
} from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────
// In production: fetched via tRPC ar.getAssetsForProduct and ar.get360Config

const mockProduct = {
  id: '1',
  name: '22K Gold Solitaire Ring',
  sku: 'GR-22K-001',
  image: 'https://placehold.co/200x200/FFF8E7/B8903F?text=Ring',
  category: 'RING',
};

const mockOverlayAsset = {
  id: 'asset-1',
  fileUrl: 'https://placehold.co/400x400/FFF8E7/B8903F?text=Ring+Overlay',
  thumbnailUrl: 'https://placehold.co/100x100/FFF8E7/B8903F?text=Overlay',
  format: 'PNG_SEQUENCE',
  fileSizeBytes: 245760,
  category: 'RING',
  processingStatus: 'READY',
  metadata: { scale: 0.15, offsetX: 0, offsetY: 0, rotation: 0 },
};

const mock360Config = {
  imageUrls: Array.from({ length: 36 }, (_, i) =>
    `https://placehold.co/600x600/FFF8E7/B8903F?text=Frame+${i + 1}`,
  ),
  frameCount: 36,
  autoRotate: true,
  rotationSpeed: 30,
  backgroundColor: '#FFFFFF',
  zoomEnabled: true,
};

// ─── Page Component ───────────────────────────────────────────

export default function ProductArConfigPage() {
  const params = useParams();
  const productId = params.productId as string;

  // Overlay state
  const [overlayUrl, setOverlayUrl] = useState(mockOverlayAsset.fileUrl);
  const [overlayScale, setOverlayScale] = useState(mockOverlayAsset.metadata.scale);
  const [overlayOffsetX, setOverlayOffsetX] = useState(mockOverlayAsset.metadata.offsetX);
  const [overlayOffsetY, setOverlayOffsetY] = useState(mockOverlayAsset.metadata.offsetY);
  const [overlayRotation, setOverlayRotation] = useState(mockOverlayAsset.metadata.rotation);

  // 360 state
  const [spin360Urls, setSpin360Urls] = useState<string[]>(mock360Config.imageUrls);
  const [autoRotate, setAutoRotate] = useState(mock360Config.autoRotate);
  const [rotationSpeed, setRotationSpeed] = useState(mock360Config.rotationSpeed);
  const [backgroundColor, setBackgroundColor] = useState(mock360Config.backgroundColor);
  const [zoomEnabled, setZoomEnabled] = useState(mock360Config.zoomEnabled);

  // 360 preview
  const [previewFrame, setPreviewFrame] = useState(0);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overlay' | '360'>('overlay');

  function handleSaveOverlay() {
    // In production: call tRPC ar.updateAsset
    alert('Overlay settings saved');
  }

  function handleSave360() {
    // In production: call tRPC ar.update360Config
    alert('360 configuration saved');
  }

  function handleDeleteOverlay() {
    // In production: call tRPC ar.deleteAsset
    if (confirm('Delete the AR overlay for this product?')) {
      setOverlayUrl('');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`AR Config: ${mockProduct.name}`}
        description={`Manage AR try-on overlay and 360-degree view for ${mockProduct.sku}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'AR & Try-On', href: '/ecommerce/ar' },
          { label: mockProduct.name },
        ]}
      />

      {/* Product header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-warm-gray flex-shrink-0">
          <img src={mockProduct.image} alt={mockProduct.name} className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-navy">{mockProduct.name}</h2>
          <p className="text-[10px] text-navy/40">{mockProduct.sku} &middot; {mockProduct.category}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setActiveTab('overlay')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'overlay'
              ? 'bg-white text-navy shadow-sm'
              : 'text-navy/50 hover:text-navy'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          AR Try-On Overlay
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('360')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-xs font-medium transition-colors ${
            activeTab === '360'
              ? 'bg-white text-navy shadow-sm'
              : 'text-navy/50 hover:text-navy'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          360 Spin View
        </button>
      </div>

      {/* ─── AR Overlay Tab ──────────────────────────────────── */}
      {activeTab === 'overlay' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload / Preview */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy">Overlay Image</h3>
              {overlayUrl && (
                <button
                  type="button"
                  onClick={handleDeleteOverlay}
                  className="text-red-500 hover:text-red-600 transition-colors"
                  title="Delete overlay"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-5">
              {overlayUrl ? (
                <div className="aspect-square bg-warm-gray rounded-xl overflow-hidden flex items-center justify-center relative">
                  <img
                    src={overlayUrl}
                    alt="AR overlay"
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${overlayScale * 5}) translate(${overlayOffsetX}px, ${overlayOffsetY}px) rotate(${overlayRotation}deg)`,
                    }}
                  />
                  <div className="absolute bottom-2 right-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    READY
                  </div>
                </div>
              ) : (
                <label className="aspect-square bg-warm-gray rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-gold/40 transition-colors">
                  <Upload className="w-8 h-8 text-navy/20 mb-2" />
                  <span className="text-xs text-navy/40">Click to upload overlay image</span>
                  <span className="text-[10px] text-navy/30 mt-1">PNG with transparency recommended</span>
                  <input type="file" className="hidden" accept="image/*" />
                </label>
              )}
            </div>
          </div>

          {/* Position / Scale Settings */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-navy">Try-On Position & Scale</h3>
              <p className="text-[10px] text-navy/40 mt-0.5">
                Adjust how the overlay appears on the camera feed
              </p>
            </div>

            <div className="p-5 space-y-5">
              {/* Scale */}
              <div>
                <label className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-navy">Scale</span>
                  <span className="text-xs text-navy/40">{(overlayScale * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.01"
                  value={overlayScale}
                  onChange={(e) => setOverlayScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold"
                />
              </div>

              {/* Offset X */}
              <div>
                <label className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-navy">Horizontal Offset</span>
                  <span className="text-xs text-navy/40">{overlayOffsetX}px</span>
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={overlayOffsetX}
                  onChange={(e) => setOverlayOffsetX(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold"
                />
              </div>

              {/* Offset Y */}
              <div>
                <label className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-navy">Vertical Offset</span>
                  <span className="text-xs text-navy/40">{overlayOffsetY}px</span>
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={overlayOffsetY}
                  onChange={(e) => setOverlayOffsetY(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold"
                />
              </div>

              {/* Rotation */}
              <div>
                <label className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-navy">Rotation</span>
                  <span className="text-xs text-navy/40">{overlayRotation}&deg;</span>
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={overlayRotation}
                  onChange={(e) => setOverlayRotation(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold"
                />
              </div>

              {/* Category display */}
              <div>
                <label className="text-xs font-medium text-navy block mb-1.5">Category</label>
                <div className="px-3 py-2 bg-warm-gray rounded-lg text-xs text-navy">
                  {mockProduct.category}
                  <span className="text-navy/40 ml-2">
                    (determines placement zone on camera)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveOverlay}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold text-white text-xs font-semibold rounded-lg hover:bg-gold/90 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Overlay Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 360 View Tab ────────────────────────────────────── */}
      {activeTab === '360' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 360 Preview */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-navy">360 Preview</h3>
              <p className="text-[10px] text-navy/40 mt-0.5">
                {spin360Urls.length} frames loaded
              </p>
            </div>

            <div className="p-5">
              <div
                className="aspect-square rounded-xl overflow-hidden mb-3 flex items-center justify-center"
                style={{ backgroundColor }}
              >
                {spin360Urls.length > 0 ? (
                  <img
                    src={spin360Urls[previewFrame]}
                    alt={`Frame ${previewFrame + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-navy/10 mx-auto mb-2" />
                    <p className="text-xs text-navy/30">No frames uploaded</p>
                  </div>
                )}
              </div>

              {spin360Urls.length > 0 && (
                <div>
                  <input
                    type="range"
                    min="0"
                    max={spin360Urls.length - 1}
                    step="1"
                    value={previewFrame}
                    onChange={(e) => setPreviewFrame(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-navy/40">Frame 1</span>
                    <span className="text-[10px] text-navy/60 font-medium">
                      {previewFrame + 1} / {spin360Urls.length}
                    </span>
                    <span className="text-[10px] text-navy/40">Frame {spin360Urls.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 360 Configuration */}
          <div className="space-y-6">
            {/* Upload frames */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-navy">Upload 360 Frames</h3>
                <p className="text-[10px] text-navy/40 mt-0.5">
                  Upload images in rotation order (e.g., 36 images at 10 degree intervals)
                </p>
              </div>

              <div className="p-5">
                <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gold/40 transition-colors">
                  <Plus className="w-6 h-6 text-navy/20 mb-1.5" />
                  <span className="text-xs text-navy/40">Click to upload frame images</span>
                  <span className="text-[10px] text-navy/30 mt-0.5">
                    Select multiple images in rotation order
                  </span>
                  <input type="file" className="hidden" accept="image/*" multiple />
                </label>

                {/* Thumbnail strip */}
                {spin360Urls.length > 0 && (
                  <div className="mt-3 flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                    {spin360Urls.slice(0, 12).map((url, idx) => (
                      <div
                        key={idx}
                        className={`w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border-2 cursor-pointer transition-colors ${
                          idx === previewFrame ? 'border-gold' : 'border-transparent'
                        }`}
                        onClick={() => setPreviewFrame(idx)}
                      >
                        <img src={url} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {spin360Urls.length > 12 && (
                      <div className="w-12 h-12 rounded-md bg-warm-gray flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] text-navy/40">+{spin360Urls.length - 12}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-navy">360 Settings</h3>
              </div>

              <div className="p-5 space-y-4">
                {/* Auto rotate */}
                <label className="flex items-center justify-between">
                  <span className="text-xs font-medium text-navy">Auto Rotate</span>
                  <button
                    type="button"
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      autoRotate ? 'bg-gold' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        autoRotate ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>

                {/* Rotation speed */}
                <div>
                  <label className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-navy">Rotation Speed</span>
                    <span className="text-xs text-navy/40">{rotationSpeed} FPR</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="1"
                    value={rotationSpeed}
                    onChange={(e) => setRotationSpeed(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold"
                  />
                  <p className="text-[9px] text-navy/30 mt-0.5">
                    Frames per rotation (higher = slower spin)
                  </p>
                </div>

                {/* Background color */}
                <div>
                  <label className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-navy">Background Color</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-6 h-6 rounded border border-gray-200 cursor-pointer"
                      />
                      <span className="text-[10px] text-navy/40 font-mono">{backgroundColor}</span>
                    </div>
                  </label>
                </div>

                {/* Zoom */}
                <label className="flex items-center justify-between">
                  <span className="text-xs font-medium text-navy">Enable Zoom</span>
                  <button
                    type="button"
                    onClick={() => setZoomEnabled(!zoomEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      zoomEnabled ? 'bg-gold' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        zoomEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>

                <button
                  type="button"
                  onClick={handleSave360}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold text-white text-xs font-semibold rounded-lg hover:bg-gold/90 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save 360 Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
