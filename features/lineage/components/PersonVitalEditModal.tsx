import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { PersonRecord } from '../types';
import { parseAliasList } from '../utils/personHelpers';

export type VitalQuickEditField = 'name' | 'gender' | null;

interface PersonVitalEditModalProps {
  field: VitalQuickEditField;
  person: PersonRecord | null;
  clanSurname?: string;
  onClose: () => void;
  onSave: (updates: Partial<PersonRecord>) => void;
}

interface BlueRadioOptionProps {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}

const BlueRadioOption: React.FC<BlueRadioOptionProps> = ({
  name,
  value,
  checked,
  label,
  onChange,
}) => (
  <label
    className={cn(
      'inline-flex items-center gap-2.5 cursor-pointer select-none py-1.5 pr-4 text-[14px] transition-colors',
      checked
        ? 'text-[#212225] dark:text-slate-100 font-medium'
        : 'text-[#4D5053] dark:text-slate-300 hover:text-[#212225] dark:hover:text-slate-100'
    )}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    <span
      aria-hidden="true"
      className={cn(
        'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
        checked
          ? 'border-[#057091] bg-white dark:bg-slate-900'
          : 'border-[#737679] dark:border-slate-500 bg-white dark:bg-slate-900'
      )}
    >
      {checked && (
        <span className="w-[9px] h-[9px] rounded-full bg-[#057091]" />
      )}
    </span>
    <span>{label}</span>
  </label>
);

export const PersonVitalEditModal: React.FC<PersonVitalEditModalProps> = ({
  field,
  person,
  clanSurname = '',
  onClose,
  onSave,
}) => {
  const titleId = useId();
  const [surname, setSurname] = useState('');
  const [name, setName] = useState('');
  const [romSurname, setRomSurname] = useState('');
  const [romName, setRomName] = useState('');
  const [aliasesText, setAliasesText] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('male');
  const [nameError, setNameError] = useState<string | null>(null);

  const isOpen = Boolean(field && person);

  useEffect(() => {
    if (!field || !person) return;
    setSurname(
      person.spouseOfId
        ? person.surname || ''
        : person.surname || clanSurname || ''
    );
    setName(person.name || '');
    setRomSurname(person.romanizedName?.surname || '');
    setRomName(person.romanizedName?.name || '');
    const aliasList = parseAliasList(person.aliases, person.courtesyName);
    setAliasesText(aliasList.join('、'));
    setGender(person.gender || 'unknown');
    setNameError(null);
  }, [field, person, clanSurname]);

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

  if (!isOpen || !person || !field) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (field === 'name') {
      const cleanName = name.trim();
      const cleanSurname = surname.trim();
      if (!cleanName && !cleanSurname) {
        setNameError('请填写姓氏或名字');
        return;
      }
      const parsedAliases = Array.from(
        new Set(
          aliasesText
            .split(/[、,，;；]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );
      const rSur = romSurname.trim();
      const rNam = romName.trim();
      onSave({
        surname: cleanSurname || undefined,
        name: cleanName || cleanSurname,
        romanizedName:
          rSur || rNam
            ? {
                ...(rSur ? { surname: rSur } : {}),
                ...(rNam ? { name: rNam } : {}),
              }
            : undefined,
        aliases: parsedAliases.length > 0 ? parsedAliases : undefined,
        courtesyName:
          parsedAliases.length > 0 ? parsedAliases.join('、') : undefined,
      });
      onClose();
      return;
    }

    if (field === 'gender') {
      let nextRelation = person.relationType;
      if (person.spouseOfId) {
        nextRelation =
          gender === 'male'
            ? '丈夫'
            : gender === 'female'
              ? '妻子'
              : '配偶';
      } else if (gender === 'female') {
        if (nextRelation === '继子') nextRelation = '继女';
        else if (nextRelation === '养子') nextRelation = '养女';
        else if (nextRelation === '生子' || !nextRelation)
          nextRelation = '生女';
      } else if (gender === 'male') {
        if (nextRelation === '继女') nextRelation = '继子';
        else if (nextRelation === '养女') nextRelation = '养子';
        else if (nextRelation === '生女' || !nextRelation)
          nextRelation = '生子';
      }
      onSave({
        gender,
        relationType: nextRelation,
      });
      onClose();
    }
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
        className="w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden rounded-[12px] bg-white dark:bg-[#1E2329] text-[#212225] dark:text-slate-100 border border-[#D8DADA] dark:border-slate-700/80 shadow-[0_14px_38px_rgba(0,0,0,0.22),0_4px_12px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 bg-[#F5F6F6] dark:bg-[#252B33] border-b border-[#E0E2E2] dark:border-slate-700/80 px-6 py-4 flex items-center justify-between gap-4">
          <h2
            id={titleId}
            className="text-[20px] font-bold leading-snug text-[#212225] dark:text-slate-100"
          >
            {field === 'name' ? '编辑名称' : '编辑性别'}
          </h2>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#56585A] dark:text-slate-400 hover:bg-[#E4E6E6] dark:hover:bg-slate-700/70 hover:text-[#212225] dark:hover:text-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {/* 3px Blue-Teal Strip */}
        <div
          className="h-[3px] w-full bg-[#057091] shrink-0"
          aria-hidden="true"
        />

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
            {field === 'name' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>姓氏</label>
                    <Input
                      value={surname}
                      onChange={(e) => {
                        setSurname(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      placeholder="如：陈"
                      className={controlInputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      名字 <span className="text-[#C93B3B] ml-0.5">*</span>
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      placeholder="请输入名字"
                      className={controlInputClass}
                    />
                  </div>
                </div>

                {nameError && (
                  <p className="-mt-3 text-[12px] text-[#C93B3B] font-medium">
                    {nameError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>罗马字 / 拼音姓氏</label>
                    <Input
                      value={romSurname}
                      onChange={(e) => setRomSurname(e.target.value)}
                      placeholder="如：Chen"
                      className={controlInputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>罗马字 / 拼音名字</label>
                    <Input
                      value={romName}
                      onChange={(e) => setRomName(e.target.value)}
                      placeholder="如：Xingshu"
                      className={controlInputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>字 / 号 / 别名</label>
                  <Input
                    value={aliasesText}
                    onChange={(e) => setAliasesText(e.target.value)}
                    placeholder="多个别名请用顿号或逗号分隔，如：字伯宣、号清溪"
                    className={controlInputClass}
                  />
                </div>
              </>
            ) : (
              <div>
                <div className={labelClass}>性别</div>
                <div
                  role="radiogroup"
                  aria-label="性别"
                  className="flex flex-wrap items-center gap-4 pt-1"
                >
                  <BlueRadioOption
                    name="vital-edit-gender"
                    value="male"
                    checked={gender === 'male'}
                    label="男"
                    onChange={() => setGender('male')}
                  />
                  <BlueRadioOption
                    name="vital-edit-gender"
                    value="female"
                    checked={gender === 'female'}
                    label="女"
                    onChange={() => setGender('female')}
                  />
                  <BlueRadioOption
                    name="vital-edit-gender"
                    value="unknown"
                    checked={gender === 'unknown'}
                    label="未知"
                    onChange={() => setGender('unknown')}
                  />
                </div>
              </div>
            )}
          </div>

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
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalNode;
  return createPortal(modalNode, document.body);
};
