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
      className="flex items-center gap-0.5 bg-[#FEFEFE]/95 dark:bg-[#1E2329]/95 backdrop-blur-md border border-[#D8DADA] dark:border-slate-700/80 rounded-[10px] p-1 shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_14px_rgba(0,0,0,0.4)] text-xs shrink-0"
    >
      <button
        type="button"
        onClick={onZoomOut}
        disabled={zoom <= minZoom + 0.001}
        title="缩小"
        aria-label="缩小"
        className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#56585A] dark:text-slate-300 hover:text-[#057091] dark:hover:text-[#58B1CD] hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
      >
        <Minus size={13} />
      </button>
      <span className="px-1.5 text-[11px] font-semibold tabular-nums text-[#212225] dark:text-slate-200 min-w-[44px] text-center select-none">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        disabled={zoom >= maxZoom - 0.001}
        title="放大"
        aria-label="放大"
        className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#56585A] dark:text-slate-300 hover:text-[#057091] dark:hover:text-[#58B1CD] hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
      >
        <Plus size={13} />
      </button>
      <button
        type="button"
        onClick={onResetZoom}
        title="重置缩放"
        aria-label="重置缩放"
        className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#56585A] dark:text-slate-300 hover:text-[#057091] dark:hover:text-[#58B1CD] hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/20 cursor-pointer transition-colors"
      >
        <RotateCcw size={12} />
      </button>
    </div>
  );
};

export default CanvasZoomBar;
