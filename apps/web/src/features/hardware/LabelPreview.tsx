'use client';

import type { PrintPreviewResponse } from '@caratflow/shared-types';

interface LabelPreviewProps {
  preview: PrintPreviewResponse | null;
  scale?: number;
}

/**
 * Visual preview of a label template with product data filled in.
 * Renders fields positioned according to their x/y coordinates.
 * Label dimensions are in millimeters; scale factor converts to pixels.
 */
export function LabelPreview({ preview, scale = 3 }: LabelPreviewProps) {
  if (!preview) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
        No preview available
      </div>
    );
  }

  const widthPx = preview.width * scale;
  const heightPx = preview.height * scale;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {preview.templateName} ({preview.width}mm x {preview.height}mm)
      </p>
      <div
        className="relative overflow-hidden rounded border bg-white shadow-sm"
        style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
      >
        {preview.renderedFields.map((field, idx) => {
          const left = field.x * scale;
          const top = field.y * scale;
          const fieldWidth = field.width * scale;
          const fieldHeight = field.height * scale;

          return (
            <div
              key={idx}
              className="absolute overflow-hidden"
              style={{
                left: `${left}px`,
                top: `${top}px`,
                width: `${fieldWidth}px`,
                height: `${fieldHeight}px`,
              }}
            >
              {field.type === 'text' && (
                <span
                  className="block leading-tight text-black"
                  style={{ fontSize: `${(field.fontSize ?? 10) * (scale / 3)}px` }}
                >
                  {field.resolvedValue}
                </span>
              )}
              {field.type === 'barcode' && (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="flex h-3/4 w-full items-end justify-center gap-px">
                    {/* Simplified barcode visualization */}
                    {Array.from({ length: Math.min(30, field.resolvedValue.length * 3) }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-black"
                        style={{
                          width: `${Math.max(1, scale / 3)}px`,
                          height: `${Math.random() * 60 + 40}%`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="mt-0.5 text-center text-black" style={{ fontSize: `${Math.max(6, scale * 2)}px` }}>
                    {field.resolvedValue}
                  </span>
                </div>
              )}
              {field.type === 'qr' && (
                <div className="flex h-full w-full items-center justify-center rounded border border-gray-300 bg-gray-50">
                  <span className="text-center text-gray-400" style={{ fontSize: `${Math.max(6, scale * 2)}px` }}>
                    QR
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
