import React from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface CanvasZoomBarProps {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const CanvasZoomBar: React.FC<CanvasZoomBarProps> = ({
  zoom,
  minZoom = 0.2,
  maxZoom = 2.8,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  return (
    <div
      data-no-print="true"
      className="flex items-center gap-0.5 bg-card/92 backdrop-blur-md border border-border rounded-xl p-1 shadow-[var(--shadow-popover)] text-xs shrink-0"
    >
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= minZoom + 0.001}
        title="缩小"
        aria-label="缩小"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
      >
        <Minus size={13} />
      </button>
      <span className="px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground min-w-[44px] text-center select-none">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom - 0.001}
        title="放大"
        aria-label="放大"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
      >
        <Plus size={13} />
      </button>
      <button
        type="button"
        onClick={onResetZoom}
        title="重置缩放"
        aria-label="重置缩放"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] cursor-pointer transition-colors"
      >
        <RotateCcw size={12} />
      </button>
    </div>
  );
};

export default CanvasZoomBar;
