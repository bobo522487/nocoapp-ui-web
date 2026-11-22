import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  getPersonDateDisplay,
  readGenealogyDate,
} from '../../date-input';
import {
  getPersonPlaceDisplay,
  readGenealogyPlace,
} from '../../place-input';
import { PersonRecord } from '../types';
import {
  normalizeEventType,
  normalizePersonForSave,
} from '../utils/personHelpers';
import {
  EventEditContext,
  PersonTimelineEvent,
  UnifiedEventSubmitPayload,
  applyUnifiedEventToPerson,
  buildPersonTimelineEvents,
  findCoupleMarriageInfo,
  formatHeaderBirthLine,
  removeUnifiedEventFromPerson,
  resolvePersonDisplayName,
  resolvePersonRelationshipHeader,
  resolveRomanizedDisplayName,
} from '../utils/personTimeline';
import { ParentChildRelationModal } from './ParentChildRelationModal';
import { PersonEventModal } from './PersonEventModal';
import { PersonFamilySection } from './PersonFamilySection';
import { PersonPortraitModal } from './PersonPortraitModal';
import {
  PersonVitalEditModal,
  VitalQuickEditField,
} from './PersonVitalEditModal';

interface PersonDetailPanelProps {
  person: PersonRecord | null;
  allPersons: PersonRecord[];
  clanSurname?: string;
  onSelectPerson?: (personId: string) => void;
  onUpdatePerson: (id: string, updates: Partial<PersonRecord>) => void;
  onDeletePerson: (id: string) => void;
  onAddChild: (
    fatherId: string,
    gender?: 'male' | 'female',
    motherInfo?: { motherId?: string; motherName?: string }
  ) => void;
  onAddSpouse: (personId: string) => void;
  onAddSibling?: (personId: string, gender?: 'male' | 'female') => void;
  onAddParent?: (personId: string) => void;
  width: number;
  onClose?: () => void;
}

interface AvatarPortraitProps {
  avatarUrl?: string;
  displayName: string;
  gender: 'male' | 'female' | 'unknown';
  sizeClass: string;
  textClass?: string;
}

const AvatarPortrait: React.FC<AvatarPortraitProps> = ({
  avatarUrl,
  displayName,
  gender,
  sizeClass,
  textClass = 'text-sm',
}) => {
  const toneClass =
    gender === 'female'
      ? 'bg-[#ED5481]/12 text-[#B6335A] dark:bg-[#D16686]/15 dark:text-[#E590AA] border-[#ED5481]/25 dark:border-[#D16686]/30'
      : gender === 'male'
        ? 'bg-[#2097B7]/12 text-[#057091] dark:bg-[#3E9EB8]/15 dark:text-[#6EC2DB] border-[#2097B7]/25 dark:border-[#3E9EB8]/30'
        : 'bg-[#E8EAEA] text-[#56585A] dark:bg-slate-700 dark:text-slate-300 border-[#D8DADA] dark:border-slate-600';

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden border flex items-center justify-center shrink-0 font-bold select-none',
        sizeClass,
        textClass,
        toneClass
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{displayName ? displayName.slice(0, 1) : '族'}</span>
      )}
    </div>
  );
};

export const PersonDetailPanel: React.FC<PersonDetailPanelProps> = ({
  person,
  allPersons,
  clanSurname = '',
  onSelectPerson,
  onUpdatePerson,
  onDeletePerson,
  onAddChild,
  onAddSpouse,
  width,
  onClose,
}) => {
  // Modals for Portrait, Unified Event Editor, Vital Quick Edit & Parent-Child Relation
  const [portraitModalOpen, setPortraitModalOpen] = useState(false);
  const [eventEditContext, setEventEditContext] =
    useState<EventEditContext | null>(null);
  const [vitalQuickEditField, setVitalQuickEditField] =
    useState<VitalQuickEditField>(null);
  const [editingParentChildId, setEditingParentChildId] = useState<
    string | null
  >(null);

  // Collapsible sections & bottom delete confirmation state
  const [vitalsExpanded, setVitalsExpanded] = useState(true);
  const [familyExpanded, setFamilyExpanded] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [confirmDeleteSelf, setConfirmDeleteSelf] = useState(false);

  const prevPersonIdRef = useRef<string | null>(null);

  // Reset transient modal & confirmation states whenever selected person changes
  useEffect(() => {
    if (!person) {
      prevPersonIdRef.current = null;
      setPortraitModalOpen(false);
      setEventEditContext(null);
      setVitalQuickEditField(null);
      setEditingParentChildId(null);
      setConfirmDeleteSelf(false);
      return;
    }

    if (prevPersonIdRef.current !== person.id) {
      prevPersonIdRef.current = person.id;
      setPortraitModalOpen(false);
      setEventEditContext(null);
      setVitalQuickEditField(null);
      setEditingParentChildId(null);
      setConfirmDeleteSelf(false);
    }
  }, [person]);

  const displayName = useMemo(
    () => (person ? resolvePersonDisplayName(person, clanSurname) : ''),
    [person, clanSurname]
  );

  const romanizedDisplay = useMemo(
    () => (person ? resolveRomanizedDisplayName(person) : ''),
    [person]
  );

  const relationshipSubtitle = useMemo(
    () =>
      person ? resolvePersonRelationshipHeader(person, allPersons) : '',
    [person, allPersons]
  );

  const headerBirthLine = useMemo(
    () => (person ? formatHeaderBirthLine(person) : ''),
    [person]
  );

  const timelineEvents = useMemo(
    () =>
      person ? buildPersonTimelineEvents(person, allPersons, clanSurname) : [],
    [person, allPersons, clanSurname]
  );

  if (!person) return null;

  const isSpouseNode = Boolean(person.spouseOfId);
  const isRoot = person.generation === 1 && !isSpouseNode;

  // Vitals formatted values
  const vitalGenderText =
    person.gender === 'male'
      ? '男'
      : person.gender === 'female'
        ? '女'
        : '未知';

  const vitalBirthDateText = getPersonDateDisplay(person, 'birth').trim();
  const vitalBirthPlaceText = getPersonPlaceDisplay(person, 'birth').trim();

  const vitalDeathDateText = getPersonDateDisplay(person, 'death').trim();
  const vitalDeathPlaceText = getPersonPlaceDisplay(person, 'death').trim();

  // Open Unified Event Modal for Vital Birth / Death
  const openVitalBirthEventModal = () => {
    setEventEditContext({
      mode: 'edit',
      sourceKind: 'birth',
      targetPersonId: person.id,
      canDelete: false,
      initialEvent: {
        type: 'birth',
        structuredDate: readGenealogyDate(person, 'birth'),
        structuredPlace: readGenealogyPlace(person, 'birth'),
        description: person.birth?.summary || '',
      },
    });
  };

  const openVitalDeathEventModal = () => {
    setEventEditContext({
      mode: 'edit',
      sourceKind: 'death',
      targetPersonId: person.id,
      canDelete: false,
      initialEvent: {
        type: 'death',
        structuredDate: readGenealogyDate(person, 'death'),
        structuredPlace: readGenealogyPlace(person, 'death'),
        description: person.death?.summary || '',
      },
    });
  };

  // Open Unified Event Modal for Creating a New Timeline Event
  const openCreateEventModal = () => {
    setEventEditContext({
      mode: 'create',
      targetPersonId: person.id,
      canDelete: false,
      initialEvent: {
        type: 'career',
        structuredDate: null,
        structuredPlace: null,
        description: '',
      },
    });
  };

  // Open Unified Event Modal for Editing any existing Timeline Event
  const openEditTimelineEventModal = (ev: PersonTimelineEvent) => {
    const target =
      allPersons.find((p) => p.id === ev.targetPersonId) || person;

    const resolvedDate =
      ev.structuredDate ??
      (ev.sourceKind === 'birth' || ev.sourceKind === 'child_birth'
        ? readGenealogyDate(target, 'birth')
        : ev.sourceKind === 'death'
          ? readGenealogyDate(target, 'death')
          : ev.sourceKind === 'burial'
            ? readGenealogyDate(target, 'burial')
            : ev.dateText
              ? {
                  schemaVersion: 1 as const,
                  kind: 'phrase' as const,
                  originalText: ev.dateText,
                }
              : null);

    const resolvedPlace =
      ev.structuredPlace ??
      (ev.sourceKind === 'birth' || ev.sourceKind === 'child_birth'
        ? readGenealogyPlace(target, 'birth')
        : ev.sourceKind === 'death'
          ? readGenealogyPlace(target, 'death')
          : ev.sourceKind === 'burial'
            ? readGenealogyPlace(target, 'burial')
            : ev.placeText
              ? {
                  schemaVersion: 1 as const,
                  kind: 'phrase' as const,
                  originalText: ev.placeText,
                }
              : null);

    const canDelete =
      ev.sourceKind === 'custom_event' || ev.sourceKind === 'burial';

    let coupleMeta: EventEditContext['coupleMeta'];
    if (ev.sourceKind === 'marriage_node' && ev.jumpPersonId) {
      const other = allPersons.find((p) => p.id === ev.jumpPersonId);
      if (other) {
        const partnerRec = target.spouseOfId ? other : target;
        const spouseRec = target.spouseOfId ? target : other;
        const spouseCount = allPersons.filter(
          (p) => p.spouseOfId === partnerRec.id
        ).length;
        const info = findCoupleMarriageInfo(
          partnerRec,
          spouseRec,
          Math.max(1, spouseCount),
          clanSurname
        );
        coupleMeta = {
          partnerId: partnerRec.id,
          spouseId: spouseRec.id,
          partnerEventId: info.partnerEventId,
          spouseEventId: info.spouseEventId,
        };
      }
    }

    setEventEditContext({
      mode: 'edit',
      sourceKind: ev.sourceKind,
      sourceId: ev.sourceId,
      targetPersonId: target.id,
      canDelete,
      coupleMeta,
      initialEvent: {
        type: normalizeEventType(ev.eventType),
        structuredDate: resolvedDate,
        structuredPlace: resolvedPlace,
        description: ev.description || '',
      },
    });
  };

  const openEditMarriageModal = (partnerId: string, spouseId: string) => {
    const partner = allPersons.find((p) => p.id === partnerId);
    const spouse = allPersons.find((p) => p.id === spouseId);
    if (!partner || !spouse) return;
    const spouseCount = allPersons.filter(
      (p) => p.spouseOfId === partner.id
    ).length;
    const info = findCoupleMarriageInfo(
      partner,
      spouse,
      Math.max(1, spouseCount),
      clanSurname
    );
    setEventEditContext({
      mode: 'edit',
      sourceKind: 'marriage_node',
      sourceId: info.partnerEventId,
      targetPersonId: partner.id,
      canDelete: false,
      coupleMeta: {
        partnerId: partner.id,
        spouseId: spouse.id,
        partnerEventId: info.partnerEventId,
        spouseEventId: info.spouseEventId,
      },
      initialEvent: {
        type: 'marriage',
        structuredDate: info.structuredDate,
        structuredPlace: info.structuredPlace,
        description: info.description,
      },
    });
  };

  const handleUnifiedEventSubmit = (
    ctx: EventEditContext,
    payload: UnifiedEventSubmitPayload
  ) => {
    if (ctx.coupleMeta) {
      const partner = allPersons.find(
        (p) => p.id === ctx.coupleMeta!.partnerId
      );
      const spouse = allPersons.find((p) => p.id === ctx.coupleMeta!.spouseId);

      if (partner) {
        const partnerUpdates = applyUnifiedEventToPerson(
          partner,
          allPersons,
          payload,
          {
            ...ctx,
            sourceId:
              ctx.coupleMeta.partnerEventId || `ev-marriage-${partner.id}`,
            targetPersonId: partner.id,
          }
        );
        onUpdatePerson(partner.id, partnerUpdates);
      }

      if (spouse) {
        const spouseUpdates = applyUnifiedEventToPerson(
          spouse,
          allPersons,
          payload,
          {
            ...ctx,
            sourceId:
              ctx.coupleMeta.spouseEventId ||
              `ev-marriage-${ctx.coupleMeta.partnerId}`,
            targetPersonId: spouse.id,
          }
        );
        onUpdatePerson(spouse.id, spouseUpdates);
      }

      setEventEditContext(null);
      return;
    }

    const target =
      allPersons.find((p) => p.id === ctx.targetPersonId) || person;
    const updates = applyUnifiedEventToPerson(target, allPersons, payload, ctx);
    onUpdatePerson(target.id, updates);
    setEventEditContext(null);
  };

  const handleUnifiedEventDelete = (ctx: EventEditContext) => {
    const target =
      allPersons.find((p) => p.id === ctx.targetPersonId) || person;
    const updates = removeUnifiedEventFromPerson(target, allPersons, ctx);
    if (updates) {
      onUpdatePerson(target.id, updates);
    }
    setEventEditContext(null);
  };

  return (
    <aside
      style={{ width }}
      aria-label="人物详情抽屉"
      className="h-full max-w-[calc(100%-48px)] bg-white dark:bg-[#1E2329] text-[#212225] dark:text-slate-100 border-l border-[#D8DADA] dark:border-slate-700/80 flex flex-col overflow-hidden shrink-0 relative z-20"
    >
      {/* 1. Header — Portrait Button opens PersonPortraitModal */}
      <div className="shrink-0 bg-[#F5F6F6] dark:bg-[#252B33] border-b border-[#E0E2E2] dark:border-slate-700/80 px-5 pt-4 pb-4 relative">
        {onClose && (
          <button
            type="button"
            aria-label="关闭人物抽屉"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center text-[#56585A] dark:text-slate-400 hover:bg-[#E4E6E6] dark:hover:bg-slate-700/70 hover:text-[#212225] dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        )}

        <div className="flex items-start gap-3.5 pr-10">
          <div className="relative shrink-0">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setPortraitModalOpen(true)}
              title={person.avatarUrl ? '管理肖像照片' : '添加肖像照片'}
              aria-label={person.avatarUrl ? '管理肖像照片' : '添加肖像照片'}
              className="group relative rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#057091]"
            >
              <AvatarPortrait
                avatarUrl={person.avatarUrl}
                displayName={displayName}
                gender={person.gender}
                sizeClass="w-[72px] h-[72px]"
                textClass="text-[24px]"
              />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white dark:bg-[#1E2329] border border-[#D8DADA] dark:border-slate-600 text-[#56585A] dark:text-slate-300 group-hover:text-[#057091] group-hover:border-[#057091] flex items-center justify-center shadow-xs transition-all duration-150',
                  person.avatarUrl
                    ? 'opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100 group-focus-visible:scale-100'
                    : 'opacity-100 scale-100'
                )}
              >
                <Camera size={12} aria-hidden="true" />
              </span>
            </button>
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-[20px] font-bold leading-snug text-[#212225] dark:text-slate-100 truncate">
              {displayName}
            </h2>
            <div className="text-[13px] text-[#56585A] dark:text-slate-400 truncate mt-0.5">
              {relationshipSubtitle}
            </div>
            {headerBirthLine && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[#56585A] dark:text-slate-400 tabular-nums">
                <Calendar
                  size={13}
                  className="shrink-0 text-[#737679] dark:text-slate-500"
                  aria-hidden="true"
                />
                <span className="truncate">{headerBirthLine}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. 3px Blue-Teal Accent Strip */}
      <div
        className="h-[3px] w-full bg-[#057091] shrink-0"
        aria-hidden="true"
      />

      {/* 3. Scrollable Browse Workspace */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-[#1E2329]">
        {/* Section 1: 基本资料 */}
        <section
          data-testid="section-card-vitals"
          className="px-5 py-4 border-b border-[#ECEEEE] dark:border-slate-700/70"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-expanded={vitalsExpanded}
              onClick={() => setVitalsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 text-left py-1 rounded text-[14px] font-bold text-[#212225] dark:text-slate-100 hover:text-[#057091] dark:hover:text-[#58B1CD] transition-colors cursor-pointer"
            >
              <span>基本资料</span>
              {vitalsExpanded ? (
                <ChevronUp
                  size={14}
                  className="text-[#56585A] dark:text-slate-400"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  size={14}
                  className="text-[#56585A] dark:text-slate-400"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {vitalsExpanded && (
            <div className="mt-2.5">
              {/* 2-Column Vitals Grid: 姓名 / 性别 / 出生 / 死亡 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {/* 1. 姓名 */}
                <div
                  data-testid="highlight-NAME"
                  className="group relative rounded-[8px] px-2.5 py-2 -mx-2.5 hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors"
                >
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setVitalQuickEditField('name')}
                    className="w-full text-left pr-8 cursor-pointer"
                  >
                    <div className="text-[12.5px] font-bold text-[#212225] dark:text-slate-100">
                      姓名
                    </div>
                    <div className="mt-0.5 text-[13.5px] text-[#212225] dark:text-slate-100 leading-snug break-words">
                      <span>{displayName}</span>
                      {romanizedDisplay && (
                        <span className="block text-[12px] text-[#56585A] dark:text-slate-400">
                          {romanizedDisplay}
                        </span>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label="编辑姓名"
                    aria-haspopup="dialog"
                    onClick={() => setVitalQuickEditField('name')}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[#56585A] dark:text-slate-400 opacity-75 group-hover:opacity-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] transition-colors cursor-pointer"
                  >
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                </div>

                {/* 2. 性别 */}
                <div
                  data-testid="highlight-GENDER"
                  className="group relative rounded-[8px] px-2.5 py-2 -mx-2.5 hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors"
                >
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setVitalQuickEditField('gender')}
                    className="w-full text-left pr-8 cursor-pointer"
                  >
                    <div className="text-[12.5px] font-bold text-[#212225] dark:text-slate-100">
                      性别
                    </div>
                    <div className="mt-0.5 text-[13.5px] text-[#212225] dark:text-slate-100 leading-snug">
                      {vitalGenderText}
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label="编辑性别"
                    aria-haspopup="dialog"
                    onClick={() => setVitalQuickEditField('gender')}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[#56585A] dark:text-slate-400 opacity-75 group-hover:opacity-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] transition-colors cursor-pointer"
                  >
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                </div>

                {/* 3. 出生 */}
                <div
                  data-testid="highlight-BIRTH"
                  className="group relative rounded-[8px] px-2.5 py-2 -mx-2.5 hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors"
                >
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={openVitalBirthEventModal}
                    className="w-full text-left pr-8 cursor-pointer"
                  >
                    <div className="text-[12.5px] font-bold text-[#212225] dark:text-slate-100">
                      出生
                    </div>
                    {vitalBirthDateText || vitalBirthPlaceText ? (
                      <div className="mt-0.5 space-y-0.5 text-[13px] text-[#212225] dark:text-slate-100 leading-snug">
                        {vitalBirthDateText && (
                          <div className="tabular-nums">
                            {vitalBirthDateText}
                          </div>
                        )}
                        {vitalBirthPlaceText && (
                          <div className="text-[#56585A] dark:text-slate-400">
                            {vitalBirthPlaceText}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-[13px] text-[#8C9094] dark:text-slate-500">
                        未填写
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label="编辑出生"
                    aria-haspopup="dialog"
                    onClick={openVitalBirthEventModal}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[#56585A] dark:text-slate-400 opacity-75 group-hover:opacity-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] transition-colors cursor-pointer"
                  >
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                </div>

                {/* 4. 死亡 */}
                <div
                  data-testid="highlight-DEATH"
                  className="group relative rounded-[8px] px-2.5 py-2 -mx-2.5 hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors"
                >
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={openVitalDeathEventModal}
                    className="w-full text-left pr-8 cursor-pointer"
                  >
                    <div className="text-[12.5px] font-bold text-[#212225] dark:text-slate-100">
                      死亡
                    </div>
                    {person.status === 'living' ? (
                      <div className="mt-0.5 text-[13.5px] text-[#212225] dark:text-slate-100 leading-snug">
                        在世
                      </div>
                    ) : vitalDeathDateText || vitalDeathPlaceText ? (
                      <div className="mt-0.5 space-y-0.5 text-[13px] text-[#212225] dark:text-slate-100 leading-snug">
                        {vitalDeathDateText && (
                          <div className="tabular-nums">
                            {vitalDeathDateText}
                          </div>
                        )}
                        {vitalDeathPlaceText && (
                          <div className="text-[#56585A] dark:text-slate-400">
                            {vitalDeathPlaceText}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-[13px] text-[#56585A] dark:text-slate-400">
                        已故
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label="编辑死亡"
                    aria-haspopup="dialog"
                    onClick={openVitalDeathEventModal}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-[#56585A] dark:text-slate-400 opacity-75 group-hover:opacity-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] transition-colors cursor-pointer"
                  >
                    <Pencil size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: 家庭成员（配偶与子女 & 父母与兄弟姐妹） */}
        <section
          data-testid="section-card-family"
          className="px-5 py-4 border-b border-[#ECEEEE] dark:border-slate-700/70"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-expanded={familyExpanded}
              onClick={() => setFamilyExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 text-left py-1 rounded text-[14px] font-bold text-[#212225] dark:text-slate-100 hover:text-[#057091] dark:hover:text-[#58B1CD] transition-colors cursor-pointer"
            >
              <span>家庭成员</span>
              {familyExpanded ? (
                <ChevronUp
                  size={14}
                  className="text-[#56585A] dark:text-slate-400"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  size={14}
                  className="text-[#56585A] dark:text-slate-400"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {familyExpanded && (
            <div className="mt-3">
              <PersonFamilySection
                person={person}
                allPersons={allPersons}
                clanSurname={clanSurname}
                isWide={width >= 540}
                onSelectPerson={(targetId) => onSelectPerson?.(targetId)}
                onAddChild={(fid, motherInfo) =>
                  onAddChild(fid, 'male', motherInfo)
                }
                onAddSpouse={(pid) => onAddSpouse(pid)}
                onEditMarriage={openEditMarriageModal}
                onEditParentChild={(childId) => setEditingParentChildId(childId)}
              />
            </div>
          )}
        </section>

        {/* Section 3: 时间线 (Unified Events: 出生/去世/结婚/教育/工作/迁居/其他) */}
        <section className="px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-expanded={timelineExpanded}
              onClick={() => setTimelineExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 text-left py-1 rounded text-[14px] font-bold text-[#212225] dark:text-slate-100 hover:text-[#057091] dark:hover:text-[#58B1CD] transition-colors cursor-pointer"
            >
              <span>时间线</span>
              <span className="text-[12.5px] font-medium text-[#56585A] dark:text-slate-400 tabular-nums">
                （{timelineEvents.length}）
              </span>
              {timelineExpanded ? (
                <ChevronUp
                  size={14}
                  className="text-[#56585A] dark:text-slate-400"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  size={14}
                  className="text-[#56585A] dark:text-slate-400"
                  aria-hidden="true"
                />
              )}
            </button>

            <button
              type="button"
              aria-haspopup="dialog"
              onClick={openCreateEventModal}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[12.5px] font-semibold text-[#057091] dark:text-[#58B1CD] hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus size={13} aria-hidden="true" />
              <span>新增</span>
            </button>
          </div>

          {timelineExpanded && (
            <div className="mt-3">
              {timelineEvents.length === 0 ? (
                <div className="py-2 space-y-2">
                  <p className="text-[13px] text-[#737679] dark:text-slate-400">
                    暂无时间线事件，可点击右上角「新增」统一录入出生、求学、任职、婚姻、迁居或卒葬等生平事件。
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#ECEEEE] dark:divide-slate-700/60">
                  {timelineEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="group py-3 first:pt-1 last:pb-1 flex items-start justify-between gap-2.5"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Left Time Column */}
                        <div className="w-[68px] shrink-0 pt-0.5">
                          <div className="text-[13.5px] font-bold text-[#212225] dark:text-slate-100 tabular-nums leading-snug break-words">
                            {ev.yearLabel}
                          </div>
                          {ev.ageLabel && (
                            <div className="text-[11.5px] text-[#737679] dark:text-slate-400 tabular-nums mt-0.5">
                              {ev.ageLabel}
                            </div>
                          )}
                        </div>

                        {/* Event Details Column */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-[13.5px] font-semibold text-[#212225] dark:text-slate-100 leading-snug">
                            {ev.title}
                          </div>

                          {ev.relatedPerson && (
                            <div>
                              {ev.relatedPerson.personId && onSelectPerson ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onSelectPerson(
                                      ev.relatedPerson!.personId!
                                    )
                                  }
                                  className="inline-flex items-center gap-2 py-0.5 text-[13px] font-medium text-[#057091] dark:text-[#58B1CD] hover:underline underline-offset-2 cursor-pointer"
                                >
                                  <AvatarPortrait
                                    avatarUrl={ev.relatedPerson.avatarUrl}
                                    displayName={ev.relatedPerson.displayName}
                                    gender={ev.relatedPerson.gender}
                                    sizeClass="w-6 h-6"
                                    textClass="text-[10px]"
                                  />
                                  <span className="truncate">
                                    {ev.relatedPerson.displayName}
                                  </span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-2 py-0.5 text-[13px] font-medium text-[#212225] dark:text-slate-200">
                                  <AvatarPortrait
                                    avatarUrl={ev.relatedPerson.avatarUrl}
                                    displayName={ev.relatedPerson.displayName}
                                    gender={ev.relatedPerson.gender}
                                    sizeClass="w-6 h-6"
                                    textClass="text-[10px]"
                                  />
                                  <span className="truncate">
                                    {ev.relatedPerson.displayName}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}

                          {ev.detailText && (
                            <div className="text-[12.5px] text-[#212225] dark:text-slate-200 leading-relaxed">
                              {ev.detailText}
                            </div>
                          )}

                          {ev.dateText && (
                            <div className="text-[12px] text-[#56585A] dark:text-slate-400 tabular-nums">
                              {ev.dateText}
                            </div>
                          )}

                          {ev.placeText && (
                            <div className="text-[12px] text-[#56585A] dark:text-slate-400">
                              {ev.placeText}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Unified Event Edit Icon Button */}
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => openEditTimelineEventModal(ev)}
                        title={`编辑${ev.title}事件`}
                        aria-label={`编辑${ev.title}事件`}
                        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[#56585A] dark:text-slate-400 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] transition-colors cursor-pointer"
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* 4. Fixed Bottom Safe Zone Action Bar — Delete Person Only */}
      <div className="shrink-0 border-t border-[#E0E2E2] dark:border-slate-700/80 bg-[#F9FAFA] dark:bg-[#22272F] px-5 py-3.5">
        {isRoot ? (
          <p className="text-center text-[12.5px] text-[#737679] dark:text-slate-400 select-none">
            开基始祖节点不可从世系中删除
          </p>
        ) : !confirmDeleteSelf ? (
          <button
            type="button"
            data-testid="drawer-delete-person-button"
            onClick={() => setConfirmDeleteSelf(true)}
            className="w-full h-9 rounded-[6px] border border-[#E5C5C5] dark:border-red-900/50 bg-white dark:bg-[#1E2329] text-[13.5px] font-semibold text-[#C93B3B] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-[#C93B3B]/60 transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C93B3B]/40"
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>删除此人</span>
          </button>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[12.5px] text-center font-medium text-[#C93B3B] dark:text-red-400">
              确认从世系中删除「{displayName}」？
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteSelf(false)}
                className="flex-1 h-9 rounded-[6px] border border-[#D8DADA] dark:border-slate-600 bg-white dark:bg-[#1E2329] text-[13px] font-semibold text-[#56585A] dark:text-slate-200 hover:bg-[#F5F6F6] dark:hover:bg-slate-700/70 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                data-testid="drawer-confirm-delete-person-button"
                onClick={() => {
                  setConfirmDeleteSelf(false);
                  onDeletePerson(person.id);
                }}
                className="flex-1 h-9 rounded-[6px] bg-[#C93B3B] hover:bg-[#B22E2E] active:bg-[#9C2525] text-[13px] font-semibold text-white shadow-xs transition-colors cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Portrait Gallery & Cropper Modal */}
      <PersonPortraitModal
        isOpen={portraitModalOpen}
        person={person}
        displayName={displayName}
        onClose={() => setPortraitModalOpen(false)}
        onUpdateAvatar={(updates) => onUpdatePerson(person.id, updates)}
      />

      {/* Unified Event Editor Modal */}
      <PersonEventModal
        context={eventEditContext}
        personDisplayName={
          eventEditContext && eventEditContext.targetPersonId !== person.id
            ? resolvePersonDisplayName(
                allPersons.find(
                  (p) => p.id === eventEditContext.targetPersonId
                ) || person,
                clanSurname
              )
            : displayName
        }
        allPersons={allPersons}
        onClose={() => setEventEditContext(null)}
        onSubmit={handleUnifiedEventSubmit}
        onDelete={handleUnifiedEventDelete}
      />

      {/* Quick Name / Gender Dialog for Vitals Card */}
      <PersonVitalEditModal
        field={vitalQuickEditField}
        person={person}
        clanSurname={clanSurname}
        onClose={() => setVitalQuickEditField(null)}
        onSave={(updates) => onUpdatePerson(person.id, updates)}
      />

      {/* Parent-Child Relationship Editor Modal */}
      <ParentChildRelationModal
        childPerson={
          editingParentChildId
            ? allPersons.find((p) => p.id === editingParentChildId) || null
            : null
        }
        allPersons={allPersons}
        clanSurname={clanSurname}
        onClose={() => setEditingParentChildId(null)}
        onSave={(childId, updates) => {
          const target = allPersons.find((p) => p.id === childId);
          if (!target) return;
          const normalized = normalizePersonForSave(
            { ...target, ...updates },
            allPersons
          );
          onUpdatePerson(childId, normalized);
        }}
      />
    </aside>
  );
};
