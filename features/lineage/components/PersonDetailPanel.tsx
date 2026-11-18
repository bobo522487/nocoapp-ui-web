import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  Columns2,
  Heart,
  PanelRightClose,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';
import { Select } from '../../../components/ui/select';
import {
  DateInput,
  readGenealogyDate,
  writeGenealogyDate,
} from '../../date-input';
import {
  PlaceInput,
  readGenealogyPlace,
  writeGenealogyPlace,
} from '../../place-input';
import {
  BiographyPreviewPreferences,
  DrawerLayoutMode,
  PersonRecord,
} from '../types';
import {
  computeAutoRankLabel,
  EDUCATION_LEVEL_OPTIONS,
  FEMALE_RELATION_TYPE_OPTIONS,
  hydratePersonDraft,
  normalizePersonForSave,
  RELATION_TYPE_OPTIONS,
  SPOUSE_RANK_OPTIONS,
  SPOUSE_RANK_ORDER,
  SPOUSE_TYPE_OPTIONS,
} from '../utils/personHelpers';
import { formatGivenName } from '../utils/nameUtils';
import { BiographyLivePreview } from './BiographyLivePreview';

interface PersonDetailPanelProps {
  person: PersonRecord | null;
  allPersons: PersonRecord[];
  clanSurname?: string;
  drawerMode: DrawerLayoutMode;
  onChangeDrawerMode: (mode: DrawerLayoutMode) => void;
  previewPrefs: BiographyPreviewPreferences;
  onUpdatePreviewPrefs: (updates: Partial<BiographyPreviewPreferences>) => void;
  onUpdatePerson: (id: string, updates: Partial<PersonRecord>) => void;
  onDeletePerson: (id: string) => void;
  onAddChild: (fatherId: string) => void;
  onAddSpouse: (personId: string) => void;
  width: number;
  onClose?: () => void;
}

export const PersonDetailPanel: React.FC<PersonDetailPanelProps> = ({
  person,
  allPersons,
  clanSurname = '',
  drawerMode,
  onChangeDrawerMode,
  previewPrefs,
  onUpdatePreviewPrefs,
  onUpdatePerson,
  onDeletePerson,
  onAddChild,
  onAddSpouse,
  width,
  onClose,
}) => {
  const [formData, setFormData] = useState<PersonRecord | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [confirmDeleteSelf, setConfirmDeleteSelf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (person) {
      const hydrated = hydratePersonDraft(person, clanSurname);
      setFormData(hydrated);
      setIsDirty(false);
      setConfirmDeleteSelf(false);
      if (
        person.name === '新子嗣' ||
        person.name === '新千金' ||
        person.name === '新兄弟' ||
        person.name === '新姐妹' ||
        person.name === '新配偶' ||
        person.name === '新录族人'
      ) {
        requestAnimationFrame(() => {
          nameInputRef.current?.focus();
          nameInputRef.current?.select();
        });
      }
    } else {
      setFormData(null);
    }
  }, [person, clanSurname]);

  useEffect(() => {
    if (!confirmDeleteSelf) return;
    const timer = setTimeout(() => setConfirmDeleteSelf(false), 2500);
    return () => clearTimeout(timer);
  }, [confirmDeleteSelf]);

  const handleSave = useCallback(() => {
    if (!person || !formData) return;
    const normalized = normalizePersonForSave(formData, allPersons);
    onUpdatePerson(person.id, normalized);
    setFormData(hydratePersonDraft(normalized, clanSurname));
    setIsDirty(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2200);
  }, [person, formData, allPersons, onUpdatePerson, clanSurname]);

  useEffect(() => {
    if (!person) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [person, handleSave]);

  const autoRankLabel = useMemo(
    () => (formData ? computeAutoRankLabel(formData, allPersons) : ''),
    [formData, allPersons]
  );

  if (!person || !formData) return null;

  const isSpouseNode = Boolean(formData.spouseOfId);
  const isRoot = formData.generation === 1 && !isSpouseNode;
  const effectiveSurname = isSpouseNode
    ? formData.surname?.trim() || ''
    : formData.surname?.trim() || clanSurname;
  const headerDisplayName = isSpouseNode
    ? [
        effectiveSurname && !formData.name.startsWith(effectiveSurname)
          ? effectiveSurname
          : '',
        formData.name,
      ].join('') || '配偶'
    : formatGivenName(formData.name, effectiveSurname);
  const isDeceased = formData.status === 'deceased';
  const hasManualRank = Boolean(formData.rank?.trim());

  const markDirty = (updater: (prev: PersonRecord) => PersonRecord) => {
    setFormData((prev) => (prev ? updater(prev) : prev));
    setIsDirty(true);
  };

  const handleFieldChange = <K extends keyof PersonRecord>(
    field: K,
    value: PersonRecord[K]
  ) => {
    markDirty((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenderChange = (nextGender: 'male' | 'female') => {
    markDirty((prev) => {
      if (prev.spouseOfId) {
        const nextRel =
          prev.relationType === '妻子' || prev.relationType === '丈夫' || !prev.relationType
            ? nextGender === 'male'
              ? '丈夫'
              : '妻子'
            : prev.relationType;
        return { ...prev, gender: nextGender, relationType: nextRel };
      }
      let nextRelation = prev.relationType;
      if (nextGender === 'female') {
        if (nextRelation === '继子') nextRelation = '继女';
        else if (nextRelation === '养子') nextRelation = '养女';
        else if (
          nextRelation !== '' &&
          !FEMALE_RELATION_TYPE_OPTIONS.includes(nextRelation || '')
        ) {
          nextRelation = '生女';
        }
      } else {
        if (nextRelation === '继女') nextRelation = '继子';
        else if (nextRelation === '养女') nextRelation = '养子';
        else if (nextRelation === '生女') nextRelation = '生子';
      }
      return { ...prev, gender: nextGender, relationType: nextRelation };
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleFieldChange('avatarUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      style={{ width }}
      className="h-full max-w-[calc(100%-48px)] bg-card border-l border-border flex flex-col overflow-hidden shrink-0 select-none relative z-20"
    >
      {/* 1. Drawer Top Header */}
      <div className="h-13 px-4 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-[hsl(var(--surface-subtle))]">
        <div className="flex items-center gap-2.5 min-w-0">
          {formData.avatarUrl ? (
            <img
              src={formData.avatarUrl}
              alt={headerDisplayName || '族人头像'}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
              {headerDisplayName ? headerDisplayName.slice(-1) : '族'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {headerDisplayName || '未命名'}
              </h3>
              <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap shrink-0">
                · 第 {formData.generation} 世 ·{' '}
                {isSpouseNode
                  ? `${formData.spouseRelationLabel || '配偶'} · `
                  : ''}
                {formData.status === 'living' ? '健在' : '已故'}
              </span>
            </div>
            {isDirty && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                有未保存改动（Ctrl+S 保存）
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {showSavedToast && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium whitespace-nowrap">
              <CheckCircle2 size={12} /> 已保存
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChangeDrawerMode(drawerMode === 'narrow' ? 'wide' : 'narrow')
            }
            className="h-7 px-2 text-[11px] gap-1 whitespace-nowrap shrink-0"
            title={
              drawerMode === 'narrow'
                ? '切换宽版双栏（含实时行传预览）'
                : '切回窄版速编'
            }
          >
            {drawerMode === 'narrow' ? (
              <>
                <Columns2 size={12} />
                <span>宽版预览</span>
              </>
            ) : (
              <>
                <PanelRightClose size={12} />
                <span>窄版速编</span>
              </>
            )}
          </Button>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={onClose}
              title="关闭人物抽屉"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* 2. Main Workspace: Minimalist 4-Batch Form + Optional Wide Live Preview */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          {/* Batch 01: 基本信息 */}
          <section aria-label="基本信息" className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-0.5 h-3.5 rounded-full bg-primary/80 shrink-0" />
                <h4 className="text-xs font-semibold text-foreground tracking-wide">
                  01. 基本信息
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                第 {formData.generation} 世
              </span>
            </div>

            <div className="flex items-start gap-3.5">
              {/* Left Column: 人物头像照片 / 性别 / 状态 */}
              <div className="w-[116px] shrink-0 space-y-3">
                {/* 人物头像照片 */}
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 rounded-lg border border-border bg-[hsl(var(--surface-subtle))] hover:border-primary/60 flex flex-col items-center justify-center overflow-hidden transition-colors cursor-pointer group"
                    title="点击上传或更换头像照片"
                  >
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt={headerDisplayName || '族人头像'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <Camera
                          size={16}
                          className="text-muted-foreground group-hover:text-primary transition-colors mb-1"
                        />
                        <span className="text-[11px] text-muted-foreground">
                          上传照片
                        </span>
                      </>
                    )}
                  </button>
                  {formData.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('avatarUrl', undefined)}
                      title="移除照片"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-card border border-border text-muted-foreground hover:text-destructive flex items-center justify-center text-xs cursor-pointer shadow-[var(--shadow-control)]"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* 性别 RadioGroup */}
                <div>
                  <span className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                    性别
                  </span>
                  <RadioGroup
                    aria-label="性别"
                    value={formData.gender}
                    onValueChange={(val) =>
                      handleGenderChange(val as 'male' | 'female')
                    }
                    className="grid grid-cols-2 gap-1.5"
                  >
                    {(
                      [
                        { value: 'male', label: '男' },
                        { value: 'female', label: '女' },
                      ] as const
                    ).map((opt) => {
                      const active = formData.gender === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => handleGenderChange(opt.value)}
                          className={`h-8 px-2 rounded-md border flex items-center gap-1.5 cursor-pointer transition-colors duration-150 whitespace-nowrap ${
                            active
                              ? 'bg-[hsl(var(--surface-active))] border-primary/50 text-foreground font-semibold'
                              : 'bg-background border-input text-muted-foreground hover:text-foreground hover:border-[hsl(var(--border-strong))]'
                          }`}
                        >
                          <RadioGroupItem
                            value={opt.value}
                            id={`gender-${opt.value}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label
                            htmlFor={`gender-${opt.value}`}
                            className="text-xs cursor-pointer select-none whitespace-nowrap"
                          >
                            {opt.label}
                          </label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>

                {/* 在世状态 RadioGroup */}
                <div>
                  <span className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                    状态
                  </span>
                  <RadioGroup
                    aria-label="状态"
                    value={formData.status}
                    onValueChange={(val) =>
                      handleFieldChange('status', val as 'living' | 'deceased')
                    }
                    className="grid grid-cols-2 gap-1.5"
                  >
                    {(
                      [
                        { value: 'living', label: '健在' },
                        { value: 'deceased', label: '已故' },
                      ] as const
                    ).map((opt) => {
                      const active = formData.status === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => handleFieldChange('status', opt.value)}
                          className={`h-8 px-1.5 rounded-md border flex items-center gap-1 cursor-pointer transition-colors duration-150 whitespace-nowrap ${
                            active
                              ? 'bg-[hsl(var(--surface-active))] border-primary/50 text-foreground font-semibold'
                              : 'bg-background border-input text-muted-foreground hover:text-foreground hover:border-[hsl(var(--border-strong))]'
                          }`}
                        >
                          <RadioGroupItem
                            value={opt.value}
                            id={`status-${opt.value}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label
                            htmlFor={`status-${opt.value}`}
                            className="text-[11px] cursor-pointer select-none whitespace-nowrap"
                          >
                            {opt.label}
                          </label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              </div>

              {/* Right Column: 姓氏/谱名/常用名 + 别名 + 关系/排行 */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* 姓氏 / 谱名 / 常用名 */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label
                      htmlFor="person-surname"
                      className="block text-[11px] font-medium text-muted-foreground mb-1.5 whitespace-nowrap"
                    >
                      姓氏
                    </label>
                    <Input
                      id="person-surname"
                      value={formData.surname || ''}
                      onChange={(e) =>
                        handleFieldChange('surname', e.target.value)
                      }
                      placeholder={
                        isSpouseNode
                          ? '例如：陈'
                          : clanSurname
                            ? `例如：${clanSurname}`
                            : '例如：刘'
                      }
                      className="h-8 text-xs px-2.5"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="person-name"
                      className="block text-[11px] font-medium text-muted-foreground mb-1.5 whitespace-nowrap"
                    >
                      谱名 <span className="text-primary">*</span>
                    </label>
                    <Input
                      ref={nameInputRef}
                      id="person-name"
                      value={formData.name || ''}
                      onChange={(e) =>
                        handleFieldChange('name', e.target.value)
                      }
                      placeholder="例如：伯康"
                      className="h-8 text-xs px-2.5 font-semibold"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="person-legal-name"
                      className="block text-[11px] font-medium text-muted-foreground mb-1.5 whitespace-nowrap"
                    >
                      常用名
                    </label>
                    <Input
                      id="person-legal-name"
                      value={formData.legalName || ''}
                      onChange={(e) =>
                        handleFieldChange('legalName', e.target.value)
                      }
                      placeholder="例如：张伟（选填）"
                      className="h-8 text-xs px-2.5"
                    />
                  </div>
                </div>

                {/* 别名 (bold entered value, light normal placeholder) */}
                <div>
                  <label
                    htmlFor="person-alias"
                    className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                  >
                    别名
                  </label>
                  <Input
                    id="person-alias"
                    name="neNameDesc"
                    autoComplete="off"
                    value={formData.courtesyName || ''}
                    onChange={(e) =>
                      handleFieldChange('courtesyName', e.target.value)
                    }
                    placeholder="字号、小名或谥号，例如：字子安"
                    className="h-8 text-xs px-2.5 font-semibold"
                  />
                </div>

                {/* 关系 / 排行 (支持按性别/配偶切换关系与排行选项) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {isSpouseNode ? (
                    <div data-form-scope="tree">
                      <label
                        htmlFor="fieldSpouseRelation"
                        className="block text-[11px] font-medium text-muted-foreground mb-1.5 whitespace-nowrap"
                      >
                        关系
                      </label>
                      <Select
                        id="fieldSpouseRelation"
                        value={
                          formData.relationType ??
                          (formData.gender === 'male' ? '丈夫' : '妻子')
                        }
                        onChange={(e) =>
                          handleFieldChange(
                            'relationType',
                            e.target.value as PersonRecord['relationType']
                          )
                        }
                      >
                        {SPOUSE_TYPE_OPTIONS.map((opt) => (
                          <option
                            key={opt}
                            value={opt}
                            className="bg-card text-foreground"
                          >
                            {opt}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : (
                    <div data-form-scope="tree">
                      <label
                        htmlFor="fieldChildRelation"
                        className="block text-[11px] font-medium text-muted-foreground mb-1.5 whitespace-nowrap"
                      >
                        关系
                      </label>
                      <Select
                        id="fieldChildRelation"
                        value={
                          formData.relationType ??
                          (formData.gender === 'female' ? '生女' : '生子')
                        }
                        isPlaceholder={formData.relationType === ''}
                        onChange={(e) =>
                          handleFieldChange(
                            'relationType',
                            e.target.value as PersonRecord['relationType']
                          )
                        }
                      >
                        <option value="" className="bg-card text-placeholder">
                          请选择关系
                        </option>
                        {(formData.gender === 'female'
                          ? FEMALE_RELATION_TYPE_OPTIONS
                          : RELATION_TYPE_OPTIONS
                        ).map((rel) => (
                          <option
                            key={rel}
                            value={rel}
                            className="bg-card text-foreground"
                          >
                            {rel}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  {isSpouseNode ? (
                    <div>
                      <label
                        htmlFor="person-spouse-rank"
                        className="block text-[11px] font-medium text-muted-foreground mb-1.5 whitespace-nowrap"
                      >
                        排行
                      </label>
                      <Select
                        id="person-spouse-rank"
                        value={
                          formData.spouseRelationLabel?.trim() ||
                          autoRankLabel ||
                          '原配'
                        }
                        onChange={(e) => {
                          const nextRank = e.target.value;
                          const mappedOrder = SPOUSE_RANK_ORDER[nextRank];
                          markDirty((prev) => ({
                            ...prev,
                            spouseRelationLabel: nextRank,
                            ...(mappedOrder !== undefined
                              ? { siblingOrder: mappedOrder }
                              : {}),
                          }));
                        }}
                      >
                        {formData.spouseRelationLabel &&
                          !(SPOUSE_RANK_OPTIONS as readonly string[]).includes(
                            formData.spouseRelationLabel
                          ) && (
                            <option
                              value={formData.spouseRelationLabel}
                              className="bg-card text-foreground"
                            >
                              {formData.spouseRelationLabel}
                            </option>
                          )}
                        {SPOUSE_RANK_OPTIONS.map((opt) => (
                          <option
                            key={opt}
                            value={opt}
                            className="bg-card text-foreground"
                          >
                            {opt}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <label
                          htmlFor="person-rank"
                          className="text-[11px] font-medium text-muted-foreground whitespace-nowrap"
                        >
                          排行
                        </label>
                        {hasManualRank ? (
                          <button
                            type="button"
                            onClick={() => handleFieldChange('rank', undefined)}
                            className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline cursor-pointer whitespace-nowrap shrink-0"
                            title="清除手动填写，恢复按长幼顺序自动推算"
                          >
                            <RotateCcw size={10} />
                            <span>恢复自动</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/75 whitespace-nowrap shrink-0">
                            自动推算
                          </span>
                        )}
                      </div>
                      <Input
                        id="person-rank"
                        value={formData.rank ?? ''}
                        onChange={(e) =>
                          handleFieldChange('rank', e.target.value)
                        }
                        placeholder={
                          autoRankLabel
                            ? `自动：${autoRankLabel}`
                            : '例如：长子'
                        }
                        className="h-8 text-xs px-2.5"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Batch 02: 出生信息 */}
          <section
            aria-label="出生信息"
            className="space-y-3 pt-4 border-t border-border/70"
          >
            <div className="flex items-center gap-2">
              <span className="w-0.5 h-3.5 rounded-full bg-primary/80 shrink-0" />
              <h4 className="text-xs font-semibold text-foreground tracking-wide">
                02. 出生
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="person-birth-date"
                  className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                >
                  出生时间
                </label>
                <DateInput
                  id="person-birth-date"
                  label="出生日期"
                  value={readGenealogyDate(formData, 'birth')}
                  onChange={(nextVal) =>
                    markDirty((prev) => writeGenealogyDate(prev, 'birth', nextVal))
                  }
                  enableTime
                  enableOriginal
                  placeholder="输入如 1990-05-12，或点右侧选择"
                />
              </div>
              <div>
                <label
                  htmlFor="person-birth-place"
                  className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                >
                  出生地点
                </label>
                <PlaceInput
                  id="person-birth-place"
                  label="出生地点"
                  value={readGenealogyPlace(formData, 'birth')}
                  onChange={(nextVal) =>
                    markDirty((prev) => writeGenealogyPlace(prev, 'birth', nextVal))
                  }
                  clanPersons={allPersons}
                  placeholder="输入省市区县（如 江西泰和），或点右侧细化"
                  detailPlaceholder="例如：澄江镇南溪村"
                />
              </div>
            </div>
          </section>

          {/* Batch 03: 去世信息 (仅当状态为已故时显示) */}
          {isDeceased && (
            <section
              aria-label="去世信息"
              className="space-y-3 pt-4 border-t border-border/70"
            >
              <div className="flex items-center gap-2">
                <span className="w-0.5 h-3.5 rounded-full bg-primary/80 shrink-0" />
                <h4 className="text-xs font-semibold text-foreground tracking-wide">
                  03. 去世
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="person-death-date"
                    className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                  >
                    去世时间
                  </label>
                  <DateInput
                    id="person-death-date"
                    label="去世日期"
                    value={readGenealogyDate(formData, 'death')}
                    onChange={(nextVal) =>
                      markDirty((prev) => writeGenealogyDate(prev, 'death', nextVal))
                    }
                    enableTime
                    enableOriginal
                    placeholder="输入如 1990-05-12，或点右侧选择"
                  />
                </div>
                <div>
                  <label
                    htmlFor="person-death-place"
                    className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                  >
                    去世地点
                  </label>
                  <PlaceInput
                    id="person-death-place"
                    label="去世地点"
                    value={readGenealogyPlace(formData, 'death')}
                    onChange={(nextVal) =>
                      markDirty((prev) => writeGenealogyPlace(prev, 'death', nextVal))
                    }
                    clanPersons={allPersons}
                    placeholder="输入省市区县或祖茔山名，点右侧细化"
                    detailPlaceholder="例如：狮子山金钗穴，坐北朝南 / 县人民医院"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Batch 04 (or 03 when living): 学历与工作 */}
          <section
            aria-label="学历与工作"
            className="space-y-3 pt-4 border-t border-border/70"
          >
            <div className="flex items-center gap-2">
              <span className="w-0.5 h-3.5 rounded-full bg-primary/80 shrink-0" />
              <h4 className="text-xs font-semibold text-foreground tracking-wide">
                {isDeceased ? '04. 学历与工作' : '03. 学历与工作'}
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="person-education"
                  className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                >
                  学历
                </label>
                <Select
                  id="person-education"
                  value={formData.career?.educationLevel || ''}
                  isPlaceholder={!formData.career?.educationLevel}
                  onChange={(e) =>
                    markDirty((prev) => ({
                      ...prev,
                      career: {
                        ...(prev.career || {}),
                        educationLevel: e.target.value,
                      },
                    }))
                  }
                >
                  <option value="" className="bg-card text-placeholder">
                    请选择学历（选填）
                  </option>
                  {EDUCATION_LEVEL_OPTIONS.map((lv) => (
                    <option
                      key={lv}
                      value={lv}
                      className="bg-card text-foreground"
                    >
                      {lv}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label
                  htmlFor="person-profession"
                  className="block text-[11px] font-medium text-muted-foreground mb-1.5"
                >
                  工作
                </label>
                <Input
                  id="person-profession"
                  value={formData.career?.profession || ''}
                  onChange={(e) =>
                    markDirty((prev) => ({
                      ...prev,
                      career: {
                        ...(prev.career || {}),
                        profession: e.target.value,
                      },
                    }))
                  }
                  placeholder="例如：中学高级教师 / 县医院外科"
                  className="h-8 text-xs px-2.5"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Live Biography Preview Column (Rendered in Wide Mode) */}
        {drawerMode === 'wide' && (
          <BiographyLivePreview
            draft={formData}
            allPersons={allPersons}
            clanSurname={clanSurname}
            prefs={previewPrefs}
            onUpdatePrefs={onUpdatePreviewPrefs}
          />
        )}
      </div>

      {/* 3. Sticky Drawer Footer Actions */}
      <div className="px-4 h-13 border-t border-border bg-[hsl(var(--surface-subtle))] flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1 whitespace-nowrap shrink-0"
            onClick={() => {
              if (isDirty) handleSave();
              onAddChild(formData.spouseOfId || person.id);
            }}
          >
            <Plus size={12} /> 添子
          </Button>
          {!isSpouseNode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs gap-1 whitespace-nowrap shrink-0"
              onClick={() => {
                if (isDirty) handleSave();
                onAddSpouse(person.id);
              }}
            >
              <Heart size={12} /> 添加配偶
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isRoot && (
            <Button
              type="button"
              variant={confirmDeleteSelf ? 'destructive' : 'ghost'}
              size="sm"
              className={
                confirmDeleteSelf
                  ? 'h-8 px-2.5 text-xs whitespace-nowrap shrink-0'
                  : 'h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0'
              }
              onClick={() => {
                if (confirmDeleteSelf) {
                  setConfirmDeleteSelf(false);
                  onDeletePerson(person.id);
                } else {
                  setConfirmDeleteSelf(true);
                }
              }}
              title={confirmDeleteSelf ? '再次点击确认删除' : '删除该族人'}
            >
              {confirmDeleteSelf ? (
                <>
                  <Check size={12} className="mr-1" /> 确认删除
                </>
              ) : (
                <Trash2 size={13} />
              )}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="h-8 px-3.5 text-xs gap-1.5 whitespace-nowrap shrink-0"
            onClick={handleSave}
          >
            <Save size={13} />
            <span>{isDirty ? '保存人物信息 *' : '保存人物信息'}</span>
            <kbd className="hidden md:inline-flex items-center px-1 py-0.5 rounded bg-primary-foreground/15 text-[10px] font-medium tabular-nums">
              Ctrl+S
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  );
};
