import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../lib/utils';
import { DateInput, type GenealogyDate } from '../../date-input';
import { PlaceInput, type GenealogyPlace } from '../../place-input';
import { PersonEventType, PersonRecord } from '../types';
import { EDUCATION_LEVEL_OPTIONS } from '../utils/personHelpers';
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_OPTIONS,
  EventEditContext,
  UnifiedEventSubmitPayload,
} from '../utils/personTimeline';

interface PersonEventModalProps {
  context: EventEditContext | null;
  personDisplayName: string;
  allPersons: PersonRecord[];
  onClose: () => void;
  onSubmit: (
    context: EventEditContext,
    payload: UnifiedEventSubmitPayload
  ) => void;
  onDelete?: (context: EventEditContext) => void;
}

export const PersonEventModal: React.FC<PersonEventModalProps> = ({
  context,
  personDisplayName,
  allPersons,
  onClose,
  onSubmit,
  onDelete,
}) => {
  const titleId = useId();
  const typeSelectId = useId();
  const customLabelId = useId();
  const dateInputId = useId();
  const placeInputId = useId();
  const descInputId = useId();

  const [eventType, setEventType] = useState<PersonEventType>('other');
  const [customTypeLabel, setCustomTypeLabel] = useState('');
  const [structuredDate, setStructuredDate] = useState<GenealogyDate | null>(
    null
  );
  const [structuredPlace, setStructuredPlace] =
    useState<GenealogyPlace | null>(null);
  const [description, setDescription] = useState('');

  // Optional contextual sub-fields
  const [statusOverride, setStatusOverride] = useState<'living' | 'deceased'>(
    'deceased'
  );
  const [deathCause, setDeathCause] = useState('');
  const [organization, setOrganization] = useState('');
  const [position, setPosition] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [relatedPersonId, setRelatedPersonId] = useState('');
  const [relatedPersonName, setRelatedPersonName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOpen = Boolean(context);

  useEffect(() => {
    if (!context) return;
    const init = context.initialEvent;
    setEventType(init.type);
    setCustomTypeLabel(init.customTypeLabel || '');
    setStructuredDate(init.structuredDate ?? null);
    setStructuredPlace(init.structuredPlace ?? null);
    setDescription(init.description || '');
    setStatusOverride(init.statusOverride || 'deceased');
    setDeathCause(init.deathCause || '');
    setOrganization(init.organization || '');
    setPosition(init.position || '');
    setEducationLevel(init.educationLevel || '');
    setRelatedPersonId(init.relatedPersonId || '');
    setRelatedPersonName(init.relatedPersonName || '');
    setConfirmDelete(false);
  }, [context]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!context) return null;

  const isTypeLocked =
    context.mode === 'edit' &&
    (context.sourceKind === 'birth' ||
      context.sourceKind === 'child_birth' ||
      context.sourceKind === 'death' ||
      context.sourceKind === 'burial' ||
      context.sourceKind === 'education' ||
      context.sourceKind === 'career' ||
      context.sourceKind === 'marriage_node' ||
      context.sourceKind === 'marriage_legacy');

  const typeLabel = EVENT_TYPE_LABELS[eventType] || '事件';
  const modalTitle =
    context.mode === 'create' ? '添加生平事件' : `编辑${typeLabel}事件`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(context, {
      type: eventType,
      customTypeLabel:
        eventType === 'other' ? customTypeLabel.trim() || undefined : undefined,
      structuredDate,
      structuredPlace,
      description,
      statusOverride: eventType === 'death' ? statusOverride : undefined,
      deathCause: eventType === 'death' ? deathCause : undefined,
      organization:
        eventType === 'education' || eventType === 'career'
          ? organization
          : undefined,
      position: eventType === 'career' ? position : undefined,
      educationLevel: eventType === 'education' ? educationLevel : undefined,
      relatedPersonId:
        eventType === 'marriage' ? relatedPersonId || undefined : undefined,
      relatedPersonName:
        eventType === 'marriage' ? relatedPersonName || undefined : undefined,
    });
  };

  const controlInputClass =
    'h-10 rounded-[6px] border-input bg-card text-[14px] text-foreground placeholder:text-placeholder hover:border-[hsl(var(--border-strong))] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:shadow-[var(--shadow-focus-halo)] shadow-[var(--shadow-control)]';

  const labelClass =
    'block text-[13px] font-semibold text-[#212225] dark:text-slate-200 mb-1.5';

  const modalNode = (
    <div
      className="fs-lineage-theme fixed inset-0 z-[96] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[720px] max-h-[90vh] flex flex-col overflow-hidden rounded-[12px] bg-white dark:bg-[#1E2329] text-[#212225] dark:text-slate-100 border border-[#D8DADA] dark:border-slate-700/80 shadow-[0_14px_38px_rgba(0,0,0,0.22),0_4px_12px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 bg-[#F5F6F6] dark:bg-[#252B33] border-b border-[#E0E2E2] dark:border-slate-700/80 px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[20px] font-bold leading-snug text-[#212225] dark:text-slate-100 truncate"
            >
              {modalTitle}
            </h2>
            <div className="text-[13px] text-[#56585A] dark:text-slate-400 truncate mt-0.5">
              人物：{personDisplayName}
            </div>
          </div>

          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#56585A] dark:text-slate-400 hover:bg-[#E4E6E6] dark:hover:bg-slate-700/70 hover:text-[#212225] dark:hover:text-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* 3px Blue-Teal Accent Strip */}
        <div
          className="h-[3px] w-full bg-[#057091] shrink-0"
          aria-hidden="true"
        />

        {/* Unified Event Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col min-h-0"
          noValidate
        >
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
            {/* 1. 事件类型 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div
                className={
                  eventType === 'other' ? 'sm:col-span-6' : 'sm:col-span-12'
                }
              >
                <label htmlFor={typeSelectId} className={labelClass}>
                  事件类型 <span className="text-[#C93B3B] ml-0.5">*</span>
                </label>
                <Select
                  id={typeSelectId}
                  value={eventType}
                  disabled={isTypeLocked}
                  onChange={(e) =>
                    setEventType(e.target.value as PersonEventType)
                  }
                  className={cn(
                    controlInputClass,
                    isTypeLocked ? 'opacity-80 cursor-not-allowed' : ''
                  )}
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="bg-card text-foreground"
                    >
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              {eventType === 'other' && (
                <div className="sm:col-span-6">
                  <label htmlFor={customLabelId} className={labelClass}>
                    自定义事件标题
                  </label>
                  <Input
                    id={customLabelId}
                    value={customTypeLabel}
                    onChange={(e) => setCustomTypeLabel(e.target.value)}
                    placeholder="如：入赘、立嗣、著述、建祠"
                    className={controlInputClass}
                  />
                </div>
              )}
            </div>

            {/* 2. 日期 & 3. 地点 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-5">
                <label htmlFor={dateInputId} className={labelClass}>
                  日期
                </label>
                <DateInput
                  id={dateInputId}
                  label="事件日期"
                  value={structuredDate}
                  onChange={(nextDate) => {
                    setStructuredDate(nextDate);
                    if (
                      eventType === 'death' &&
                      nextDate &&
                      statusOverride === 'living'
                    ) {
                      setStatusOverride('deceased');
                    }
                  }}
                  enableTime={
                    eventType === 'birth' || eventType === 'death'
                  }
                  enableOriginal
                  placeholder="如 1977-02-21，或点右侧选择"
                  className={controlInputClass}
                />
              </div>

              <div className="sm:col-span-7">
                <label htmlFor={placeInputId} className={labelClass}>
                  地点
                </label>
                <PlaceInput
                  id={placeInputId}
                  label="事件地点"
                  value={structuredPlace}
                  onChange={(nextPlace) => {
                    setStructuredPlace(nextPlace);
                    if (
                      eventType === 'death' &&
                      nextPlace &&
                      statusOverride === 'living'
                    ) {
                      setStatusOverride('deceased');
                    }
                  }}
                  clanPersons={allPersons}
                  placeholder="输入省市区县或原始地名，或点右侧选择"
                  className={controlInputClass}
                />
              </div>
            </div>

            {/* Contextual sub-fields cleanly aligned when relevant */}
            {eventType === 'education' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7">
                  <label className={labelClass}>学校 / 书院名称</label>
                  <Input
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="如：贵州大学、县立小学"
                    className={controlInputClass}
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className={labelClass}>学历</label>
                  <Select
                    value={educationLevel}
                    isPlaceholder={!educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                    className={controlInputClass}
                  >
                    <option value="">请选择学历</option>
                    {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            {eventType === 'career' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7">
                  <label className={labelClass}>单位 / 机构</label>
                  <Input
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="如：省档案馆、礼部"
                    className={controlInputClass}
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className={labelClass}>职务 / 功名</label>
                  <Input
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="如：研究员、岁贡生"
                    className={controlInputClass}
                  />
                </div>
              </div>
            )}

            {eventType === 'marriage' && (
              <div>
                <label className={labelClass}>配偶姓名</label>
                <Input
                  value={relatedPersonName}
                  onChange={(e) => setRelatedPersonName(e.target.value)}
                  disabled={
                    context.sourceKind === 'marriage_node' ||
                    context.sourceKind === 'marriage_legacy'
                  }
                  placeholder="填写结婚对象姓名"
                  className={cn(
                    controlInputClass,
                    context.sourceKind === 'marriage_node' ||
                      context.sourceKind === 'marriage_legacy'
                      ? 'opacity-80'
                      : ''
                  )}
                />
              </div>
            )}

            {eventType === 'death' && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-5">
                  <label className={labelClass}>在世状态</label>
                  <Select
                    value={statusOverride}
                    onChange={(e) =>
                      setStatusOverride(
                        e.target.value as 'living' | 'deceased'
                      )
                    }
                    className={controlInputClass}
                  >
                    <option value="deceased">已故（歿）</option>
                    <option value="living">在世（存）</option>
                  </Select>
                </div>
                {statusOverride === 'deceased' && (
                  <div className="sm:col-span-7">
                    <label className={labelClass}>死亡原因</label>
                    <Input
                      value={deathCause}
                      onChange={(e) => setDeathCause(e.target.value)}
                      placeholder="如：寿终正寝、病逝"
                      className={controlInputClass}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 4. 描述 */}
            <div>
              <label htmlFor={descInputId} className={labelClass}>
                描述
              </label>
              <Textarea
                id={descInputId}
                rows={3}
                value={description}
                onChange={(e) => {
                  const val = e.target.value;
                  setDescription(val);
                  if (
                    eventType === 'death' &&
                    val.trim() &&
                    statusOverride === 'living'
                  ) {
                    setStatusOverride('deceased');
                  }
                }}
                placeholder="填写该事件的详细背景、经过或谱牒记述..."
                className="min-h-[92px] text-[14px] p-3 leading-relaxed rounded-[6px] border-input bg-card shadow-[var(--shadow-control)]"
              />
            </div>
          </div>

          {/* Fixed 72px Footer */}
          <div className="h-[72px] shrink-0 px-6 border-t border-[#E0E2E2] dark:border-slate-700/80 bg-white dark:bg-[#1E2329] flex items-center justify-between gap-3">
            <div>
              {context.mode === 'edit' && context.canDelete && onDelete && (
                !confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[6px] text-[13px] font-medium text-[#C93B3B] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>删除事件</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDelete(context)}
                      className="h-9 px-3 rounded-[6px] text-[13px] font-semibold text-white bg-[#C93B3B] hover:bg-[#B02E2E] cursor-pointer"
                    >
                      确认删除
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="h-9 px-2.5 rounded-[6px] text-[13px] text-[#56585A] hover:bg-[#F5F6F6] dark:hover:bg-slate-800 cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 rounded-[6px] text-[14px] font-semibold text-[#057091] dark:text-[#58B1CD] hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/20 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="h-10 px-6 rounded-[6px] text-[14px] font-semibold bg-[#057091] hover:bg-[#045B76] active:bg-[#034C63] text-white shadow-xs transition-colors cursor-pointer"
              >
                保存事件
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalNode;
  return createPortal(modalNode, document.body);
};
