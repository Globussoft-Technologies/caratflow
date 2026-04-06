// ─── CaratFlow AR & Virtual Try-On Types ──────────────────────
// Types for AR assets, virtual try-on, 360-degree product views,
// and try-on session analytics.

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────

export enum ArAssetType {
  AR_MODEL_3D = 'AR_MODEL_3D',
  AR_OVERLAY_2D = 'AR_OVERLAY_2D',
  SPIN_360_IMAGES = 'SPIN_360_IMAGES',
  VIDEO_360 = 'VIDEO_360',
}

export enum ArAssetFormat {
  GLTF = 'GLTF',
  GLB = 'GLB',
  USDZ = 'USDZ',
  OBJ = 'OBJ',
  PNG_SEQUENCE = 'PNG_SEQUENCE',
  MP4 = 'MP4',
}

export enum ArJewelryCategory {
  RING = 'RING',
  NECKLACE = 'NECKLACE',
  EARRING = 'EARRING',
  BANGLE = 'BANGLE',
  BRACELET = 'BRACELET',
  PENDANT = 'PENDANT',
  CHAIN = 'CHAIN',
}

export enum ArProcessingStatus {
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export enum ArDeviceType {
  MOBILE_IOS = 'MOBILE_IOS',
  MOBILE_ANDROID = 'MOBILE_ANDROID',
  DESKTOP_WEBCAM = 'DESKTOP_WEBCAM',
}

// ─── Zod Schemas ──────────────────────────────────────────────

export const ArAssetInputSchema = z.object({
  productId: z.string().uuid(),
  assetType: z.nativeEnum(ArAssetType),
  fileUrl: z.string().url().max(1000),
  thumbnailUrl: z.string().url().max(1000).optional(),
  format: z.nativeEnum(ArAssetFormat),
  fileSizeBytes: z.number().int().positive(),
  dimensions: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    depth: z.number().optional(),
  }).optional(),
  category: z.nativeEnum(ArJewelryCategory),
  metadata: z.object({
    scale: z.number().optional(),
    offsetX: z.number().optional(),
    offsetY: z.number().optional(),
    rotation: z.number().optional(),
  }).optional(),
});

export const TryOnSessionInputSchema = z.object({
  productId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  deviceType: z.nativeEnum(ArDeviceType),
});

export const TryOnSessionEndSchema = z.object({
  sessionId: z.string(),
  screenshotTaken: z.boolean().default(false),
  sharedVia: z.string().max(50).optional(),
  addedToCart: z.boolean().default(false),
  duration: z.number().int().min(0),
});

export const Product360ConfigInputSchema = z.object({
  productId: z.string().uuid(),
  imageUrls: z.array(z.string().url()).min(2).max(120),
  frameCount: z.number().int().min(2).max(120),
  autoRotate: z.boolean().default(true),
  rotationSpeed: z.number().int().min(10).max(120).default(30),
  backgroundColor: z.string().max(9).default('#FFFFFF'),
  zoomEnabled: z.boolean().default(true),
});

export const Product360ConfigUpdateSchema = Product360ConfigInputSchema.partial().omit({ productId: true });

export const ArAnalyticsFilterSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  category: z.nativeEnum(ArJewelryCategory).optional(),
});

// ─── Input Types ──────────────────────────────────────────────

export type ArAssetInput = z.infer<typeof ArAssetInputSchema>;
export type TryOnSessionInput = z.infer<typeof TryOnSessionInputSchema>;
export type TryOnSessionEnd = z.infer<typeof TryOnSessionEndSchema>;
export type Product360ConfigInput = z.infer<typeof Product360ConfigInputSchema>;
export type Product360ConfigUpdate = z.infer<typeof Product360ConfigUpdateSchema>;
export type ArAnalyticsFilter = z.infer<typeof ArAnalyticsFilterSchema>;

// ─── Response Types ───────────────────────────────────────────

export interface ArAssetResponse {
  id: string;
  tenantId: string;
  productId: string;
  assetType: ArAssetType;
  fileUrl: string;
  thumbnailUrl: string | null;
  format: ArAssetFormat;
  fileSizeBytes: number;
  dimensions: { width?: number; height?: number; depth?: number } | null;
  category: ArJewelryCategory;
  isActive: boolean;
  processingStatus: ArProcessingStatus;
  metadata: { scale?: number; offsetX?: number; offsetY?: number; rotation?: number } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TryOnConfig {
  productId: string;
  productName: string;
  productImage: string;
  category: ArJewelryCategory;
  modelUrl: string | null;
  overlayUrl: string | null;
  overlayPositioning: {
    scale: number;
    offsetX: number;
    offsetY: number;
    rotation: number;
  };
}

export interface TryOnSessionResponse {
  id: string;
  sessionId: string;
  productId: string;
  deviceType: ArDeviceType;
  duration: number;
  screenshotTaken: boolean;
  sharedVia: string | null;
  addedToCart: boolean;
  createdAt: Date;
}

export interface Product360Config {
  id: string;
  productId: string;
  imageUrls: string[];
  frameCount: number;
  autoRotate: boolean;
  rotationSpeed: number;
  backgroundColor: string;
  zoomEnabled: boolean;
}

export interface ArAnalytics {
  totalSessions: number;
  avgDuration: number;
  conversionRate: number;
  screenshotRate: number;
  shareRate: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    sessionCount: number;
    conversionRate: number;
  }>;
  deviceBreakdown: Array<{
    deviceType: ArDeviceType;
    count: number;
    percentage: number;
  }>;
  categoryBreakdown: Array<{
    category: ArJewelryCategory;
    count: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    date: string;
    sessions: number;
    conversions: number;
  }>;
}

export interface ArProductListItem {
  productId: string;
  productName: string;
  productSku: string;
  productImage: string | null;
  category: ArJewelryCategory;
  hasOverlay: boolean;
  has360: boolean;
  has3dModel: boolean;
  tryOnSessions: number;
}
