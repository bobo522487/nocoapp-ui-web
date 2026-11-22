import React, { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { User, X } from 'lucide-react';
import { Select } from '../../../components/ui/select';
import { cn } from '../../../lib/utils';
import type { GenealogyDate } from '../../date-input/date.types';
import { PersonRecord, RelationKind } from '../types';
import {
  FEMALE_RELATION_TYPE_OPTIONS,
  RELATION_TYPE_OPTIONS,
  getDerivedSpouses,
} from '../utils/personHelpers';
import {
  extractYearLabel,
  resolvePersonDisplayName,
} from '../utils/personTimeline';

interface ParentChildRelationModalProps {
  childPerson: PersonRecord | null;
  allPersons: PersonRecord[];
  clanSurname?: string;
  onClose: () => void;
  onSave: (childId: string, updates: Partial<PersonRecord>) => void;
}

function formatLifespanYear(structuredDate?: GenealogyDate | null): string {
  const label = extractYearLabel(structuredDate).trim();
  if (!label) return '';
  return /^-?\d+$/.test(label) ? `${label}年` : label;
}

function formatShortLifespan(p: PersonRecord): string {
  const birth = formatLifespanYear(p.birth?.structuredDate);
  const death =
    p.status === 'living'
      ? '存'
      : formatLifespanYear(p.death?.structuredDate) || '歿';
  if (birth) return `${birth}–${death}`;
  if (death !== '存' && death !== '歿') return `–${death}`;
  return death;
}

function getRelationOptionsForChild(
  gender: 'male' | 'female' | 'unknown'
): RelationKind[] {
  if (gender === 'female') {
    const merged: RelationKind[] = [
      ...FEMALE_RELATION_TYPE_OPTIONS,
      '过继',
      '出继',
      '承继',
      '抚子',
      '无(断代)',
    ];
    return Array.from(new Set(merged));
  }
  return RELATION_TYPE_OPTIONS;
}

export const ParentChildRelationModal: React.FC<
  ParentChildRelationModalProps
> = ({ childPerson, allPersons, clanSurname = '', onClose, onSave }) => {
  const titleId = useId();
  const fatherRelationId = useId();
  const motherSelectId = useId();
  const motherRelationId = useId();

  const [selectedMotherId, setSelectedMotherId] = useState<string>('');
  const [fatherRelationType, setFatherRelationType] =
    useState<RelationKind>('生子');
  const [motherRelationType, setMotherRelationType] =
    useState<RelationKind>('生子');

  const isOpen = Boolean(childPerson);

  const fatherRecord = useMemo(() => {
    if (!childPerson?.fatherId) return null;
    return allPersons.find((p) => p.id === childPerson.fatherId) || null;
  }, [allPersons, childPerson?.fatherId]);

  const motherOptions = useMemo(() => {
    if (!fatherRecord) return [];
    return getDerivedSpouses(allPersons, fatherRecord.id);
  }, [allPersons, fatherRecord]);

  const relationOptions = useMemo(() => {
    if (!childPerson) return RELATION_TYPE_OPTIONS;
    const base = getRelationOptionsForChild(childPerson.gender);
    const extras = [
      childPerson.fatherRelationType,
      childPerson.motherRelationType,
      childPerson.relationType,
    ].filter((item): item is RelationKind => Boolean(item?.trim()));
    return Array.from(new Set([...base, ...extras]));
  }, [childPerson]);

  useEffect(() => {
    if (!childPerson) return;
    const defaultRel: RelationKind =
      childPerson.gender === 'female' ? '生女' : '生子';
    setFatherRelationType(
      childPerson.fatherRelationType || childPerson.relationType || defaultRel
    );
    setMotherRelationType(
      childPerson.motherRelationType || childPerson.relationType || defaultRel
    );
    const initialMotherId =
      childPerson.motherId ||
      (motherOptions.length === 1 ? motherOptions[0].id : '');
    setSelectedMotherId(initialMotherId);
  }, [childPerson, motherOptions]);

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

  if (!isOpen || !childPerson) return null;

  const childDisplayName = resolvePersonDisplayName(childPerson, clanSurname);
  const fatherDisplayName = fatherRecord
    ? resolvePersonDisplayName(fatherRecord, clanSurname)
    : '未关联父亲';
  const defaultBioRel: RelationKind =
    childPerson.gender === 'female' ? '生女' : '生子';

  const selectedMotherRecord = motherOptions.find(
    (m) => m.id === selectedMotherId
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedPrimaryRel =
      fatherRelationType !== defaultBioRel
        ? fatherRelationType
        : motherRelationType !== defaultBioRel
          ? motherRelationType
          : fatherRelationType;

    onSave(childPerson.id, {
      motherId: selectedMotherId || undefined,
      fatherRelationType,
      motherRelationType,
      relationType: resolvedPrimaryRel,
    });
    onClose();
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
        className="w-full max-w-[680px] max-h-[90vh] flex flex-col overflow-hidden rounded-[12px] bg-white dark:bg-[#1E2329] text-[#212225] dark:text-slate-100 border border-[#D8DADA] dark:border-slate-700/80 shadow-[0_14px_38px_rgba(0,0,0,0.22),0_4px_12px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 bg-[#F5F6F6] dark:bg-[#252B33] border-b border-[#E0E2E2] dark:border-slate-700/80 px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[20px] font-bold leading-snug text-[#212225] dark:text-slate-100 truncate"
            >
              编辑父母关系
            </h2>
            <div className="text-[13px] text-[#56585A] dark:text-slate-400 truncate mt-0.5">
              子女：{childDisplayName}
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

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col min-h-0"
          noValidate
        >
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
              {/* Left Column: Father & Father Relation */}
              <div className="min-w-0 flex flex-col gap-4">
                <div>
                  <div className={labelClass}>父亲</div>
                  <div className="flex items-center gap-3 rounded-[8px] border border-[#2097B7]/25 dark:border-[#3E9EB8]/30 bg-[#2097B7]/[0.06] dark:bg-[#3E9EB8]/[0.10] px-3.5 py-2.5 min-h-[68px]">
                    <div
                      aria-hidden="true"
                      className="w-10 h-10 rounded-full overflow-hidden border border-[#2097B7]/30 dark:border-[#3E9EB8]/35 bg-[#2097B7]/12 dark:bg-[#3E9EB8]/20 text-[#057091] dark:text-[#6EC2DB] flex items-center justify-center shrink-0 text-[13px] font-semibold"
                    >
                      {fatherRecord?.avatarUrl ? (
                        <img
                          src={fatherRecord.avatarUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : fatherRecord ? (
                        <span>{fatherDisplayName.slice(0, 1)}</span>
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[#212225] dark:text-slate-100 truncate">
                        {fatherDisplayName}
                      </div>
                      {fatherRecord && (
                        <div className="text-[12px] text-[#56585A] dark:text-slate-400 truncate tabular-nums mt-0.5">
                          {formatShortLifespan(fatherRecord)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <label htmlFor={fatherRelationId} className={labelClass}>
                    与父亲的关系
                  </label>
                  <Select
                    id={fatherRelationId}
                    value={fatherRelationType}
                    onChange={(e) =>
                      setFatherRelationType(e.target.value as RelationKind)
                    }
                    className={controlInputClass}
                  >
                    {relationOptions.map((rel) => (
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
              </div>

              {/* Right Column: Mother & Mother Relation */}
              <div className="min-w-0 flex flex-col gap-4">
                <div>
                  <label htmlFor={motherSelectId} className={labelClass}>
                    母亲
                  </label>
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-[8px] border px-3.5 py-2.5 min-h-[68px]',
                      selectedMotherRecord
                        ? 'border-[#ED5481]/25 dark:border-[#D16686]/30 bg-[#ED5481]/[0.06] dark:bg-[#D16686]/[0.10]'
                        : 'border-[#D8DADA] dark:border-slate-600/80 bg-[#F4F5F6] dark:bg-[#272D36]'
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className={cn(
                        'w-10 h-10 rounded-full overflow-hidden border flex items-center justify-center shrink-0 text-[13px] font-semibold',
                        selectedMotherRecord
                          ? 'border-[#ED5481]/30 dark:border-[#D16686]/35 bg-[#ED5481]/12 dark:bg-[#D16686]/20 text-[#B6335A] dark:text-[#E590AA]'
                          : 'border-[#D0D2D4] dark:border-slate-600 bg-white dark:bg-slate-800 text-[#56585A] dark:text-slate-400'
                      )}
                    >
                      {selectedMotherRecord?.avatarUrl ? (
                        <img
                          src={selectedMotherRecord.avatarUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : selectedMotherRecord ? (
                        <span>
                          {resolvePersonDisplayName(
                            selectedMotherRecord,
                            clanSurname
                          ).slice(0, 1)}
                        </span>
                      ) : (
                        <User size={16} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Select
                        id={motherSelectId}
                        value={selectedMotherId}
                        onChange={(e) => setSelectedMotherId(e.target.value)}
                        className="h-7 -mx-1.5 px-1.5 pr-7 rounded-[5px] border-transparent bg-transparent dark:bg-transparent shadow-none text-[14px] font-semibold text-[#212225] dark:text-slate-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      >
                        <option value="" className="bg-card text-foreground">
                          不详 / 未指定
                        </option>
                        {motherOptions.map((m) => (
                          <option
                            key={m.id}
                            value={m.id}
                            className="bg-card text-foreground"
                          >
                            {resolvePersonDisplayName(m, clanSurname)}
                          </option>
                        ))}
                      </Select>
                      {selectedMotherRecord && (
                        <div className="text-[12px] text-[#56585A] dark:text-slate-400 truncate tabular-nums mt-0.5">
                          {formatShortLifespan(selectedMotherRecord)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <label htmlFor={motherRelationId} className={labelClass}>
                    与母亲的关系
                  </label>
                  <Select
                    id={motherRelationId}
                    value={motherRelationType}
                    onChange={(e) =>
                      setMotherRelationType(e.target.value as RelationKind)
                    }
                    className={controlInputClass}
                  >
                    {relationOptions.map((rel) => (
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
              </div>
            </div>
          </div>

          {/* Fixed 72px Footer */}
          <div className="h-[72px] shrink-0 px-6 border-t border-[#E0E2E2] dark:border-slate-700/80 bg-white dark:bg-[#1E2329] flex items-center justify-end gap-3">
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
              保存关系
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalNode;
  return createPortal(modalNode, document.body);
};
