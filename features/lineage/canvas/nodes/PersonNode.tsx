import React, { memo, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { PersonFlowNode } from '../types';
import { formatGivenName } from '../../utils/nameUtils';
import { getPersonDateDisplay } from '../../../date-input';

const FirstAncestorBadgeIcon: React.FC = () => (
  <svg
    viewBox="0 0 20 20"
    className="w-[14px] h-[14px] text-[#202121]"
    fill="currentColor"
    aria-hidden="true"
  >
    {/* Person silhouette + star accent matching FamilySearch first-ancestor badge */}
    <circle cx="8" cy="6" r="2.6" />
    <path d="M3 15.5c0-2.6 2.2-4.3 5-4.3s5 1.7 5 4.3v.7H3v-.7z" />
    <path d="M15.2 4.2l.75 1.55 1.7.25-1.23 1.2.29 1.7-1.51-.8-1.51.8.29-1.7-1.23-1.2 1.7-.25.75-1.55z" />
  </svg>
);

export const PersonNode: React.FC<NodeProps<PersonFlowNode>> = memo(
  ({ data, selected }) => {
    const {
      person,
      clanSurname = '',
      isFirstAncestor = false,
      isAddMenuOpen = false,
      onSelect,
      onAddChild,
      onAddSibling,
      onAddSpouse,
      onToggleAddMenu,
    } = data;

    const menuContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!isAddMenuOpen) return;
      const handlePointerDown = (e: PointerEvent) => {
        if (
          menuContainerRef.current &&
          !menuContainerRef.current.contains(e.target as Node)
        ) {
          onToggleAddMenu?.(null);
        }
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onToggleAddMenu?.(null);
        }
      };
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isAddMenuOpen, onToggleAddMenu]);

    const isFemale = person.gender === 'female';
    const isUnknownGender = person.gender === 'unknown';
    const isSpouseNode = Boolean(person.spouseOfId);
    const isDeceased = person.status === 'deceased';

    const effectiveSurname = isSpouseNode
      ? person.surname?.trim() || ''
      : person.surname?.trim() || clanSurname.trim();

    const displayName = isSpouseNode
      ? [
          effectiveSurname && !person.name.startsWith(effectiveSurname)
            ? effectiveSurname
            : '',
          person.name,
        ].join('') || '配偶'
      : (() => {
          const given = formatGivenName(person.name, effectiveSurname);
          if (effectiveSurname && given && !given.startsWith(effectiveSurname)) {
            return `${effectiveSurname}${given}`;
          }
          return given || effectiveSurname || '未命名';
        })();

    const hasCjk = /[\u4e00-\u9fff]/.test(displayName);
    const verticalFontSizeClass =
      displayName.length > 6
        ? 'text-[15px]'
        : displayName.length > 4
          ? 'text-[17px]'
          : 'text-[20px]';

    const birthText = getPersonDateDisplay(person, 'birth').trim();
    const deathText = getPersonDateDisplay(person, 'death').trim();

    const topStripeClass = isFemale
      ? 'border-t-[#ED5481] dark:border-t-[#D16686]'
      : isUnknownGender
        ? 'border-t-[#9EA1A3] dark:border-t-[#7A828A]'
        : 'border-t-[#2097B7] dark:border-t-[#3E9EB8]';

    const genderSrText = isFemale ? '女' : isUnknownGender ? '性别不详' : '男';

    const tooltipLines = [
      displayName,
      birthText ? `生：${birthText}` : '',
      deathText ? `卒：${deathText}` : isDeceased ? '歿' : '存',
    ].filter(Boolean);

    const renderDates = () => {
      if (birthText && deathText) {
        if (birthText.length + deathText.length <= 12) {
          return (
            <div className="w-full truncate text-center">
              {birthText}–{deathText}
            </div>
          );
        }
        return (
          <>
            <div className="w-full truncate text-center">生 {birthText}</div>
            <div className="w-full truncate text-center">卒 {deathText}</div>
          </>
        );
      }

      if (birthText) {
        if (isDeceased) {
          if (birthText.length <= 9) {
            return (
              <div className="w-full truncate text-center">{birthText}–歿</div>
            );
          }
          return (
            <>
              <div className="w-full truncate text-center">生 {birthText}</div>
              <div className="w-full truncate text-center">歿</div>
            </>
          );
        }
        return <div className="w-full truncate text-center">{birthText}</div>;
      }

      if (deathText) {
        return (
          <div className="w-full truncate text-center">卒 {deathText}</div>
        );
      }

      return (
        <div className="w-full truncate text-center">
          {isDeceased ? '歿' : '存'}
        </div>
      );
    };

    return (
      <div
        role="group"
        tabIndex={0}
        aria-label={`${displayName}，${genderSrText}`}
        title={tooltipLines.join('\n')}
        onClick={(e) => {
          e.stopPropagation();
          if (isAddMenuOpen) {
            onToggleAddMenu?.(null);
          }
          onSelect?.(person.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(person.id);
          }
        }}
        className={`group relative w-[123px] h-[220px] rounded-[8px] border-t-[4px] ${topStripeClass} bg-[#FEFEFE] dark:bg-card select-none outline-none transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-[#057091] dark:focus-visible:ring-[#58B1CD] focus-visible:shadow-[0_0_0_5px_rgba(5,112,145,0.18),0_4px_12px_rgba(15,23,42,0.16)] dark:focus-visible:shadow-[0_0_0_5px_rgba(88,177,205,0.22),0_6px_16px_rgba(0,0,0,0.48)] ${
          selected
            ? 'ring-2 ring-[#057091] dark:ring-[#58B1CD] shadow-[0_0_0_5px_rgba(5,112,145,0.16),0_4px_12px_rgba(15,23,42,0.16)] dark:shadow-[0_0_0_5px_rgba(88,177,205,0.20),0_6px_16px_rgba(0,0,0,0.48)]'
            : 'shadow-[0_1px_3px_rgba(15,23,42,0.18)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.48)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.16)] dark:hover:shadow-[0_6px_16px_rgba(0,0,0,0.55)]'
        }`}
      >
        <span className="sr-only">{genderSrText}</span>

        {/* Top Target Handle (Incoming parent bloodline) */}
        <Handle
          type="target"
          position={Position.Top}
          id="parent-in"
          className="!w-2 !h-2 !opacity-0 pointer-events-none !top-0"
        />

        {/* Bottom Handles (Outgoing child stem & childless couple bracket) */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="child-out"
          className="!w-2 !h-2 !opacity-0 pointer-events-none !bottom-0"
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="spouse-bottom-in"
          className="!w-2 !h-2 !opacity-0 pointer-events-none !bottom-0"
        />

        {/* Top-Left First Ancestor Badge (same card size, badge only) */}
        {isFirstAncestor && (
          <div
            className="absolute top-[9px] left-[9px] w-[22.5px] h-[22.5px] rounded-full bg-[#FFC400] dark:bg-[#E0AF22] flex items-center justify-center pointer-events-none z-10"
            title="开基始祖"
          >
            <FirstAncestorBadgeIcon />
          </div>
        )}

        {/* Top-Right Persistent '+' Add Relative Button + Popover Menu */}
        <div
          ref={menuContainerRef}
          className="nodrag nopan nowheel absolute top-[3px] right-[3px] z-30"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label={`为${displayName}加入亲属`}
              aria-haspopup="menu"
              aria-expanded={isAddMenuOpen}
              title="加入亲属"
              onClick={(e) => {
                e.stopPropagation();
                onToggleAddMenu?.(isAddMenuOpen ? null : person.id);
              }}
              className={`w-[35px] h-[35px] rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#057091] dark:focus-visible:ring-[#58B1CD] focus-visible:shadow-[var(--shadow-focus-halo)] ${
                isAddMenuOpen
                  ? 'bg-[#EAF4F7] dark:bg-[#58B1CD]/15 text-[#057091] dark:text-[#58B1CD]'
                  : 'text-[rgba(0,3,5,0.737)] dark:text-foreground/75 hover:bg-[#EAF4F7] dark:hover:bg-[#58B1CD]/15 hover:text-[#057091] dark:hover:text-[#58B1CD]'
              }`}
            >
              <Plus size={19} strokeWidth={2} />
            </button>

            {isAddMenuOpen && (
              <div
                role="dialog"
                aria-modal="false"
                aria-label={`为${displayName}加入亲属`}
                className="absolute top-[38px] right-0 min-w-[112px] rounded-[12px] overflow-hidden bg-white dark:bg-popover border border-black/[0.06] dark:border-border shadow-[0_8px_24px_rgba(0,0,0,0.16),0_3px_8px_rgba(0,0,0,0.10)] z-50"
              >
                <ul role="menu" className="py-1.5 m-0 list-none">
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      aria-disabled="false"
                      onClick={() => {
                        onToggleAddMenu?.(null);
                        onAddSpouse?.(person.id);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[14px] font-medium leading-[1.35] text-[#202121] dark:text-foreground hover:bg-[#F2F3F4] dark:hover:bg-accent active:bg-[#E7E9EA] dark:active:bg-accent/80 focus-visible:outline-none focus-visible:bg-[#EAF4F7] focus-visible:text-[#057091] dark:focus-visible:bg-[#057091]/25 dark:focus-visible:text-[#58B1CD] whitespace-nowrap cursor-pointer transition-colors"
                    >
                      加入配偶
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      aria-disabled="false"
                      onClick={() => {
                        onToggleAddMenu?.(null);
                        onAddChild?.(person.id, 'male');
                      }}
                      className="w-full px-4 py-2.5 text-left text-[14px] font-medium leading-[1.35] text-[#202121] dark:text-foreground hover:bg-[#F2F3F4] dark:hover:bg-accent active:bg-[#E7E9EA] dark:active:bg-accent/80 focus-visible:outline-none focus-visible:bg-[#EAF4F7] focus-visible:text-[#057091] dark:focus-visible:bg-[#057091]/25 dark:focus-visible:text-[#58B1CD] whitespace-nowrap cursor-pointer transition-colors"
                    >
                      加入儿子
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      aria-disabled="false"
                      onClick={() => {
                        onToggleAddMenu?.(null);
                        onAddChild?.(person.id, 'female');
                      }}
                      className="w-full px-4 py-2.5 text-left text-[14px] font-medium leading-[1.35] text-[#202121] dark:text-foreground hover:bg-[#F2F3F4] dark:hover:bg-accent active:bg-[#E7E9EA] dark:active:bg-accent/80 focus-visible:outline-none focus-visible:bg-[#EAF4F7] focus-visible:text-[#057091] dark:focus-visible:bg-[#057091]/25 dark:focus-visible:text-[#58B1CD] whitespace-nowrap cursor-pointer transition-colors"
                    >
                      加入女儿
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      aria-disabled="false"
                      onClick={() => {
                        onToggleAddMenu?.(null);
                        onAddSibling?.(person.id, 'male');
                      }}
                      className="w-full px-4 py-2.5 text-left text-[14px] font-medium leading-[1.35] text-[#202121] dark:text-foreground hover:bg-[#F2F3F4] dark:hover:bg-accent active:bg-[#E7E9EA] dark:active:bg-accent/80 focus-visible:outline-none focus-visible:bg-[#EAF4F7] focus-visible:text-[#057091] dark:focus-visible:bg-[#057091]/25 dark:focus-visible:text-[#58B1CD] whitespace-nowrap cursor-pointer transition-colors"
                    >
                      加入兄弟
                    </button>
                  </li>
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      aria-disabled="false"
                      onClick={() => {
                        onToggleAddMenu?.(null);
                        onAddSibling?.(person.id, 'female');
                      }}
                      className="w-full px-4 py-2.5 text-left text-[14px] font-medium leading-[1.35] text-[#202121] dark:text-foreground hover:bg-[#F2F3F4] dark:hover:bg-accent active:bg-[#E7E9EA] dark:active:bg-accent/80 focus-visible:outline-none focus-visible:bg-[#EAF4F7] focus-visible:text-[#057091] dark:focus-visible:bg-[#057091]/25 dark:focus-visible:text-[#58B1CD] whitespace-nowrap cursor-pointer transition-colors"
                    >
                      加入姐妹
                    </button>
                  </li>
                </ul>
              </div>
            )}
        </div>

        {/* Center Name Area: Dead-centered vertically inside the 220px card */}
        <div className="absolute inset-x-[12px] top-[34px] bottom-[38px] flex items-center justify-center overflow-hidden pointer-events-none">
          {hasCjk ? (
            <div
              lang="zh"
              className={`[writing-mode:vertical-rl] ${verticalFontSizeClass} leading-[1.15] font-normal text-[#202121] dark:text-foreground tracking-[0.04em] pt-[0.04em] max-h-[116px] overflow-hidden text-center`}
            >
              {displayName}
            </div>
          ) : (
            <div className="text-[15px] leading-snug font-normal text-[#202121] dark:text-foreground text-center break-words line-clamp-3 w-full">
              {displayName}
            </div>
          )}
        </div>

        {/* Bottom Life Dates / Status (Pinned at bottom, clean unboxed text) */}
        <div className="absolute bottom-[12px] inset-x-[10px] text-[12.3px] leading-[1.35] text-[rgba(0,3,5,0.737)] dark:text-muted-foreground tabular-nums flex flex-col items-center justify-end pointer-events-none">
          {renderDates()}
        </div>
      </div>
    );
  }
);

PersonNode.displayName = 'PersonNode';
