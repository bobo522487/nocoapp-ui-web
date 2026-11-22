import React, { useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, User, X } from 'lucide-react';
import { formatGenealogyDate } from '../../date-input/date-format';
import { formatGenealogyPlace } from '../../place-input';
import { PersonRecord } from '../types';
import { computeAutoRankLabel, parseAliasList } from '../utils/personHelpers';
import {
  EVENT_TYPE_LABELS,
  buildImmediateFamilyGroups,
  calculateAgeDisplay,
  formatHeaderBirthLine,
  resolvePersonDisplayName,
  resolvePersonRelationshipHeader,
} from '../utils/personTimeline';

interface PersonProfileModalProps {
  isOpen: boolean;
  person: PersonRecord | null;
  allPersons: PersonRecord[];
  clanSurname?: string;
  onClose: () => void;
  onEdit: () => void;
  onSelectPerson?: (personId: string) => void;
}

interface ProfileFieldProps {
  label: string;
  value?: string | number | null;
  span2?: boolean;
  mono?: boolean;
}

const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  span2 = false,
  mono = false,
}) => {
  const displayValue =
    value !== undefined && value !== null && String(value).trim() !== ''
      ? String(value).trim()
      : '—';

  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <dt className="text-[12px] font-medium text-[#56585A] dark:text-slate-400 mb-1">
        {label}
      </dt>
      <dd
        className={`text-[14px] text-[#212225] dark:text-slate-100 leading-relaxed break-words ${
          mono ? 'tabular-nums' : ''
        } ${displayValue === '—' ? 'text-[#8C9094] dark:text-slate-500' : ''}`}
      >
        {displayValue}
      </dd>
    </div>
  );
};

export const PersonProfileModal: React.FC<PersonProfileModalProps> = ({
  isOpen,
  person,
  allPersons,
  clanSurname = '',
  onClose,
  onEdit,
  onSelectPerson,
}) => {
  const titleId = useId();

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

  const fullName = useMemo(
    () => (person ? resolvePersonDisplayName(person, clanSurname) : ''),
    [person, clanSurname]
  );

  const relationshipHeader = useMemo(
    () =>
      person ? resolvePersonRelationshipHeader(person, allPersons) : '',
    [person, allPersons]
  );

  const familyGroups = useMemo(
    () =>
      person
        ? buildImmediateFamilyGroups(person, allPersons, clanSurname)
        : { upperGroup: [], lowerGroup: [], totalCount: 0 },
    [person, allPersons, clanSurname]
  );

  if (!isOpen || !person) return null;

  const aliases = parseAliasList(person.aliases, person.courtesyName);
  const autoRank = computeAutoRankLabel(person, allPersons);
  const birthLine = formatHeaderBirthLine(person);
  const ageVal = calculateAgeDisplay(person);

  const genderLabel =
    person.gender === 'male'
      ? '男'
      : person.gender === 'female'
        ? '女'
        : '未知';
  const statusLabel = person.status === 'living' ? '存（健在）' : '歿（已故）';

  const birthDateDisplay = (
    person.birth?.structuredDate
      ? formatGenealogyDate(person.birth.structuredDate)
      : person.birth?.date || person.birthDate || ''
  ).trim();
  const birthPlaceDisplay = (
    person.birth?.structuredPlace
      ? formatGenealogyPlace(person.birth.structuredPlace)
      : person.birth?.place || ''
  ).trim();

  const deathDateDisplay = (
    person.death?.structuredDate
      ? formatGenealogyDate(person.death.structuredDate)
      : person.death?.date || person.deathDate || ''
  ).trim();
  const deathPlaceDisplay = (
    person.death?.structuredPlace
      ? formatGenealogyPlace(person.death.structuredPlace)
      : person.death?.place || ''
  ).trim();
  const burialDateDisplay = (
    person.death?.structuredBurialDate
      ? formatGenealogyDate(person.death.structuredBurialDate)
      : person.death?.burialDate || ''
  ).trim();
  const burialPlaceDisplay = (
    person.death?.structuredBurialPlace
      ? formatGenealogyPlace(person.death.structuredBurialPlace)
      : person.death?.burialPlace || person.burialPlace || ''
  ).trim();

  const romanizedFull = [
    person.romanizedName?.surname,
    person.romanizedName?.name,
    person.romanizedName?.suffix,
  ]
    .filter(Boolean)
    .join(' ');

  const educationRows =
    person.career?.educationHistory && person.career.educationHistory.length > 0
      ? person.career.educationHistory
      : person.career?.school ||
          person.career?.educationLevel ||
          person.career?.educationPeriod
        ? [
            {
              id: 'legacy-edu',
              period: person.career?.educationPeriod,
              level: [person.career?.educationLevel, person.career?.graduationStatus]
                .filter(Boolean)
                .join(' · '),
              school: [person.career?.school, person.career?.major]
                .filter(Boolean)
                .join(' · '),
            },
          ]
        : [];

  const careerRows =
    person.career?.careerHistory && person.career.careerHistory.length > 0
      ? person.career.careerHistory
      : person.career?.profession ||
          person.career?.title ||
          person.officialTitle
        ? [
            {
              id: 'legacy-career',
              period: '',
              location: '',
              organization: person.career?.profession || '',
              position: person.career?.title || person.officialTitle || '',
            },
          ]
        : [];

  const sequenceDisplay = [
    person.sequenceMeta?.mainLabel
      ? `${person.sequenceMeta.mainLabel}${
          person.sequenceMeta.mainNumber
            ? ` #${person.sequenceMeta.mainNumber}`
            : ''
        }`
      : '',
    person.sequenceMeta?.subLabel
      ? `${person.sequenceMeta.subLabel}${
          person.sequenceMeta.subNumber
            ? ` #${person.sequenceMeta.subNumber}`
            : ''
        }`
      : '',
  ]
    .filter(Boolean)
    .join(' / ');

  const originalPageDisplay =
    person.sequenceMeta?.originalPage ?? person.biographyPage;

  const hasPrivateInfo = Boolean(
    person.privateInfo?.idCardName ||
      person.privateInfo?.idCardNum ||
      person.privateInfo?.mobile ||
      person.privateInfo?.address
  );

  const avatarToneClass =
    person.gender === 'female'
      ? 'bg-[#ED5481]/12 text-[#B6335A] dark:bg-[#D16686]/15 dark:text-[#E590AA] border-[#ED5481]/25'
      : person.gender === 'male'
        ? 'bg-[#2097B7]/12 text-[#057091] dark:bg-[#3E9EB8]/15 dark:text-[#6EC2DB] border-[#2097B7]/25'
        : 'bg-[#E8EAEA] text-[#56585A] dark:bg-slate-700 dark:text-slate-300 border-[#D8DADA] dark:border-slate-600';

  const modalNode = (
    <div
      className="fs-lineage-theme fixed inset-0 z-[95] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden rounded-[12px] bg-white dark:bg-[#1E2329] text-[#212225] dark:text-slate-100 border border-[#D8DADA] dark:border-slate-700/80 shadow-[0_14px_38px_rgba(0,0,0,0.22),0_4px_12px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — identical shell to AddRelativeModal */}
        <div className="shrink-0 bg-[#F5F6F6] dark:bg-[#252B33] border-b border-[#E0E2E2] dark:border-slate-700/80 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`w-14 h-14 rounded-full overflow-hidden border flex items-center justify-center shrink-0 text-lg font-bold ${avatarToneClass}`}
            >
              {person.avatarUrl ? (
                <img
                  src={person.avatarUrl}
                  alt={fullName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : fullName ? (
                <span>{fullName.slice(0, 1)}</span>
              ) : (
                <User size={22} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-[20px] font-bold leading-snug text-[#212225] dark:text-slate-100 truncate"
              >
                {fullName}
              </h2>
              <div className="text-[13px] text-[#56585A] dark:text-slate-400 truncate mt-0.5 tabular-nums">
                {relationshipHeader}
                {birthLine ? ` · ${birthLine}` : ''}
              </div>
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

        {/* Scrollable Complete Profile Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          {/* Section 1: 基本身份与名讳 */}
          <section className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#212225] dark:text-slate-100">
              基本身份与名讳
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <ProfileField
                label="姓氏"
                value={
                  person.spouseOfId
                    ? person.surname
                    : person.surname || clanSurname
                }
              />
              <ProfileField label="谱名 / 名字" value={person.name} />
              <ProfileField label="后缀称谓" value={person.nameSuffix} />
              <ProfileField
                label="字 / 号 / 别名"
                value={aliases.length > 0 ? aliases.join('、') : person.courtesyName}
              />
              <ProfileField label="常用名" value={person.legalName} />
              <ProfileField label="乳名 / 幼名" value={person.childhoodName} />
              <ProfileField label="性别" value={genderLabel} />
              <ProfileField label="状态" value={statusLabel} />
              <ProfileField label="拼音 / 罗马字" value={romanizedFull} />
            </dl>
          </section>

          <hr className="border-0 border-t border-[#ECEEEE] dark:border-slate-700/70" />

          {/* Section 2: 世系与宗法信息 */}
          <section className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#212225] dark:text-slate-100">
              世系与宗法
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <ProfileField
                label="世次"
                value={`第 ${person.generation} 世`}
                mono
              />
              <ProfileField label="排行" value={person.rank || autoRank} />
              <ProfileField label="派语字辈" value={person.generationWord} />
              <ProfileField label="行第" value={person.hangOrder} />
              <ProfileField label="与父母/配偶关系" value={person.relationType} />
              <ProfileField label="关系称谓" value={person.relationTitle} />
              <ProfileField label="分房" value={person.branchLabel} />
              <ProfileField label="题行" value={person.headingLine} />
              <ProfileField
                label="原谱页码"
                value={
                  originalPageDisplay !== undefined
                    ? `第 ${originalPageDisplay} 页`
                    : undefined
                }
                mono
              />
              {sequenceDisplay && (
                <ProfileField label="主/子世序" value={sequenceDisplay} span2 />
              )}
              {person.lineageRemarks && (
                <ProfileField
                  label="世系备注"
                  value={person.lineageRemarks}
                  span2
                />
              )}
              {person.relationNotes && (
                <ProfileField
                  label="关系备注"
                  value={person.relationNotes}
                  span2
                />
              )}
            </dl>
          </section>

          <hr className="border-0 border-t border-[#ECEEEE] dark:border-slate-700/70" />

          {/* Section 3: 生卒葬考据 */}
          <section className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#212225] dark:text-slate-100">
              生卒葬考据
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <ProfileField label="出生日期" value={birthDateDisplay} mono />
              <ProfileField label="出生地点" value={birthPlaceDisplay} />
              {person.birth?.summary && (
                <ProfileField
                  label="出生记述"
                  value={person.birth.summary}
                  span2
                />
              )}
              {person.status === 'deceased' ? (
                <>
                  <ProfileField
                    label="死亡日期"
                    value={deathDateDisplay}
                    mono
                  />
                  <ProfileField label="死亡地点" value={deathPlaceDisplay} />
                  <ProfileField label="死亡原因" value={person.death?.cause} />
                  <ProfileField
                    label="享寿"
                    value={ageVal !== null ? `${ageVal} 岁` : undefined}
                    mono
                  />
                  <ProfileField
                    label="埋葬日期"
                    value={burialDateDisplay}
                    mono
                  />
                  <ProfileField label="埋葬地点" value={burialPlaceDisplay} />
                  {person.death?.summary && (
                    <ProfileField
                      label="卒葬记述"
                      value={person.death.summary}
                      span2
                    />
                  )}
                </>
              ) : (
                <ProfileField
                  label="当前参考年龄"
                  value={ageVal !== null ? `${ageVal} 岁` : undefined}
                  mono
                />
              )}
            </dl>
          </section>

          <hr className="border-0 border-t border-[#ECEEEE] dark:border-slate-700/70" />

          {/* Section 4: 学业与职衔履历 */}
          <section className="space-y-4">
            <h3 className="text-[14px] font-bold text-[#212225] dark:text-slate-100">
              学业与职业经历
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-[12px] font-medium text-[#56585A] dark:text-slate-400 mb-2">
                  教育经历
                </h4>
                {educationRows.length > 0 ? (
                  <ul className="space-y-2.5">
                    {educationRows.map((edu, idx) => {
                      const period = (
                        edu.structuredPeriod
                          ? formatGenealogyDate(edu.structuredPeriod)
                          : edu.period || ''
                      ).trim();
                      return (
                        <li
                          key={edu.id || idx}
                          className="text-[13.5px] text-[#212225] dark:text-slate-100 leading-relaxed"
                        >
                          <div className="font-medium">
                            {edu.school || '未填写学校'}
                            {edu.level ? ` · ${edu.level}` : ''}
                          </div>
                          {period && (
                            <div className="text-[12px] text-[#56585A] dark:text-slate-400 tabular-nums">
                              {period}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[13.5px] text-[#8C9094] dark:text-slate-500">
                    暂无教育经历记录
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-[12px] font-medium text-[#56585A] dark:text-slate-400 mb-2">
                  职业与功名官阶
                </h4>
                {careerRows.length > 0 ? (
                  <ul className="space-y-2.5">
                    {careerRows.map((job, idx) => {
                      const period = (
                        job.structuredPeriod
                          ? formatGenealogyDate(job.structuredPeriod)
                          : job.period || ''
                      ).trim();
                      return (
                        <li
                          key={job.id || idx}
                          className="text-[13.5px] text-[#212225] dark:text-slate-100 leading-relaxed"
                        >
                          <div className="font-medium">
                            {[job.organization, job.position]
                              .filter(Boolean)
                              .join(' · ') || '未填写单位或职务'}
                          </div>
                          {(period || job.location) && (
                            <div className="text-[12px] text-[#56585A] dark:text-slate-400 tabular-nums">
                              {[period, job.location].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[13.5px] text-[#8C9094] dark:text-slate-500">
                    暂无职业或功名记录
                  </p>
                )}
              </div>
            </div>

            {(person.career?.resume || person.career?.lifeSummary) && (
              <dl className="grid grid-cols-1 gap-4 pt-1">
                {person.career.resume && (
                  <ProfileField label="履历详情" value={person.career.resume} />
                )}
                {person.career.lifeSummary && (
                  <ProfileField
                    label="生平记述"
                    value={person.career.lifeSummary}
                  />
                )}
              </dl>
            )}

            {person.events && person.events.length > 0 && (
              <div className="pt-1">
                <h4 className="text-[12px] font-medium text-[#56585A] dark:text-slate-400 mb-2">
                  其他生平事件
                </h4>
                <ul className="space-y-2.5">
                  {person.events.map((ev, idx) => {
                    const evDate = (
                      ev.structuredDate
                        ? formatGenealogyDate(ev.structuredDate)
                        : ev.date || ''
                    ).trim();
                    const evPlace = (
                      ev.structuredPlace
                        ? formatGenealogyPlace(ev.structuredPlace)
                        : ev.place || ''
                    ).trim();
                    const evLabel =
                      ev.type === 'other' && ev.customTypeLabel?.trim()
                        ? ev.customTypeLabel.trim()
                        : EVENT_TYPE_LABELS[ev.type] || '事件';
                    const headline = [
                      evLabel,
                      ev.relatedPersonName?.trim(),
                      ev.organization?.trim(),
                      ev.position?.trim() || ev.educationLevel?.trim(),
                    ]
                      .filter(Boolean)
                      .join(' · ');

                    return (
                      <li
                        key={ev.id || idx}
                        className="text-[13.5px] text-[#212225] dark:text-slate-100 leading-relaxed"
                      >
                        <div className="font-medium">{headline}</div>
                        {(evDate || evPlace) && (
                          <div className="text-[12px] text-[#56585A] dark:text-slate-400 tabular-nums">
                            {[evDate, evPlace].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {ev.description?.trim() && (
                          <div className="text-[12.5px] text-[#56585A] dark:text-slate-300 mt-0.5">
                            {ev.description.trim()}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <hr className="border-0 border-t border-[#ECEEEE] dark:border-slate-700/70" />

          {/* Section 5: 传记与备注 */}
          <section className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#212225] dark:text-slate-100">
              人物传记与备注
            </h3>
            <dl className="space-y-4">
              <ProfileField
                label="传记 / 行状事略"
                value={person.biography}
              />
              {person.notes && (
                <ProfileField label="末尾备注" value={person.notes} />
              )}
            </dl>
          </section>

          <hr className="border-0 border-t border-[#ECEEEE] dark:border-slate-700/70" />

          {/* Section 6: 家庭成员概览 */}
          <section className="space-y-3">
            <h3 className="text-[14px] font-bold text-[#212225] dark:text-slate-100">
              家庭成员（{familyGroups.totalCount}）
            </h3>
            {familyGroups.totalCount > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...familyGroups.upperGroup, ...familyGroups.lowerGroup].map(
                  (member) => {
                    const clickable = Boolean(
                      member.personId && onSelectPerson
                    );
                    const rowContent = (
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full overflow-hidden border flex items-center justify-center shrink-0 text-xs font-semibold ${
                            member.gender === 'female'
                              ? 'bg-[#ED5481]/10 text-[#B6335A] border-[#ED5481]/25 dark:bg-[#D16686]/15 dark:text-[#E590AA]'
                              : member.gender === 'male'
                                ? 'bg-[#2097B7]/10 text-[#057091] border-[#2097B7]/25 dark:bg-[#3E9EB8]/15 dark:text-[#6EC2DB]'
                                : 'bg-[#F5F6F6] text-[#56585A] border-[#D8DADA] dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.displayName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{member.displayName.slice(0, 1) || '族'}</span>
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="text-[13.5px] font-semibold text-[#212225] dark:text-slate-100 truncate">
                            {member.displayName}
                          </div>
                          <div className="text-[12px] text-[#56585A] dark:text-slate-400 truncate tabular-nums">
                            {member.relationshipLabel}
                            {member.yearsLabel ? ` · ${member.yearsLabel}` : ''}
                          </div>
                        </div>
                      </div>
                    );

                    return clickable ? (
                      <button
                        key={member.key}
                        type="button"
                        onClick={() => {
                          onSelectPerson?.(member.personId!);
                          onClose();
                        }}
                        className="flex items-center justify-between px-3 py-2 rounded-[8px] border border-[#E0E2E2] dark:border-slate-700/80 hover:bg-[#EAF4F7]/60 hover:border-[#057091]/40 dark:hover:bg-[#057091]/15 transition-colors cursor-pointer"
                      >
                        {rowContent}
                      </button>
                    ) : (
                      <div
                        key={member.key}
                        className="flex items-center justify-between px-3 py-2 rounded-[8px] border border-[#E0E2E2] dark:border-slate-700/80"
                      >
                        {rowContent}
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <p className="text-[13.5px] text-[#8C9094] dark:text-slate-500">
                暂无已关联的直系亲属记录
              </p>
            )}
          </section>

          {hasPrivateInfo && (
            <>
              <hr className="border-0 border-t border-[#ECEEEE] dark:border-slate-700/70" />
              <section className="space-y-3">
                <h3 className="text-[14px] font-bold text-[#212225] dark:text-slate-100">
                  联系与证件资料
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <ProfileField
                    label="实名姓名"
                    value={person.privateInfo?.idCardName}
                  />
                  <ProfileField
                    label="联系电话"
                    value={person.privateInfo?.mobile}
                    mono
                  />
                  <ProfileField
                    label="证件号码"
                    value={person.privateInfo?.idCardNum}
                    mono
                  />
                  <ProfileField
                    label="联系地址"
                    value={person.privateInfo?.address}
                  />
                </dl>
              </section>
            </>
          )}
        </div>

        {/* Fixed 72px Footer — identical to AddRelativeModal */}
        <div className="h-[72px] shrink-0 px-6 border-t border-[#E0E2E2] dark:border-slate-700/80 bg-white dark:bg-[#1E2329] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-[6px] text-[14px] font-semibold text-[#057091] dark:text-[#58B1CD] hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/20 transition-colors cursor-pointer"
          >
            关闭
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-[6px] text-[14px] font-semibold bg-[#057091] hover:bg-[#045B76] active:bg-[#034C63] text-white shadow-xs transition-colors cursor-pointer"
          >
            <Pencil size={15} aria-hidden="true" />
            <span>编辑资料</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalNode;
  return createPortal(modalNode, document.body);
};
