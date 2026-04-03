'use client';

import * as React from 'react';
import { GripVertical, Settings, X } from 'lucide-react';
import type { DashboardWidgetConfig } from '@caratflow/shared-types';

interface WidgetGridProps {
  widgets: DashboardWidgetConfig[];
  onLayoutChange?: (widgets: DashboardWidgetConfig[]) => void;
  renderWidget: (widget: DashboardWidgetConfig) => React.ReactNode;
  editable?: boolean;
}

export function WidgetGrid({
  widgets,
  onLayoutChange,
  renderWidget,
  editable = false,
}: WidgetGridProps) {
  const handleRemoveWidget = (widgetId: string) => {
    if (onLayoutChange) {
      onLayoutChange(widgets.filter((w) => w.widgetId !== widgetId));
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-min">
      {widgets.map((widget) => (
        <div
          key={widget.widgetId}
          className={`col-span-${widget.w} rounded-lg border bg-card relative group`}
          style={{
            gridColumn: `span ${widget.w}`,
            minHeight: `${widget.h * 80}px`,
          }}
        >
          {editable && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1 rounded hover:bg-muted">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              </button>
              <button className="p-1 rounded hover:bg-muted">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => handleRemoveWidget(widget.widgetId)}
                className="p-1 rounded hover:bg-destructive/10"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          )}
          <div className="p-4 h-full">{renderWidget(widget)}</div>
        </div>
      ))}
    </div>
  );
}
