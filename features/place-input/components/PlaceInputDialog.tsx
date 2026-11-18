import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Trash2, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import {
  MAX_PLACE_TEXT_LENGTH,
  cloneGenealogyPlace,
  createEmptyStructuredPlace,
  finalizeGenealogyPlace,
  formatGenealogyPlace,
  getAllPlaceCountries,
  isPlaceholderCityName,
  matchRegionFromText,
} from '../place-core';
import type { GenealogyPlace } from '../place.types';

interface PlaceInputDialogProps {
  isOpen: boolean;
  title: string;
  value: GenealogyPlace | null;
  detailPlaceholder?: string;
  onClose: () => void;
  onConfirm: (next: GenealogyPlace | null) => void;
}

type PlaceTab = 'structured' | 'phrase';

export const PlaceInputDialog: React.FC<PlaceInputDialogProps> = ({
  isOpen,
  title,
  value,
  detailPlaceholder = '例如：澄江镇南溪村 / 狮子山金钗穴，坐北朝南',
  onClose,
  onConfirm,
}) => {
  const countries = useMemo(() => getAllPlaceCountries(), []);

  const [draft, setDraft] = useState<GenealogyPlace>(() =>
    value ? cloneGenealogyPlace(value) : createEmptyStructuredPlace()
  );

  useEffect(() => {
    if (!isOpen) return;
    if (value) {
      setDraft(cloneGenealogyPlace(value));
    } else {
      setDraft(createEmptyStructuredPlace());
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const activeCountry = useMemo(
    () =>
      countries.find((c) => c.name === (draft.country || '中国')) || countries[0],
    [countries, draft.country]
  );

  const provinces = useMemo(
    () => activeCountry?.provinces ?? [],
    [activeCountry]
  );

  const activeProvince = useMemo(
    () => provinces.find((p) => p.name === draft.province) || null,
    [provinces, draft.province]
  );

  const cities = useMemo(() => activeProvince?.cities ?? [], [activeProvince]);

  // If a municipality/SAR only has internal placeholder city nodes (e.g. 市辖区 / 县),
  // expose all its districts directly when city select is empty or placeholder.
  const hasOnlyPlaceholderCities = useMemo(
    () =>
      cities.length > 0 &&
      cities.every(
        (c) => c.isInternalHolder || isPlaceholderCityName(c.name)
      ),
    [cities]
  );

  const selectableCities = useMemo(
    () =>
      cities.filter(
        (c) => !c.isInternalHolder && !isPlaceholderCityName(c.name)
      ),
    [cities]
  );

  const activeCity = useMemo(
    () => selectableCities.find((c) => c.name === draft.city) || null,
    [selectableCities, draft.city]
  );

  const districts = useMemo(() => {
    if (activeCity) return activeCity.districts;
    if (hasOnlyPlaceholderCities) {
      return cities.flatMap((c) => c.districts);
    }
    return [];
  }, [activeCity, hasOnlyPlaceholderCities, cities]);

  if (!isOpen) return null;

  const activeTab: PlaceTab = draft.kind === 'phrase' ? 'phrase' : 'structured';
  const previewText = formatGenealogyPlace(draft);

  const handleSelectTab = (tab: PlaceTab) => {
    if (tab === activeTab) return;
    if (tab === 'phrase') {
      const currentText =
        draft.originalText?.trim() || formatGenealogyPlace(draft) || '';
      setDraft({
        schemaVersion: 1,
        kind: 'phrase',
        originalText: currentText,
      });
      return;
    }

    const rawText = draft.originalText?.trim() || '';
    const matched = rawText ? matchRegionFromText(rawText) : null;
    if (matched) {
      setDraft({
        ...matched,
        originalText: rawText || null,
      });
    } else {
      setDraft({
        ...createEmptyStructuredPlace(),
        originalText: rawText || null,
      });
    }
  };

  const handleCountryChange = (countryName: string) => {
    setDraft((prev) => ({
      ...prev,
      kind: 'structured',
      country: countryName,
      province: '',
      city: '',
      district: '',
    }));
  };

  const handleProvinceChange = (provinceName: string) => {
    setDraft((prev) => ({
      ...prev,
      kind: 'structured',
      country: activeCountry?.name || '中国',
      province: provinceName,
      city: '',
      district: '',
    }));
  };

  const handleCityChange = (cityName: string) => {
    setDraft((prev) => ({
      ...prev,
      kind: 'structured',
      city: cityName,
      district: '',
    }));
  };

  const handleDistrictChange = (districtName: string) => {
    setDraft((prev) => ({
      ...prev,
      kind: 'structured',
      district: districtName,
    }));
  };

  const canConfirm = Boolean(
    draft.kind === 'phrase'
      ? draft.originalText?.trim()
      : formatGenealogyPlace(draft).trim() || draft.originalText?.trim()
  );

  const dialogContent = (
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="place-dialog-title"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border-0 sm:border sm:border-border rounded-none sm:rounded-xl shadow-2xl w-full sm:max-w-[540px] h-full sm:h-auto sm:max-h-[88vh] flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-[hsl(var(--surface-subtle))] shrink-0">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-primary shrink-0" aria-hidden="true" />
            <h3
              id="place-dialog-title"
              className="font-semibold text-sm text-foreground"
            >
              {title}
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="关闭地点编辑器"
          >
            <X size={15} />
          </Button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Mode Tabs */}
          <div
            role="tablist"
            aria-label="地点录入模式"
            className="flex items-center gap-1 p-1 rounded-lg bg-[hsl(var(--surface-subtle))] border border-border/60"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'structured'}
              onClick={() => handleSelectTab('structured')}
              className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'structured'
                  ? 'bg-card text-foreground shadow-[var(--shadow-control)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              标准化区划与详址
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'phrase'}
              onClick={() => handleSelectTab('phrase')}
              className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'phrase'
                  ? 'bg-card text-foreground shadow-[var(--shadow-control)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              仅原始记载
            </button>
          </div>

          {activeTab === 'structured' ? (
            <div className="space-y-4">
              {/* Cascading Administrative Divisions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="place-country"
                    className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                  >
                    国家 / 地区
                  </label>
                  <Select
                    id="place-country"
                    value={activeCountry?.name || '中国'}
                    onChange={(e) => handleCountryChange(e.target.value)}
                  >
                    {countries.map((c) => (
                      <option
                        key={c.code}
                        value={c.name}
                        className="bg-card text-foreground"
                      >
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {provinces.length > 0 && (
                  <div>
                    <label
                      htmlFor="place-province"
                      className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                    >
                      {activeCountry?.name === '中国' ? '省 / 直辖市 / 自治区' : '州 / 省 / 地区'}
                    </label>
                    <Select
                      id="place-province"
                      value={draft.province || ''}
                      isPlaceholder={!draft.province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                    >
                      <option value="" className="bg-card text-placeholder">
                        不详 / 留空
                      </option>
                      {provinces.map((p) => (
                        <option
                          key={p.code}
                          value={p.name}
                          className="bg-card text-foreground"
                        >
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {selectableCities.length > 0 && (
                  <div>
                    <label
                      htmlFor="place-city"
                      className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                    >
                      {activeCountry?.name === '中国' ? '地级市 / 州' : '城市'}
                    </label>
                    <Select
                      id="place-city"
                      value={draft.city || ''}
                      isPlaceholder={!draft.city}
                      onChange={(e) => handleCityChange(e.target.value)}
                    >
                      <option value="" className="bg-card text-placeholder">
                        不详 / 留空
                      </option>
                      {selectableCities.map((c) => (
                        <option
                          key={c.code}
                          value={c.name}
                          className="bg-card text-foreground"
                        >
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {districts.length > 0 && (
                  <div>
                    <label
                      htmlFor="place-district"
                      className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                    >
                      区 / 县 / 旗
                    </label>
                    <Select
                      id="place-district"
                      value={draft.district || ''}
                      isPlaceholder={!draft.district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                    >
                      <option value="" className="bg-card text-placeholder">
                        不详 / 留空
                      </option>
                      {districts.map((d) => (
                        <option
                          key={d.code}
                          value={d.name}
                          className="bg-card text-foreground"
                        >
                          {d.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              {/* Village / Mountain / Orientation Detail */}
              <div className="space-y-1.5">
                <label
                  htmlFor="place-detail"
                  className="block text-[11px] font-medium text-muted-foreground"
                >
                  乡镇村落 / 墓地山向与坐向（选填）
                </label>
                <Input
                  id="place-detail"
                  value={draft.detail || ''}
                  maxLength={MAX_PLACE_TEXT_LENGTH}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      kind: 'structured',
                      detail: e.target.value,
                    })
                  }
                  placeholder={detailPlaceholder}
                  className="h-8 text-xs px-2.5"
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  可补充乡、镇、自然村、门牌或祖茔山名穴位、坐向碑刻；若仅知大略省县，区县及详址可留空。
                </p>
              </div>

              {/* Optional Original Archival Place Text */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="place-original-text"
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    古籍原始地名记载（选填，独立保存不被覆盖）
                  </label>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {(draft.originalText || '').length}/{MAX_PLACE_TEXT_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="place-original-text"
                  rows={2}
                  maxLength={MAX_PLACE_TEXT_LENGTH}
                  value={draft.originalText || ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      originalText: e.target.value,
                    })
                  }
                  placeholder="例如：庐陵郡太和县南溪里 / 江南省徽州府歙县"
                  className="min-h-[56px] text-xs p-2.5 resize-none leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="place-phrase-text"
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  原始地点记载（必填）
                </label>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {(draft.originalText || '').length}/{MAX_PLACE_TEXT_LENGTH}
                </span>
              </div>
              <Textarea
                id="place-phrase-text"
                rows={3}
                maxLength={MAX_PLACE_TEXT_LENGTH}
                value={draft.originalText || ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    kind: 'phrase',
                    originalText: e.target.value,
                  })
                }
                placeholder="例如：桐梓县狮子山金钗穴，坐北朝南兼子午三分，有碑刻华表"
                className="min-h-[72px] text-xs p-2.5 resize-none leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                适用于古郡望、难对应现代行政区划的地名或完整墓茔山向记述，按原样保存且不会被覆盖。
              </p>
            </div>
          )}

          {/* Live Preview */}
          <div className="rounded-lg border border-border bg-[hsl(var(--surface-subtle))] p-3 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                地点预览
              </span>
              <span className="text-[11px] text-muted-foreground">
                {draft.kind === 'phrase' ? '原始记载' : '标准化地名'}
              </span>
            </div>
            <div className="text-sm font-semibold text-foreground">
              {previewText || '尚未填写有效地点'}
            </div>
            {draft.kind === 'structured' && draft.originalText?.trim() && (
              <div className="text-[11px] text-muted-foreground">
                附记原文：{draft.originalText.trim()}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-5 py-3 border-t border-border bg-[hsl(var(--surface-subtle))] flex items-center justify-between gap-2 shrink-0">
          <div>
            {(value || previewText) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onConfirm(null)}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
              >
                <Trash2 size={12} />
                <span>清空地点</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 px-3.5 text-xs"
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canConfirm}
              onClick={() => onConfirm(finalizeGenealogyPlace(draft))}
              className="h-8 px-4 text-xs"
            >
              确定
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return dialogContent;
  return createPortal(dialogContent, document.body);
};
