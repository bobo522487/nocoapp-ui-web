import React from 'react';
import { Star } from 'lucide-react';
import { AssetColorTheme } from '../../../types';
import { ASSET_COLOR_PALETTES } from '../../../store/useWorkspaceStore';
import { formatPlacePath, type GenealogyPlace } from '../../place-input';

interface GenealogyBookPreviewProps {
  projectName: string;
  primaryName: string;
  primarySurname: string;
  region?: GenealogyPlace | null;
  projectState: '0' | '1';
  projectLevel: number;
  colorTheme: AssetColorTheme;
}

const COVER_THEMES: Record<
  AssetColorTheme,
  { coverBg: string; spineBg: string; borderTint: string; sealBg: string }
> = {
  sky: {
    coverBg: 'from-[#055A75] via-[#057091] to-[#033E52]',
    spineBg: '#033344',
    borderTint: 'rgba(125, 211, 236, 0.35)',
    sealBg: '#057091',
  },
  indigo: {
    coverBg: 'from-[#0D4A6B] via-[#136088] to-[#09354D]',
    spineBg: '#072A3D',
    borderTint: 'rgba(147, 197, 253, 0.32)',
    sealBg: '#057091',
  },
  emerald: {
    coverBg: 'from-[#0B4F5C] via-[#116878] to-[#083B45]',
    spineBg: '#062E36',
    borderTint: 'rgba(103, 232, 249, 0.3)',
    sealBg: '#0383A4',
  },
  orange: {
    coverBg: 'from-[#164A5E] via-[#1E6078] to-[#0F3645]',
    spineBg: '#0B2A36',
    borderTint: 'rgba(165, 216, 230, 0.3)',
    sealBg: '#057091',
  },
  pink: {
    coverBg: 'from-[#1C4866] via-[#245D82] to-[#13334A]',
    spineBg: '#0E2738',
    borderTint: 'rgba(186, 230, 253, 0.3)',
    sealBg: '#057091',
  },
  violet: {
    coverBg: 'from-[#153E5C] via-[#1D5278] to-[#0E2C42]',
    spineBg: '#0A2133',
    borderTint: 'rgba(165, 216, 238, 0.3)',
    sealBg: '#0383A4',
  },
};

export const GenealogyBookPreview: React.FC<GenealogyBookPreviewProps> = ({
  projectName,
  primaryName,
  primarySurname,
  region,
  projectState,
  projectLevel,
  colorTheme,
}) => {
  const palette = ASSET_COLOR_PALETTES[colorTheme] || ASSET_COLOR_PALETTES.sky;
  const cover = COVER_THEMES[colorTheme] || COVER_THEMES.sky;
  const hasTitle = Boolean(primaryName.trim());
  const displayTitle = hasTitle ? primaryName.trim() : '右侧输入主题名';
  const displaySurname = primarySurname.trim();
  const displayRegion = formatPlacePath(region, ' · ') || '未设置地区';

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Traditional Thread-Bound Book Cover */}
      <div
        className={`relative w-[228px] h-[324px] rounded-l-md rounded-r-[3px] bg-gradient-to-br ${cover.coverBg} shadow-[0_14px_30px_-10px_rgba(15,23,42,0.45)] overflow-hidden transition-colors duration-200`}
        style={{
          boxShadow:
            '0 14px 28px -10px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        }}
      >
        {/* Subtle silk-cloth weave pattern */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 5px)',
          }}
        />

        {/* Inner decorative hairline frame */}
        <div
          className="absolute inset-3 right-7 rounded-[2px] border pointer-events-none"
          style={{ borderColor: cover.borderTint }}
        />

        {/* Right Spine & Traditional 4-Needle Thread Binding (四眼线装) */}
        <div
          className="absolute top-0 right-0 bottom-0 w-5 border-l border-white/15 flex flex-col justify-between py-6 items-center"
          style={{ backgroundColor: cover.spineBg }}
        >
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="relative w-full flex items-center justify-center">
              <span className="block w-full h-[1.5px] bg-[#D9EEF4]/85" />
              <span className="absolute left-1 w-1.5 h-1.5 rounded-full bg-[#D9EEF4]/95 shadow-xs" />
            </div>
          ))}
        </div>

        {/* Left Vertical Archival Title Slip (题签) */}
        <div className="absolute top-7 left-6 w-[58px] min-h-[192px] max-h-[218px] bg-[#F7FAFA] rounded-[2px] shadow-[0_2px_6px_rgba(0,0,0,0.28)] p-1 flex flex-col items-center justify-center">
          <div className="w-full h-full border border-[#057091]/45 rounded-[1px] px-1.5 py-3 flex items-center justify-center">
            <div
              className={`text-center tracking-[0.22em] leading-snug break-all ${
                hasTitle
                  ? 'text-[17px] font-bold text-[#1E293B]'
                  : 'text-[13px] font-medium text-[#64748B]'
              }`}
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
              }}
            >
              {displayTitle}
            </div>
          </div>
        </div>

        {/* Surname Blue-Teal Seal (青蓝姓氏印章) */}
        {displaySurname ? (
          <div
            className="absolute top-8 right-9 w-9 h-9 rounded-[3px] border border-white/30 flex items-center justify-center shadow-sm"
            style={{ backgroundColor: cover.sealBg }}
            title={`主姓氏：${displaySurname}`}
          >
            <div className="w-7 h-7 border border-[#E6F4F7]/65 rounded-[2px] flex items-center justify-center">
              <span className="text-[14px] font-bold text-[#F5FBFD] leading-none">
                {displaySurname.slice(0, 1)}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="absolute top-8 right-9 w-9 h-9 rounded-[3px] border border-dashed border-white/30 flex items-center justify-center"
            title="姓氏印章预览"
          >
            <span className="text-[10px] font-medium text-white/50">姓</span>
          </div>
        )}

        {/* Bottom Colophon Info on Book Cover */}
        <div className="absolute bottom-5 left-6 right-9 space-y-1.5">
          <div className="flex items-center gap-1" aria-label={`重要等级 ${projectLevel} 级`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={11}
                className={
                  star <= projectLevel
                    ? 'fill-[#7DD3EC] text-[#7DD3EC]'
                    : 'text-white/25'
                }
              />
            ))}
          </div>
          <div className="text-[11px] font-medium text-white/90 truncate">
            {projectName.trim() || '未命名家族'}
          </div>
          <div className="text-[10px] text-white/65 truncate">
            {displayRegion}
          </div>
        </div>
      </div>

      {/* Quiet Preview Metadata Summary (Zero-Pill Clean Text) */}
      <div className="mt-4 w-full max-w-[228px] text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-foreground">
          <span
            className="inline-block w-2 h-2 rounded-xs shrink-0"
            style={{ backgroundColor: palette.fillLight }}
          />
          <span className="truncate">云谱封面实时预览</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
          <span>{projectState === '1' ? '已完成' : '进行中'}</span>
          <span aria-hidden="true">·</span>
          <span>重要等级 {projectLevel} 星</span>
        </div>
      </div>
    </div>
  );
};
