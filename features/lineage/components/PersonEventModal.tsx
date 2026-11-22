import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../lib/utils';
import { DateInput, type GenealogyDate } from '../../date-input';
import { PlaceInput, type GenealogyPlace } from '../../place-input';
import { PersonEventType, PersonRecord } from '../types';
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
  const dateInputId = useId();
  const placeInputId = useId();
  const descInputId = useId();

  const [eventType, setEventType] = useState<PersonEventType>('career');
  const [structuredDate, setStructuredDate] = useState<GenealogyDate | null>(
    null
  );
  const [structuredPlace, setStructuredPlace] =
    useState<GenealogyPlace | null>(null);
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOpen = Boolean(context);

  useEffect(() => {
    if (!context) return;
    const init = context.initialEvent;
    setEventType(init.type);
    setStructuredDate(init.structuredDate ?? null);
    setStructuredPlace(init.structuredPlace ?? null);
    setDescription(init.description || '');
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
      context.sourceKind === 'marriage_node');

  const typeLabel = EVENT_TYPE_LABELS[eventType] || '事件';
  const modalTitle =
    context.mode === 'create' ? '添加生平事件' : `编辑${typeLabel}事件`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(context, {
      type: eventType,
      structuredDate,
      structuredPlace,
      description,
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

        {/* Uniform 4-Field Event Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col min-h-0"
          noValidate
        >
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
            {/* 1. 事件类型 */}
            <div>
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
                  onChange={setStructuredDate}
                  enableTime
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
                  onChange={setStructuredPlace}
                  clanPersons={allPersons}
                  placeholder="输入省市区县或原始地名，或点右侧选择"
                  className={controlInputClass}
                />
              </div>
            </div>

            {/* 4. 描述 */}
            <div>
              <label htmlFor={descInputId} className={labelClass}>
                描述
              </label>
              <Textarea
                id={descInputId}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="填写该事件的经过、学校/单位/职衔、功名或谱牒记述..."
                className="min-h-[108px] text-[14px] p-3 leading-relaxed rounded-[6px] border-input bg-card shadow-[var(--shadow-control)]"
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
