import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, MapPin, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { PersonRecord } from '../../lineage/types';
import {
  MAX_PLACE_TEXT_LENGTH,
  extractClanPlaceStats,
  formatGenealogyPlace,
  generatePlaceSuggestions,
  isLosslessPlaceCarry,
  matchRegionFromText,
} from '../place-core';
import type { GenealogyPlace, PlaceSuggestionItem } from '../place.types';
import { PlaceInputDialog } from './PlaceInputDialog';

export interface PlaceInputProps {
  id?: string;
  label?: string;
  value: GenealogyPlace | null;
  onChange: (value: GenealogyPlace | null) => void;
  clanPersons?: PersonRecord[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
}

interface DropdownLayout {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
  fontSize: string;
}

export const PlaceInput: React.FC<PlaceInputProps> = ({
  id,
  label = '地点',
  value,
  onChange,
  clanPersons = [],
  placeholder = '输入省市区县（如 观山湖、江西泰和）或原始地名',
  error,
  disabled = false,
  readOnly = false,
  required = false,
  className,
}) => {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [forceOpenMenu, setForceOpenMenu] = useState(false);
  const [menuDismissed, setMenuDismissed] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [userMovedHighlight, setUserMovedHighlight] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState<DropdownLayout | null>(
    null
  );
  const [dialogSeedValue, setDialogSeedValue] =
    useState<GenealogyPlace | null>(value);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const displayText = useMemo(() => formatGenealogyPlace(value), [value]);
  const clanPlaces = useMemo(
    () => extractClanPlaceStats(clanPersons),
    [clanPersons]
  );

  useEffect(() => {
    setIsEditing(false);
    setIsDirty(false);
    setForceOpenMenu(false);
    setMenuDismissed(false);
    setUserMovedHighlight(false);
    setDraftText(displayText);
    setActiveIndex(0);
  }, [value, displayText]);

  const canEdit = !disabled && !readOnly;
  const shownText = isEditing ? draftText : displayText;
  const hasVisibleText = Boolean(shownText.trim());

  const suggestions = useMemo(() => {
    if (!canEdit || !isEditing || (!isDirty && !forceOpenMenu)) return [];
    return generatePlaceSuggestions(draftText, { clanPlaces });
  }, [canEdit, isEditing, isDirty, forceOpenMenu, draftText, clanPlaces]);

  const showDropdown =
    canEdit &&
    isEditing &&
    !open &&
    !menuDismissed &&
    (isDirty || forceOpenMenu) &&
    suggestions.length > 0;

  useEffect(() => {
    setActiveIndex(0);
    setUserMovedHighlight(false);
  }, [draftText, suggestions.length]);

  useEffect(() => {
    if (!showDropdown) return;
    const el = optionRefs.current[activeIndex];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [showDropdown, activeIndex]);

  const updateDropdownPosition = useCallback(() => {
    if (!wrapperRef.current || typeof window === 'undefined') return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const desiredWidth = Math.min(
      Math.max(rect.width, 320),
      Math.max(240, viewportWidth - 24)
    );
    const left = Math.max(
      12,
      Math.min(rect.left, viewportWidth - desiredWidth - 12)
    );
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const fontSize = inputRef.current
      ? window.getComputedStyle(inputRef.current).fontSize || '12px'
      : '12px';

    if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
      setDropdownLayout({
        left,
        width: desiredWidth,
        top: rect.bottom + 4,
        maxHeight: Math.min(288, Math.max(120, spaceBelow)),
        fontSize,
      });
    } else {
      setDropdownLayout({
        left,
        width: desiredWidth,
        bottom: viewportHeight - rect.top + 4,
        maxHeight: Math.min(288, Math.max(120, spaceAbove)),
        fontSize,
      });
    }
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    updateDropdownPosition();
    let rafId = 0;
    const handleReposition = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateDropdownPosition);
    };
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [showDropdown, updateDropdownPosition, suggestions.length]);

  const selectSuggestion = (item: PlaceSuggestionItem) => {
    setIsDirty(false);
    setForceOpenMenu(false);
    setMenuDismissed(true);
    setUserMovedHighlight(false);
    setDraftText(item.primaryLabel);
    onChange(item.value);
  };

  const commitInlineText = (): void => {
    if (!isDirty) {
      setIsEditing(false);
      setForceOpenMenu(false);
      return;
    }

    const trimmed = draftText.trim();
    if (!trimmed) {
      setIsDirty(false);
      setForceOpenMenu(false);
      setMenuDismissed(true);
      setDraftText('');
      onChange(null);
      setIsEditing(false);
      return;
    }

    const activeItem = suggestions[activeIndex];
    if (
      activeItem &&
      (userMovedHighlight || isLosslessPlaceCarry(trimmed, activeItem))
    ) {
      selectSuggestion(activeItem);
      setIsEditing(false);
      return;
    }

    const firstLossless = suggestions.find(
      (s) => s.kind !== 'phrase' && isLosslessPlaceCarry(trimmed, s)
    );
    if (firstLossless) {
      selectSuggestion(firstLossless);
      setIsEditing(false);
      return;
    }

    const matched = matchRegionFromText(trimmed);
    const nextPlace: GenealogyPlace = matched ?? {
      schemaVersion: 1,
      kind: 'phrase',
      originalText: trimmed,
    };
    setIsDirty(false);
    setForceOpenMenu(false);
    setMenuDismissed(true);
    setDraftText(formatGenealogyPlace(nextPlace));
    onChange(nextPlace);
    setIsEditing(false);
  };

  const getDialogInitialValue = (): GenealogyPlace | null => {
    if (isEditing && isDirty) {
      const trimmed = draftText.trim();
      if (!trimmed) return null;
      const activeItem = suggestions[activeIndex];
      if (
        activeItem &&
        (userMovedHighlight || isLosslessPlaceCarry(trimmed, activeItem))
      ) {
        return activeItem.value;
      }
      return (
        matchRegionFromText(trimmed) ?? {
          schemaVersion: 1,
          kind: 'phrase',
          originalText: trimmed,
        }
      );
    }
    return value;
  };

  const handleOpenDialog = () => {
    if (!canEdit) return;
    const seed = getDialogInitialValue();
    setDialogSeedValue(seed);
    if (isEditing && isDirty && seed) {
      onChange(seed);
    }
    setIsEditing(false);
    setIsDirty(false);
    setForceOpenMenu(false);
    setMenuDismissed(true);
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleConfirmDialog = (next: GenealogyPlace | null) => {
    setIsEditing(false);
    setIsDirty(false);
    setForceOpenMenu(false);
    setMenuDismissed(true);
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const activeSuggestion = showDropdown ? suggestions[activeIndex] : undefined;

  const listboxPortal =
    showDropdown && dropdownLayout && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={listboxId}
            role="listbox"
            aria-label={`${label}备选列表`}
            style={{
              position: 'fixed',
              left: dropdownLayout.left,
              width: dropdownLayout.width,
              top: dropdownLayout.top,
              bottom: dropdownLayout.bottom,
              fontSize: dropdownLayout.fontSize,
            }}
            className="fs-lineage-theme z-[105] bg-popover text-popover-foreground border border-[#D8DADA] dark:border-slate-700/80 rounded-[8px] shadow-[0_10px_28px_-4px_rgba(0,0,0,0.16),0_2px_8px_-1px_rgba(0,0,0,0.08)] overflow-hidden transition-opacity duration-150"
          >
            <div
              style={{ maxHeight: dropdownLayout.maxHeight }}
              className="overflow-y-auto divide-y divide-border/40"
            >
              {suggestions.map((item, idx) => {
                const selected = idx === activeIndex;
                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    id={`${reactId}-${item.id}`}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => {
                      setActiveIndex(idx);
                      setUserMovedHighlight(true);
                    }}
                    onClick={() => selectSuggestion(item)}
                    className={cn(
                      'px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition-colors duration-100',
                      selected
                        ? 'bg-[hsl(var(--surface-active))] text-foreground'
                        : 'hover:bg-[hsl(var(--surface-hover))] text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'w-3.5 shrink-0 flex items-center justify-center',
                          selected ? 'text-primary' : 'text-transparent'
                        )}
                        aria-hidden="true"
                      >
                        <Check size={13} strokeWidth={2.5} />
                      </span>
                      <span
                        className={cn(
                          'truncate',
                          selected ? 'font-semibold' : 'font-medium'
                        )}
                      >
                        {item.primaryLabel}
                      </span>
                    </div>
                    <span className="text-[0.85em] text-muted-foreground whitespace-nowrap shrink-0">
                      {item.metaLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-1.5 border-t border-border/60 bg-[hsl(var(--surface-subtle))] text-[0.78em] text-muted-foreground flex items-center justify-between gap-2">
              <span>↑↓ 选择 · Enter 采纳 · Tab 确认首选</span>
              <span className="whitespace-nowrap">Esc 收起</span>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="w-full">
      <div ref={wrapperRef} className="relative flex items-center w-full">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={showDropdown ? listboxId : undefined}
          aria-activedescendant={
            activeSuggestion ? `${reactId}-${activeSuggestion.id}` : undefined
          }
          autoComplete="off"
          maxLength={MAX_PLACE_TEXT_LENGTH}
          data-1p-ignore=""
          data-lpignore=""
          data-bwignore=""
          value={shownText}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={Boolean(error) || undefined}
          onFocus={() => {
            if (!canEdit) return;
            setIsEditing(true);
            setDraftText(displayText);
            setIsDirty(false);
            setForceOpenMenu(false);
            setMenuDismissed(false);
            setUserMovedHighlight(false);
          }}
          onChange={(e) => {
            if (!canEdit) return;
            setIsEditing(true);
            setDraftText(e.target.value);
            setIsDirty(true);
            setForceOpenMenu(false);
            setMenuDismissed(false);
            setUserMovedHighlight(false);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (!canEdit) return;
            if (e.key === 'ArrowDown') {
              if (e.altKey) {
                e.preventDefault();
                handleOpenDialog();
                return;
              }
              if (showDropdown) {
                e.preventDefault();
                setUserMovedHighlight(true);
                setActiveIndex((prev) => (prev + 1) % suggestions.length);
                return;
              }
              if (draftText.trim()) {
                e.preventDefault();
                setIsEditing(true);
                setForceOpenMenu(true);
                setMenuDismissed(false);
                setActiveIndex(0);
              }
              return;
            }
            if (e.key === 'ArrowUp') {
              if (showDropdown) {
                e.preventDefault();
                setUserMovedHighlight(true);
                setActiveIndex(
                  (prev) => (prev - 1 + suggestions.length) % suggestions.length
                );
              }
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (showDropdown && suggestions[activeIndex]) {
                selectSuggestion(suggestions[activeIndex]);
                setIsEditing(false);
              } else {
                commitInlineText();
              }
              return;
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              e.nativeEvent.stopPropagation();
              if (showDropdown) {
                setMenuDismissed(true);
                setForceOpenMenu(false);
                return;
              }
              setDraftText(displayText);
              setIsDirty(false);
              setForceOpenMenu(false);
              setMenuDismissed(false);
              setUserMovedHighlight(false);
              setIsEditing(false);
              inputRef.current?.blur();
              return;
            }
            if (e.key === 'F4') {
              e.preventDefault();
              handleOpenDialog();
            }
          }}
          onBlur={() => {
            if (!canEdit) return;
            setForceOpenMenu(false);
            setMenuDismissed(true);
            commitInlineText();
          }}
          className={cn(
            'flex h-8 w-full rounded-[6px] border border-input bg-card pl-2.5 py-1 text-xs text-foreground shadow-[var(--shadow-control)] ring-offset-background transition-all duration-150 outline-none placeholder:text-placeholder placeholder:font-normal hover:border-[hsl(var(--border-strong))] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:shadow-[var(--shadow-focus-halo)] disabled:cursor-not-allowed disabled:opacity-50',
            hasVisibleText && canEdit ? 'pr-14' : 'pr-8',
            error ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive' : '',
            className
          )}
        />

        {hasVisibleText && canEdit && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setDraftText('');
              setIsDirty(false);
              setForceOpenMenu(false);
              setMenuDismissed(true);
              setUserMovedHighlight(false);
              setIsEditing(false);
              onChange(null);
              inputRef.current?.focus();
            }}
            aria-label={`清空${label}`}
            title="清空地点"
            className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5 rounded flex items-center justify-center text-[#56585A] dark:text-slate-400 hover:text-destructive hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <X size={12} aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          disabled={!canEdit}
          aria-label={`打开${label}高级选择器`}
          aria-haspopup="dialog"
          aria-expanded={open}
          title="选择标准省市区县或填写原始记载"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleOpenDialog}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center text-[#56585A] dark:text-slate-400 hover:text-[#057091] dark:hover:text-[#58B1CD] hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/20 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <MapPin size={13} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <p className="mt-1 text-[11px] text-destructive leading-snug">{error}</p>
      )}

      {listboxPortal}

      <PlaceInputDialog
        isOpen={open}
        title={`编辑${label}`}
        value={open ? dialogSeedValue : value}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDialog}
      />
    </div>
  );
};
