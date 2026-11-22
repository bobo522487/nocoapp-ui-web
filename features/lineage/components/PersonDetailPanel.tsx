import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  IdCard,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../lib/utils';
import {
  DateInput,
  readGenealogyDate,
  writeGenealogyDate,
} from '../../date-input';
import { formatGenealogyDate } from '../../date-input/date-format';
import type { GenealogyDate } from '../../date-input/date.types';
import {
  PlaceInput,
  formatGenealogyPlace,
  readGenealogyPlace,
  writeGenealogyPlace,
} from '../../place-input';
import {
  PersonCareerEntry,
  PersonEducationEntry,
  PersonRecord,
} from '../types';
import { formatGivenName } from '../utils/nameUtils';
import {
  EDUCATION_LEVEL_OPTIONS,
  computeAutoRankLabel,
  getDerivedSpouses,
  hydratePersonDraft,
  normalizePersonForSave,
  parseAliasList,
  readEntryGenealogyDate,
  writeEntryGenealogyDate,
} from '../utils/personHelpers';
import {
  EVENT_TYPE_LABELS,
  EventEditContext,
  PersonTimelineEvent,
  UnifiedEventSubmitPayload,
  applyUnifiedEventToPerson,
  buildImmediateFamilyGroups,
  buildPersonTimelineEvents,
  formatHeaderBirthLine,
  removeUnifiedEventFromPerson,
  resolvePersonDisplayName,
  resolvePersonRelationshipHeader,
  resolveRomanizedDisplayName,
} from '../utils/personTimeline';
import { PersonEventModal } from './PersonEventModal';
import { PersonFamilySection } from './PersonFamilySection';
import { PersonProfileModal } from './PersonProfileModal';
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

type DrawerMode = 'browse' | 'edit';
type EditSectionKey = 'basic' | 'vital' | 'other' | 'family' | 'biography';

interface BlueThemeRadioProps {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}

const BlueThemeRadio: React.FC<BlueThemeRadioProps> = ({
  name,
  value,
  checked,
  label,
  onChange,
}) => (
  <label
    className={cn(
      'inline-flex items-center gap-2 cursor-pointer select-none py-1 pr-2 text-[13.5px] transition-colors',
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
        'w-[17px] h-[17px] rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
        checked
          ? 'border-[#057091] bg-white dark:bg-slate-900'
          : 'border-[#737679] dark:border-slate-500 bg-white dark:bg-slate-900'
      )}
    >
      {checked && <span className="w-[8px] h-[8px] rounded-full bg-[#057091]" />}
    </span>
    <span>{label}</span>
  </label>
);

interface EditSectionBlockProps {
  sectionKey: EditSectionKey;
  title: string;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const EditSectionBlock: React.FC<EditSectionBlockProps> = ({
  sectionKey,
  title,
  summary,
  expanded,
  onToggle,
  children,
}) => {
  const headerId = `person-edit-header-${sectionKey}`;
  const panelId = `person-edit-panel-${sectionKey}`;

  return (
    <section
      aria-label={title}
      className="rounded-[8px] border border-[#E0E2E2] dark:border-slate-700/80 bg-white dark:bg-[#1E2329] overflow-hidden"
    >
      <button
        type="button"
        id={headerId}
        aria-controls={panelId}
        aria-expanded={expanded}
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-[#F5F6F6]/70 dark:bg-[#252B33]/70 hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors cursor-pointer"
      >
        <span className="text-[13.5px] font-bold text-[#212225] dark:text-slate-100 whitespace-nowrap shrink-0">
          {title}
        </span>
        <span className="flex items-center gap-2 min-w-0">
          {!expanded && summary && (
            <span className="text-[12px] text-[#56585A] dark:text-slate-400 truncate tabular-nums">
              {summary}
            </span>
          )}
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={cn(
              'text-[#56585A] dark:text-slate-400 shrink-0 transition-transform duration-150',
              expanded ? 'rotate-180' : ''
            )}
          />
        </span>
      </button>

      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="px-4 py-4 border-t border-[#E0E2E2] dark:border-slate-700/80 space-y-4"
        >
          {children}
        </div>
      )}
    </section>
  );
};

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

function createEmptyEducationEntry(seedIndex = 1): PersonEducationEntry {
  return {
    id: `edu-${Date.now()}-${seedIndex}-${Math.random().toString(36).slice(2, 5)}`,
    period: '',
    level: '',
    school: '',
  };
}

function createEmptyCareerEntry(seedIndex = 1): PersonCareerEntry {
  return {
    id: `career-${Date.now()}-${seedIndex}-${Math.random().toString(36).slice(2, 5)}`,
    period: '',
    location: '',
    organization: '',
    position: '',
  };
}

export const PersonDetailPanel: React.FC<PersonDetailPanelProps> = ({
  person,
  allPersons,
  clanSurname = '',
  onSelectPerson,
  onUpdatePerson,
  onDeletePerson,
  onAddChild,
  onAddSpouse,
  onAddSibling,
  width,
  onClose,
}) => {
  const [mode, setMode] = useState<DrawerMode>('browse');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Unified Event Editor & Vital Quick Edit Modals
  const [eventEditContext, setEventEditContext] =
    useState<EventEditContext | null>(null);
  const [vitalQuickEditField, setVitalQuickEditField] =
    useState<VitalQuickEditField>(null);

  // Browse-mode collapsible sections & menus
  const [vitalsExpanded, setVitalsExpanded] = useState(true);
  const [vitalsDetailedView, setVitalsDetailedView] = useState(false);
  const [familyExpanded, setFamilyExpanded] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [addMenuSource, setAddMenuSource] = useState<
    'actions' | 'family' | null
  >(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [confirmDeleteSelf, setConfirmDeleteSelf] = useState(false);

  // Edit-mode draft & section state
  const [formData, setFormData] = useState<PersonRecord | null>(null);
  const [aliasInput, setAliasInput] = useState('');
  const [expandedEditSections, setExpandedEditSections] = useState<
    Record<EditSectionKey, boolean>
  >({
    basic: true,
    vital: true,
    other: false,
    family: false,
    biography: false,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const familyAddMenuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const prevPersonIdRef = useRef<string | null>(null);

  // Hydrate draft & reset to Browse Mode whenever selected person changes
  useEffect(() => {
    if (!person) {
      prevPersonIdRef.current = null;
      setFormData(null);
      setAliasInput('');
      setMode('browse');
      setProfileModalOpen(false);
      setEventEditContext(null);
      setVitalQuickEditField(null);
      setAddMenuSource(null);
      setMoreMenuOpen(false);
      setConfirmDeleteSelf(false);
      return;
    }

    const personChanged = prevPersonIdRef.current !== person.id;
    prevPersonIdRef.current = person.id;

    if (personChanged) {
      setMode('browse');
      setEventEditContext(null);
      setVitalQuickEditField(null);
      setAddMenuSource(null);
      setMoreMenuOpen(false);
      setConfirmDeleteSelf(false);
    }

    if (personChanged || mode === 'browse') {
      const hydrated = hydratePersonDraft(person, clanSurname);
      const eduHistory = hydrated.career?.educationHistory || [];
      const careerHistory = hydrated.career?.careerHistory || [];
      setFormData({
        ...hydrated,
        career: {
          ...(hydrated.career || {}),
          educationHistory:
            eduHistory.length > 0
              ? eduHistory
              : [createEmptyEducationEntry(1)],
          careerHistory:
            careerHistory.length > 0
              ? careerHistory
              : [createEmptyCareerEntry(1)],
        },
      });
      setAliasInput('');
    }
  }, [person, clanSurname, mode]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    if (!addMenuSource && !moreMenuOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        addMenuSource === 'actions' &&
        addMenuContainerRef.current &&
        !addMenuContainerRef.current.contains(target)
      ) {
        setAddMenuSource(null);
      }
      if (
        addMenuSource === 'family' &&
        familyAddMenuRef.current &&
        !familyAddMenuRef.current.contains(target)
      ) {
        setAddMenuSource(null);
      }
      if (
        moreMenuOpen &&
        moreMenuContainerRef.current &&
        !moreMenuContainerRef.current.contains(target)
      ) {
        setMoreMenuOpen(false);
        setConfirmDeleteSelf(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAddMenuSource(null);
        setMoreMenuOpen(false);
        setConfirmDeleteSelf(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [addMenuSource, moreMenuOpen]);

  const enterEditMode = useCallback(
    (focusSection?: EditSectionKey) => {
      if (!person) return;
      const hydrated = hydratePersonDraft(person, clanSurname);
      const eduHistory = hydrated.career?.educationHistory || [];
      const careerHistory = hydrated.career?.careerHistory || [];
      setFormData({
        ...hydrated,
        career: {
          ...(hydrated.career || {}),
          educationHistory:
            eduHistory.length > 0
              ? eduHistory
              : [createEmptyEducationEntry(1)],
          careerHistory:
            careerHistory.length > 0
              ? careerHistory
              : [createEmptyCareerEntry(1)],
        },
      });
      setAliasInput('');
      setAddMenuSource(null);
      setMoreMenuOpen(false);
      if (focusSection) {
        setExpandedEditSections((prev) => ({
          ...prev,
          [focusSection]: true,
        }));
      }
      setMode('edit');
    },
    [person, clanSurname]
  );

  const handleSaveAndReturn = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!person || !formData) return;

      const pendingAliases = aliasInput
        .split(/[、,，;；]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const mergedAliases = Array.from(
        new Set([...(formData.aliases || []), ...pendingAliases])
      );
      const normalized = normalizePersonForSave(
        { ...formData, aliases: mergedAliases },
        allPersons
      );
      onUpdatePerson(person.id, normalized);
      setAliasInput('');
      setMode('browse');
    },
    [person, formData, aliasInput, allPersons, onUpdatePerson]
  );

  const handleCancelEdit = useCallback(() => {
    if (person) {
      const hydrated = hydratePersonDraft(person, clanSurname);
      const eduHistory = hydrated.career?.educationHistory || [];
      const careerHistory = hydrated.career?.careerHistory || [];
      setFormData({
        ...hydrated,
        career: {
          ...(hydrated.career || {}),
          educationHistory:
            eduHistory.length > 0
              ? eduHistory
              : [createEmptyEducationEntry(1)],
          careerHistory:
            careerHistory.length > 0
              ? careerHistory
              : [createEmptyCareerEntry(1)],
        },
      });
    }
    setAliasInput('');
    setMode('browse');
  }, [person, clanSurname]);

  // Cmd/Ctrl+S shortcut when in edit mode
  useEffect(() => {
    if (!person || mode !== 'edit') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAndReturn();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [person, mode, handleSaveAndReturn]);

  // Derived data for Browse Mode
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

  const immediateFamily = useMemo(
    () =>
      person
        ? buildImmediateFamilyGroups(person, allPersons, clanSurname)
        : { upperGroup: [], lowerGroup: [], totalCount: 0 },
    [person, allPersons, clanSurname]
  );

  const timelineEvents = useMemo(
    () =>
      person ? buildPersonTimelineEvents(person, allPersons, clanSurname) : [],
    [person, allPersons, clanSurname]
  );

  const systemRankDisplay = useMemo(() => {
    if (!formData) return '';
    const mergedPersons = allPersons.map((p) =>
      p.id === formData.id ? formData : p
    );
    return computeAutoRankLabel(formData, mergedPersons);
  }, [allPersons, formData]);

  const familyCounts = useMemo(() => {
    if (!formData) return { spouses: 0, children: 0 };
    const primaryId = formData.spouseOfId || formData.id;
    const primaryPerson =
      allPersons.find((p) => p.id === primaryId) || formData;
    const spouseNodes = allPersons.filter((p) => p.spouseOfId === primaryId);
    const legacySpousesCount = (primaryPerson.spouses || []).filter(
      (s) => s.name?.trim() && !spouseNodes.some((n) => n.id === s.id)
    ).length;
    const childrenCount = allPersons.filter(
      (p) => p.fatherId === primaryId && !p.spouseOfId
    ).length;
    return {
      spouses: spouseNodes.length + legacySpousesCount,
      children: childrenCount,
    };
  }, [allPersons, formData]);

  if (!person || !formData) return null;

  const isSpouseNode = Boolean(person.spouseOfId);
  const isRoot = person.generation === 1 && !isSpouseNode;

  // Vitals formatted values for Browse Mode
  const vitalGenderText =
    person.gender === 'male'
      ? '男'
      : person.gender === 'female'
        ? '女'
        : '未知';
  const vitalAliases = parseAliasList(person.aliases, person.courtesyName);

  const vitalBirthDateText = (
    person.birth?.structuredDate
      ? formatGenealogyDate(person.birth.structuredDate)
      : person.birth?.date || person.birthDate || ''
  ).trim();
  const vitalBirthPlaceText = (
    person.birth?.structuredPlace
      ? formatGenealogyPlace(person.birth.structuredPlace)
      : person.birth?.place || ''
  ).trim();

  const vitalDeathDateText = (
    person.death?.structuredDate
      ? formatGenealogyDate(person.death.structuredDate)
      : person.death?.date || person.deathDate || ''
  ).trim();
  const vitalDeathPlaceText = (
    person.death?.structuredPlace
      ? formatGenealogyPlace(person.death.structuredPlace)
      : person.death?.place || ''
  ).trim();
  const vitalBurialPlaceText = (
    person.death?.structuredBurialPlace
      ? formatGenealogyPlace(person.death.structuredBurialPlace)
      : person.death?.burialPlace || person.burialPlace || ''
  ).trim();

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
        statusOverride: person.status,
        deathCause: person.death?.cause || '',
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
      ev.sourceKind === 'education' ||
      ev.sourceKind === 'career' ||
      ev.sourceKind === 'custom_event' ||
      ev.sourceKind === 'burial';

    setEventEditContext({
      mode: 'edit',
      sourceKind: ev.sourceKind,
      sourceId: ev.sourceId,
      targetPersonId: target.id,
      canDelete,
      initialEvent: {
        type: ev.eventType,
        customTypeLabel: ev.customTypeLabel,
        structuredDate: resolvedDate,
        structuredPlace: resolvedPlace,
        description: ev.description || '',
        statusOverride: ev.eventType === 'death' ? target.status : undefined,
        deathCause: ev.deathCause || target.death?.cause || '',
        organization: ev.organization || '',
        position: ev.position || '',
        educationLevel: ev.educationLevel || '',
        relatedPersonId: ev.relatedPerson?.personId,
        relatedPersonName: ev.relatedPerson?.displayName,
      },
    });
  };

  const handleUnifiedEventSubmit = (
    ctx: EventEditContext,
    payload: UnifiedEventSubmitPayload
  ) => {
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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const nextAvatar = reader.result;
        setFormData((prev) => (prev ? { ...prev, avatarUrl: nextAvatar } : prev));
        onUpdatePerson(person.id, { avatarUrl: nextAvatar });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setFormData((prev) => (prev ? { ...prev, avatarUrl: undefined } : prev));
    onUpdatePerson(person.id, { avatarUrl: undefined });
    setMoreMenuOpen(false);
  };

  // Edit-mode field helpers
  const updateDraft = (updater: (prev: PersonRecord) => PersonRecord) => {
    setFormData((prev) => (prev ? updater(prev) : prev));
  };

  const handleFieldChange = <K extends keyof PersonRecord>(
    field: K,
    value: PersonRecord[K]
  ) => {
    updateDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenderChange = (nextGender: 'male' | 'female' | 'unknown') => {
    updateDraft((prev) => {
      if (prev.spouseOfId) {
        const nextRel =
          prev.relationType === '妻子' ||
          prev.relationType === '丈夫' ||
          !prev.relationType
            ? nextGender === 'male'
              ? '丈夫'
              : nextGender === 'female'
                ? '妻子'
                : '配偶'
            : prev.relationType;
        return { ...prev, gender: nextGender, relationType: nextRel };
      }
      let nextRelation = prev.relationType;
      if (nextGender === 'female') {
        if (nextRelation === '继子') nextRelation = '继女';
        else if (nextRelation === '养子') nextRelation = '养女';
        else if (nextRelation === '生子') nextRelation = '生女';
      } else if (nextGender === 'male') {
        if (nextRelation === '继女') nextRelation = '继子';
        else if (nextRelation === '养女') nextRelation = '养子';
        else if (nextRelation === '生女') nextRelation = '生子';
      }
      return { ...prev, gender: nextGender, relationType: nextRelation };
    });
  };

  const commitAliasInput = (rawText: string) => {
    const items = rawText
      .split(/[、,，;；]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) {
      setAliasInput('');
      return;
    }
    updateDraft((prev) => {
      const merged = Array.from(new Set([...(prev.aliases || []), ...items]));
      return {
        ...prev,
        aliases: merged,
        courtesyName: merged.join('、'),
      };
    });
    setAliasInput('');
  };

  const handleRemoveAlias = (aliasToRemove: string) => {
    updateDraft((prev) => {
      const next = (prev.aliases || []).filter((a) => a !== aliasToRemove);
      return {
        ...prev,
        aliases: next,
        courtesyName: next.join('、'),
      };
    });
  };

  const educationEntries: PersonEducationEntry[] =
    formData.career?.educationHistory &&
    formData.career.educationHistory.length > 0
      ? formData.career.educationHistory
      : [createEmptyEducationEntry(1)];

  const careerEntries: PersonCareerEntry[] =
    formData.career?.careerHistory && formData.career.careerHistory.length > 0
      ? formData.career.careerHistory
      : [createEmptyCareerEntry(1)];

  const handleUpdateEducationEntry = (
    entryId: string,
    field: keyof Omit<PersonEducationEntry, 'id' | 'structuredPeriod'>,
    value: string
  ) => {
    updateDraft((prev) => {
      const list =
        prev.career?.educationHistory && prev.career.educationHistory.length > 0
          ? prev.career.educationHistory
          : educationEntries;
      return {
        ...prev,
        career: {
          ...(prev.career || {}),
          educationHistory: list.map((item) =>
            item.id === entryId ? { ...item, [field]: value } : item
          ),
        },
      };
    });
  };

  const handleUpdateEducationDate = (
    entryId: string,
    nextDate: GenealogyDate | null
  ) => {
    updateDraft((prev) => {
      const list =
        prev.career?.educationHistory && prev.career.educationHistory.length > 0
          ? prev.career.educationHistory
          : educationEntries;
      return {
        ...prev,
        career: {
          ...(prev.career || {}),
          educationHistory: list.map((item) =>
            item.id === entryId ? writeEntryGenealogyDate(item, nextDate) : item
          ),
        },
      };
    });
  };

  const handleAddEducationEntry = () => {
    updateDraft((prev) => {
      const list =
        prev.career?.educationHistory && prev.career.educationHistory.length > 0
          ? prev.career.educationHistory
          : educationEntries;
      return {
        ...prev,
        career: {
          ...(prev.career || {}),
          educationHistory: [
            ...list,
            createEmptyEducationEntry(list.length + 1),
          ],
        },
      };
    });
  };

  const handleRemoveEducationEntry = (entryId: string) => {
    updateDraft((prev) => {
      const list = prev.career?.educationHistory || [];
      const remaining = list.filter((item) => item.id !== entryId);
      return {
        ...prev,
        career: {
          ...(prev.career || {}),
          educationHistory:
            remaining.length > 0 ? remaining : [createEmptyEducationEntry(1)],
        },
      };
    });
  };

  const handleUpdateCareerEntry = (
    entryId: string,
    field: keyof Omit<PersonCareerEntry, 'id' | 'structuredPeriod'>,
    value: string
  ) => {
    updateDraft((prev) => {
      const list =
        prev.career?.careerHistory && prev.career.careerHistory.length > 0
          ? prev.career.careerHistory
          : careerEntries;
      return {
        ...prev,
        career: {
          ...(prev.career || {}),
          careerHistory: list.map((item) =>
            item.id === entryId ? { ...item, [field]: value } : item
          ),
        },
      };
    });
  };

  const handleUpdateCareerDate = (
    entryId: string,
    nextDate: GenealogyDate | null
  ) => {
    updateDraft((prev) => {
      const list =
        prev.career?.careerHistory && prev.career.careerHistory.length > 0
          ? prev.career.careerHistory
          : careerEntries;
      return {
        ...prev,
        career: {
          ...(prev.career || {}),
          careerHistory: list.map((item) =>
            item.id === entryId ? writeEntryGenealogyDate(item, nextDate) : item
          ),
        },
      };
    });
  };

  const handleAddCareerEntry = () => {
    updateDraft((prev) => {
      const list =
        prev.career?.careerHistory && prev.career.careerHistory.length > 0
          ? prev.career.careerHistory
          : careerEntries;
      return {
        ...prev,
        career: {
          ...(prev.career || {}),
          careerHistory: [...list, createEmptyCareerEntry(list.length + 1)],
        },
      };
    });
  };

  const handleRemoveCareerEntry = (entryId: string) => {
    updateDraft((prev) => {
      const list = prev.career?.careerHistory || [];
      const remaining = list.filter((item) => item.id !== entryId);
      return {
        ...prev,
        career: {
          ...(prev.career || {}),
          careerHistory:
            remaining.length > 0 ? remaining : [createEmptyCareerEntry(1)],
        },
      };
    });
  };

  const renderAddRelativeDropdown = () => (
    <div
      role="menu"
      aria-label="加入亲属"
      className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-[12px] bg-white dark:bg-[#252B33] border border-[#D8DADA] dark:border-slate-700 shadow-[0_10px_28px_rgba(0,0,0,0.16)] py-1.5 text-[14px]"
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setAddMenuSource(null);
          onAddSpouse(person.id);
        }}
        className="w-full px-4 py-2 text-left text-[#212225] dark:text-slate-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] flex items-center gap-2.5 transition-colors cursor-pointer"
      >
        <Users size={14} className="shrink-0" aria-hidden="true" />
        <span>加入配偶</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setAddMenuSource(null);
          onAddChild(person.id, 'male');
        }}
        className="w-full px-4 py-2 text-left text-[#212225] dark:text-slate-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] flex items-center gap-2.5 transition-colors cursor-pointer"
      >
        <UserPlus size={14} className="shrink-0" aria-hidden="true" />
        <span>加入儿子</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setAddMenuSource(null);
          onAddChild(person.id, 'female');
        }}
        className="w-full px-4 py-2 text-left text-[#212225] dark:text-slate-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] flex items-center gap-2.5 transition-colors cursor-pointer"
      >
        <UserPlus size={14} className="shrink-0" aria-hidden="true" />
        <span>加入女儿</span>
      </button>

      {onAddSibling && (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAddMenuSource(null);
              onAddSibling(person.id, 'male');
            }}
            className="w-full px-4 py-2 text-left text-[#212225] dark:text-slate-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <UserPlus size={14} className="shrink-0" aria-hidden="true" />
            <span>加入兄弟</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAddMenuSource(null);
              onAddSibling(person.id, 'female');
            }}
            className="w-full px-4 py-2 text-left text-[#212225] dark:text-slate-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <UserPlus size={14} className="shrink-0" aria-hidden="true" />
            <span>加入姐妹</span>
          </button>
        </>
      )}
    </div>
  );

  const editHeaderBaseName = isSpouseNode
    ? [
        formData.surname?.trim() &&
        !formData.name.startsWith(formData.surname.trim())
          ? formData.surname.trim()
          : '',
        formData.name,
      ].join('') || '配偶'
    : formatGivenName(formData.name, formData.surname?.trim() || clanSurname);
  const editDisplayName =
    [editHeaderBaseName, formData.nameSuffix?.trim() || ''].join('') ||
    '未命名';

  const controlInputClass =
    'h-10 rounded-[6px] border-input bg-card text-[14px] text-foreground placeholder:text-placeholder hover:border-[hsl(var(--border-strong))] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:shadow-[var(--shadow-focus-halo)] shadow-[var(--shadow-control)]';

  const labelClass =
    'block text-[13px] font-semibold text-[#212225] dark:text-slate-200 mb-1.5';

  const aliases = formData.aliases || [];
  const isDeceased = formData.status === 'deceased';

  return (
    <aside
      style={{ width }}
      aria-label="人物详情抽屉"
      className="h-full max-w-[calc(100%-48px)] bg-white dark:bg-[#1E2329] text-[#212225] dark:text-slate-100 border-l border-[#D8DADA] dark:border-slate-700/80 flex flex-col overflow-hidden shrink-0 relative z-20"
    >
      {/* Hidden photo upload input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      {mode === 'browse' ? (
        <>
          {/* 1. Header — AddRelativeModal style */}
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
                  onClick={() => fileInputRef.current?.click()}
                  title={person.avatarUrl ? '点击更换照片' : '点击上传照片'}
                  aria-label={person.avatarUrl ? '更换照片' : '上传照片'}
                  className="group relative rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#057091]"
                >
                  <AvatarPortrait
                    avatarUrl={person.avatarUrl}
                    displayName={displayName}
                    gender={person.gender}
                    sizeClass="w-[72px] h-[72px]"
                    textClass="text-[24px]"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white dark:bg-[#1E2329] border border-[#D8DADA] dark:border-slate-600 text-[#56585A] dark:text-slate-300 group-hover:text-[#057091] group-hover:border-[#057091] flex items-center justify-center shadow-xs transition-colors">
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
            {/* 4-Button Action Bar */}
            <div className="px-4 py-3.5 border-b border-[#ECEEEE] dark:border-slate-700/70 grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="group flex flex-col items-center justify-center gap-1.5 py-1.5 rounded-[8px] hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full border border-[#D8DADA] dark:border-slate-600 bg-white dark:bg-[#252B33] text-[#212225] dark:text-slate-200 group-hover:border-[#057091] group-hover:text-[#057091] group-hover:bg-[#EAF4F7] dark:group-hover:border-[#58B1CD] dark:group-hover:text-[#58B1CD] dark:group-hover:bg-[#057091]/20 flex items-center justify-center transition-colors">
                  <IdCard size={17} aria-hidden="true" />
                </span>
                <span className="text-[12px] font-medium text-[#212225] dark:text-slate-200 whitespace-nowrap">
                  个人档案
                </span>
              </button>

              <button
                type="button"
                onClick={() => enterEditMode('basic')}
                className="group flex flex-col items-center justify-center gap-1.5 py-1.5 rounded-[8px] hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full border border-[#D8DADA] dark:border-slate-600 bg-white dark:bg-[#252B33] text-[#212225] dark:text-slate-200 group-hover:border-[#057091] group-hover:text-[#057091] group-hover:bg-[#EAF4F7] dark:group-hover:border-[#58B1CD] dark:group-hover:text-[#58B1CD] dark:group-hover:bg-[#057091]/20 flex items-center justify-center transition-colors">
                  <Pencil size={16} aria-hidden="true" />
                </span>
                <span className="text-[12px] font-medium text-[#212225] dark:text-slate-200 whitespace-nowrap">
                  编辑
                </span>
              </button>

              <div ref={addMenuContainerRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={addMenuSource === 'actions'}
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirmDeleteSelf(false);
                    setAddMenuSource((prev) =>
                      prev === 'actions' ? null : 'actions'
                    );
                  }}
                  className="w-full group flex flex-col items-center justify-center gap-1.5 py-1.5 rounded-[8px] hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors cursor-pointer"
                >
                  <span
                    className={cn(
                      'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
                      addMenuSource === 'actions'
                        ? 'border-[#057091] bg-[#EAF4F7] text-[#057091] dark:border-[#58B1CD] dark:bg-[#057091]/20 dark:text-[#58B1CD]'
                        : 'border-[#D8DADA] dark:border-slate-600 bg-white dark:bg-[#252B33] text-[#212225] dark:text-slate-200 group-hover:border-[#057091] group-hover:text-[#057091] group-hover:bg-[#EAF4F7] dark:group-hover:border-[#58B1CD] dark:group-hover:text-[#58B1CD]'
                    )}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </span>
                  <span className="text-[12px] font-medium text-[#212225] dark:text-slate-200 whitespace-nowrap">
                    新增
                  </span>
                </button>

                {addMenuSource === 'actions' && renderAddRelativeDropdown()}
              </div>

              <div ref={moreMenuContainerRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={moreMenuOpen}
                  onClick={() => {
                    setAddMenuSource(null);
                    setConfirmDeleteSelf(false);
                    setMoreMenuOpen((prev) => !prev);
                  }}
                  className="w-full group flex flex-col items-center justify-center gap-1.5 py-1.5 rounded-[8px] hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors cursor-pointer"
                >
                  <span
                    className={cn(
                      'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
                      moreMenuOpen
                        ? 'border-[#057091] bg-[#EAF4F7] text-[#057091] dark:border-[#58B1CD] dark:bg-[#057091]/20 dark:text-[#58B1CD]'
                        : 'border-[#D8DADA] dark:border-slate-600 bg-white dark:bg-[#252B33] text-[#212225] dark:text-slate-200 group-hover:border-[#057091] group-hover:text-[#057091] group-hover:bg-[#EAF4F7] dark:group-hover:border-[#58B1CD] dark:group-hover:text-[#58B1CD]'
                    )}
                  >
                    <MoreHorizontal size={17} aria-hidden="true" />
                  </span>
                  <span className="text-[12px] font-medium text-[#212225] dark:text-slate-200 whitespace-nowrap">
                    更多
                  </span>
                </button>

                {moreMenuOpen && (
                  <div
                    role="menu"
                    aria-label="更多操作"
                    className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-[8px] bg-white dark:bg-[#252B33] border border-[#D8DADA] dark:border-slate-700 shadow-[0_10px_28px_rgba(0,0,0,0.16)] py-1.5 text-[13px]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3.5 py-2 text-left text-[#212225] dark:text-slate-100 hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/25 hover:text-[#057091] dark:hover:text-[#58B1CD] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Camera size={14} className="shrink-0" aria-hidden="true" />
                      <span>{person.avatarUrl ? '更换照片' : '上传照片'}</span>
                    </button>

                    {person.avatarUrl && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleRemoveAvatar}
                        className="w-full px-3.5 py-2 text-left text-[#56585A] dark:text-slate-300 hover:bg-[#F5F6F6] dark:hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <X size={14} className="shrink-0" aria-hidden="true" />
                        <span>移除当前照片</span>
                      </button>
                    )}

                    {!isRoot && (
                      <>
                        <div className="my-1 border-t border-[#ECEEEE] dark:border-slate-700/70" />
                        {!confirmDeleteSelf ? (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => setConfirmDeleteSelf(true)}
                            className="w-full px-3.5 py-2 text-left text-[#C93B3B] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <Trash2
                              size={14}
                              className="shrink-0"
                              aria-hidden="true"
                            />
                            <span>删除此人</span>
                          </button>
                        ) : (
                          <div className="px-3.5 py-2 space-y-2">
                            <p className="text-[12px] text-[#C93B3B] dark:text-red-400 font-medium">
                              确认从世系中删除此人？
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSelf(false)}
                                className="flex-1 h-7 rounded text-[12px] font-medium text-[#56585A] dark:text-slate-300 bg-[#F5F6F6] dark:bg-slate-700 hover:bg-[#E4E6E6] cursor-pointer"
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteSelf(false);
                                  setMoreMenuOpen(false);
                                  onDeletePerson(person.id);
                                }}
                                className="flex-1 h-7 rounded text-[12px] font-semibold text-white bg-[#C93B3B] hover:bg-[#B02E2E] cursor-pointer"
                              >
                                确认删除
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 1: 重要资料 (replaces 传记, matches section-card-vitals reference) */}
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
                  <span>重要资料</span>
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
                <div className="mt-2.5 space-y-3">
                  {/* 详细资料检视 Switch */}
                  <div
                    data-testid="vitals-detail-view"
                    className="flex items-center gap-2.5 py-0.5"
                  >
                    <button
                      type="button"
                      role="switch"
                      aria-checked={vitalsDetailedView}
                      aria-label="详细资料检视"
                      onClick={() => setVitalsDetailedView((v) => !v)}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#057091]',
                        vitalsDetailedView
                          ? 'bg-[#057091] border-[#057091]'
                          : 'bg-[#D8DADA] dark:bg-slate-600 border-[#C4C7C9] dark:border-slate-500'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform duration-150',
                          vitalsDetailedView
                            ? 'translate-x-[18px]'
                            : 'translate-x-[2px]'
                        )}
                      />
                    </button>
                    <span
                      onClick={() => setVitalsDetailedView((v) => !v)}
                      className="text-[12.5px] font-medium text-[#56585A] dark:text-slate-300 cursor-pointer select-none"
                    >
                      详细资料检视
                    </span>
                  </div>

                  {/* 2-Column Vitals Grid: 名称 / 性别 / 出生 / 死亡 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {/* 1. 名称 */}
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
                          名称
                        </div>
                        <div className="mt-0.5 text-[13.5px] text-[#212225] dark:text-slate-100 leading-snug break-words">
                          <span>{displayName}</span>
                          {romanizedDisplay && (
                            <span className="block text-[12px] text-[#56585A] dark:text-slate-400">
                              {romanizedDisplay}
                            </span>
                          )}
                        </div>
                        {vitalsDetailedView && (
                          <div className="mt-1 space-y-0.5 text-[12px] text-[#56585A] dark:text-slate-400">
                            {vitalAliases.length > 0 && (
                              <div>字号别名：{vitalAliases.join('、')}</div>
                            )}
                            {person.legalName && (
                              <div>常用名：{person.legalName}</div>
                            )}
                            {person.generationWord && (
                              <div>派语字辈：{person.generationWord}</div>
                            )}
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        aria-label="编辑名称"
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
                        {vitalsDetailedView && person.rank && (
                          <div className="mt-1 text-[12px] text-[#56585A] dark:text-slate-400">
                            排行：{person.rank}
                          </div>
                        )}
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
                        {vitalsDetailedView && person.birth?.summary && (
                          <div className="mt-1 text-[12px] text-[#56585A] dark:text-slate-400">
                            {person.birth.summary}
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
                        {vitalsDetailedView &&
                          person.status === 'deceased' && (
                            <div className="mt-1 space-y-0.5 text-[12px] text-[#56585A] dark:text-slate-400">
                              {person.death?.cause && (
                                <div>死因：{person.death.cause}</div>
                              )}
                              {vitalBurialPlaceText && (
                                <div>埋葬：{vitalBurialPlaceText}</div>
                              )}
                              {person.death?.summary && (
                                <div>{person.death.summary}</div>
                              )}
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

            {/* Section 2: 家庭成员 (Collapsible) */}
            <section className="px-5 py-4 border-b border-[#ECEEEE] dark:border-slate-700/70">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-expanded={familyExpanded}
                  onClick={() => setFamilyExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 text-left py-1 rounded text-[14px] font-bold text-[#212225] dark:text-slate-100 hover:text-[#057091] dark:hover:text-[#58B1CD] transition-colors cursor-pointer"
                >
                  <span>家庭成员</span>
                  <span className="text-[12.5px] font-medium text-[#56585A] dark:text-slate-400 tabular-nums">
                    （{immediateFamily.totalCount}）
                  </span>
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

                <div ref={familyAddMenuRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={addMenuSource === 'family'}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setAddMenuSource((prev) =>
                        prev === 'family' ? null : 'family'
                      );
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[12.5px] font-semibold text-[#057091] dark:text-[#58B1CD] hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/20 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={13} aria-hidden="true" />
                    <span>新增</span>
                  </button>

                  {addMenuSource === 'family' && renderAddRelativeDropdown()}
                </div>
              </div>

              {familyExpanded && (
                <div className="mt-3 space-y-2.5">
                  {immediateFamily.totalCount === 0 ? (
                    <p className="text-[13px] text-[#737679] dark:text-slate-400">
                      暂无已关联的家庭成员记录。
                    </p>
                  ) : (
                    <>
                      {immediateFamily.upperGroup.length > 0 && (
                        <ul className="space-y-1">
                          {immediateFamily.upperGroup.map((member) => {
                            const clickable = Boolean(
                              member.personId && onSelectPerson
                            );
                            const rowInner = (
                              <>
                                <AvatarPortrait
                                  avatarUrl={member.avatarUrl}
                                  displayName={member.displayName}
                                  gender={member.gender}
                                  sizeClass="w-11 h-11"
                                  textClass="text-[14px]"
                                />
                                <div className="min-w-0 flex-1 text-left">
                                  <div className="text-[13.5px] font-semibold text-[#212225] dark:text-slate-100 truncate group-hover:text-[#057091] dark:group-hover:text-[#58B1CD] transition-colors">
                                    {member.displayName}
                                  </div>
                                  <div className="text-[12px] text-[#56585A] dark:text-slate-400 truncate">
                                    {member.relationshipLabel}
                                  </div>
                                  {member.yearsLabel && (
                                    <div className="text-[11.5px] text-[#737679] dark:text-slate-400 tabular-nums truncate">
                                      {member.yearsLabel}
                                    </div>
                                  )}
                                </div>
                              </>
                            );

                            return (
                              <li key={member.key}>
                                {clickable ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectPerson?.(member.personId!)
                                    }
                                    className="group w-full flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-[8px] hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors cursor-pointer"
                                  >
                                    {rowInner}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-3 px-2 py-1.5 -mx-2">
                                    {rowInner}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {immediateFamily.upperGroup.length > 0 &&
                        immediateFamily.lowerGroup.length > 0 && (
                          <hr className="border-0 border-t border-[#ECEEEE] dark:border-slate-700/70" />
                        )}

                      {immediateFamily.lowerGroup.length > 0 && (
                        <ul className="space-y-1">
                          {immediateFamily.lowerGroup.map((member) => {
                            const clickable = Boolean(
                              member.personId && onSelectPerson
                            );
                            const rowInner = (
                              <>
                                <AvatarPortrait
                                  avatarUrl={member.avatarUrl}
                                  displayName={member.displayName}
                                  gender={member.gender}
                                  sizeClass="w-11 h-11"
                                  textClass="text-[14px]"
                                />
                                <div className="min-w-0 flex-1 text-left">
                                  <div className="text-[13.5px] font-semibold text-[#212225] dark:text-slate-100 truncate group-hover:text-[#057091] dark:group-hover:text-[#58B1CD] transition-colors">
                                    {member.displayName}
                                  </div>
                                  <div className="text-[12px] text-[#56585A] dark:text-slate-400 truncate">
                                    {member.relationshipLabel}
                                  </div>
                                  {member.yearsLabel && (
                                    <div className="text-[11.5px] text-[#737679] dark:text-slate-400 tabular-nums truncate">
                                      {member.yearsLabel}
                                    </div>
                                  )}
                                </div>
                              </>
                            );

                            return (
                              <li key={member.key}>
                                {clickable ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectPerson?.(member.personId!)
                                    }
                                    className="group w-full flex items-center gap-3 px-2 py-1.5 -mx-2 rounded-[8px] hover:bg-[#F5F6F6] dark:hover:bg-[#252B33] transition-colors cursor-pointer"
                                  >
                                    {rowInner}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-3 px-2 py-1.5 -mx-2">
                                    {rowInner}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  )}
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
                        暂无时间线事件，可点击右上角「新增」统一录入出生、教育、工作、婚姻或去世等生平事件。
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
                                  {ev.relatedPerson.personId &&
                                  onSelectPerson ? (
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
                                        displayName={
                                          ev.relatedPerson.displayName
                                        }
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
                                        displayName={
                                          ev.relatedPerson.displayName
                                        }
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
        </>
      ) : (
        /* EDIT MODE — In-place editing with AddRelativeModal styling & Save/Cancel footer */
        <form
          onSubmit={handleSaveAndReturn}
          className="flex-1 flex flex-col min-h-0"
          noValidate
        >
          {/* Edit Header */}
          <div className="shrink-0 bg-[#F5F6F6] dark:bg-[#252B33] border-b border-[#E0E2E2] dark:border-slate-700/80 px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="点击更换头像照片"
                aria-label="更换头像照片"
                className="group relative rounded-full cursor-pointer shrink-0"
              >
                <AvatarPortrait
                  avatarUrl={formData.avatarUrl}
                  displayName={editDisplayName}
                  gender={formData.gender}
                  sizeClass="w-11 h-11"
                  textClass="text-[15px]"
                />
                <span className="absolute inset-0 rounded-full bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={14} aria-hidden="true" />
                </span>
              </button>
              <div className="min-w-0">
                <h2 className="text-[18px] font-bold leading-snug text-[#212225] dark:text-slate-100 truncate">
                  编辑：{editDisplayName}
                </h2>
                <div className="text-[12.5px] text-[#56585A] dark:text-slate-400 truncate mt-0.5">
                  第 {formData.generation} 世 · 修改后点击「保存并返回」生效
                </div>
              </div>
            </div>

            {onClose && (
              <button
                type="button"
                aria-label="关闭人物抽屉"
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#56585A] dark:text-slate-400 hover:bg-[#E4E6E6] dark:hover:bg-slate-700/70 hover:text-[#212225] dark:hover:text-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* 3px Blue-Teal Accent Strip */}
          <div
            className="h-[3px] w-full bg-[#057091] shrink-0"
            aria-hidden="true"
          />

          {/* Scrollable Edit Form Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3.5 bg-white dark:bg-[#1E2329]">
            {/* 基本资料 */}
            <EditSectionBlock
              sectionKey="basic"
              title="基本资料"
              summary={`${editDisplayName} · ${formData.status === 'living' ? '存' : '歿'}`}
              expanded={expandedEditSections.basic}
              onToggle={() =>
                setExpandedEditSections((prev) => ({
                  ...prev,
                  basic: !prev.basic,
                }))
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="edit-person-surname" className={labelClass}>
                    姓氏
                  </label>
                  <Input
                    id="edit-person-surname"
                    autoComplete="off"
                    maxLength={256}
                    value={formData.surname || ''}
                    onChange={(e) =>
                      handleFieldChange('surname', e.target.value)
                    }
                    placeholder={
                      isSpouseNode
                        ? '如：陈'
                        : clanSurname
                          ? `如：${clanSurname}`
                          : '如：刘'
                    }
                    className={controlInputClass}
                  />
                </div>
                <div>
                  <label htmlFor="edit-person-name" className={labelClass}>
                    名字 <span className="text-[#C93B3B] ml-0.5">*</span>
                  </label>
                  <Input
                    id="edit-person-name"
                    autoComplete="off"
                    maxLength={256}
                    value={formData.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="请输入名字"
                    className={cn(controlInputClass, 'font-semibold')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="edit-person-gen-word" className={labelClass}>
                    字辈派语
                  </label>
                  <Input
                    id="edit-person-gen-word"
                    autoComplete="off"
                    maxLength={32}
                    value={formData.generationWord || ''}
                    onChange={(e) =>
                      handleFieldChange('generationWord', e.target.value)
                    }
                    placeholder="如：伯"
                    className={controlInputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-person-legal-name"
                    className={labelClass}
                  >
                    常用名 / 实名
                  </label>
                  <Input
                    id="edit-person-legal-name"
                    autoComplete="off"
                    maxLength={64}
                    value={formData.legalName || ''}
                    onChange={(e) =>
                      handleFieldChange('legalName', e.target.value)
                    }
                    placeholder="如：身份证姓名"
                    className={controlInputClass}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="edit-person-alias-input"
                    className="text-[13px] font-semibold text-[#212225] dark:text-slate-200"
                  >
                    别名 / 字号
                  </label>
                  <span className="text-[11.5px] text-[#56585A] dark:text-slate-400">
                    回车或逗号分隔添加多个
                  </span>
                </div>
                <div className="min-h-10 w-full rounded-[6px] border border-input bg-card px-2.5 py-1.5 shadow-[var(--shadow-control)] flex flex-wrap items-center gap-1.5 hover:border-[hsl(var(--border-strong))] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:shadow-[var(--shadow-focus-halo)] transition-all">
                  {aliases.map((alias) => (
                    <span
                      key={alias}
                      className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded bg-[#F5F6F6] dark:bg-slate-800 border border-[#D8DADA] dark:border-slate-700 text-[12.5px] text-foreground whitespace-nowrap"
                    >
                      <span>{alias}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAlias(alias)}
                        aria-label={`移除别名 ${alias}`}
                        className="h-4 w-4 rounded flex items-center justify-center text-[#56585A] hover:text-[#C93B3B] cursor-pointer"
                      >
                        <X size={11} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="edit-person-alias-input"
                    type="text"
                    autoComplete="off"
                    maxLength={64}
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' ||
                        e.key === ',' ||
                        e.key === '，' ||
                        e.key === '、'
                      ) {
                        e.preventDefault();
                        commitAliasInput(aliasInput);
                      } else if (
                        e.key === 'Backspace' &&
                        !aliasInput &&
                        aliases.length > 0
                      ) {
                        handleRemoveAlias(aliases[aliases.length - 1]);
                      }
                    }}
                    onBlur={() => {
                      if (aliasInput.trim()) commitAliasInput(aliasInput);
                    }}
                    placeholder={
                      aliases.length > 0
                        ? '继续添加别名...'
                        : '如：字伯宣、号清溪'
                    }
                    className="flex-1 min-w-[120px] h-7 bg-transparent text-[13.5px] text-foreground placeholder:text-placeholder outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className={labelClass}>性别</div>
                  <div
                    role="radiogroup"
                    aria-label="性别"
                    className="flex flex-wrap items-center gap-4"
                  >
                    <BlueThemeRadio
                      name="edit-person-gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      label="男"
                      onChange={() => handleGenderChange('male')}
                    />
                    <BlueThemeRadio
                      name="edit-person-gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      label="女"
                      onChange={() => handleGenderChange('female')}
                    />
                    <BlueThemeRadio
                      name="edit-person-gender"
                      value="unknown"
                      checked={formData.gender === 'unknown'}
                      label="未知"
                      onChange={() => handleGenderChange('unknown')}
                    />
                  </div>
                </div>

                <div>
                  <div className={labelClass}>状态</div>
                  <div
                    role="radiogroup"
                    aria-label="状态"
                    className="flex flex-wrap items-center gap-5"
                  >
                    <BlueThemeRadio
                      name="edit-person-status"
                      value="living"
                      checked={formData.status === 'living'}
                      label="存"
                      onChange={() => handleFieldChange('status', 'living')}
                    />
                    <BlueThemeRadio
                      name="edit-person-status"
                      value="deceased"
                      checked={formData.status === 'deceased'}
                      label="歿"
                      onChange={() => handleFieldChange('status', 'deceased')}
                    />
                  </div>
                </div>
              </div>
            </EditSectionBlock>

            {/* 重要资料（生卒葬） */}
            <EditSectionBlock
              sectionKey="vital"
              title="重要资料（生卒葬）"
              summary={(() => {
                const b = readGenealogyDate(formData, 'birth');
                const txt = b
                  ? formatGenealogyDate(b)
                  : formData.birth?.date || formData.birthDate || '';
                return txt ? `生于 ${txt}` : '待完善';
              })()}
              expanded={expandedEditSections.vital}
              onToggle={() =>
                setExpandedEditSections((prev) => ({
                  ...prev,
                  vital: !prev.vital,
                }))
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label htmlFor="edit-birth-date" className={labelClass}>
                    出生日期
                  </label>
                  <DateInput
                    id="edit-birth-date"
                    label="出生日期"
                    value={readGenealogyDate(formData, 'birth')}
                    onChange={(val) =>
                      updateDraft((prev) =>
                        writeGenealogyDate(prev, 'birth', val)
                      )
                    }
                    enableTime
                    enableOriginal
                    placeholder="如 1977-02-21"
                    className={controlInputClass}
                  />
                </div>
                <div className="sm:col-span-7">
                  <label htmlFor="edit-birth-place" className={labelClass}>
                    出生地点
                  </label>
                  <PlaceInput
                    id="edit-birth-place"
                    label="出生地点"
                    value={readGenealogyPlace(formData, 'birth')}
                    onChange={(val) =>
                      updateDraft((prev) =>
                        writeGenealogyPlace(prev, 'birth', val)
                      )
                    }
                    clanPersons={allPersons}
                    placeholder="输入省市区县或原始地名"
                    className={controlInputClass}
                  />
                </div>
              </div>

              {isDeceased && (
                <div className="space-y-3.5 pt-3 border-t border-[#ECEEEE] dark:border-slate-700/70">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label htmlFor="edit-death-date" className={labelClass}>
                        死亡日期
                      </label>
                      <DateInput
                        id="edit-death-date"
                        label="死亡日期"
                        value={readGenealogyDate(formData, 'death')}
                        onChange={(val) =>
                          updateDraft((prev) =>
                            writeGenealogyDate(prev, 'death', val)
                          )
                        }
                        enableTime
                        enableOriginal
                        placeholder="如 2018-04-03"
                        className={controlInputClass}
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <label htmlFor="edit-death-place" className={labelClass}>
                        死亡地点
                      </label>
                      <PlaceInput
                        id="edit-death-place"
                        label="死亡地点"
                        value={readGenealogyPlace(formData, 'death')}
                        onChange={(val) =>
                          updateDraft((prev) =>
                            writeGenealogyPlace(prev, 'death', val)
                          )
                        }
                        clanPersons={allPersons}
                        placeholder="输入省市区县或原始地名"
                        className={controlInputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label htmlFor="edit-death-cause" className={labelClass}>
                        死亡原因
                      </label>
                      <Input
                        id="edit-death-cause"
                        autoComplete="off"
                        maxLength={120}
                        value={formData.death?.cause || ''}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            death: {
                              ...(prev.death || {}),
                              cause: e.target.value,
                            },
                          }))
                        }
                        placeholder="如：寿终正寝"
                        className={controlInputClass}
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <label htmlFor="edit-burial-place" className={labelClass}>
                        埋葬地点
                      </label>
                      <PlaceInput
                        id="edit-burial-place"
                        label="埋葬地点"
                        value={readGenealogyPlace(formData, 'burial')}
                        onChange={(val) =>
                          updateDraft((prev) =>
                            writeGenealogyPlace(prev, 'burial', val)
                          )
                        }
                        clanPersons={allPersons}
                        placeholder="输入省市区县、山向或陵园"
                        className={controlInputClass}
                      />
                    </div>
                  </div>
                </div>
              )}
            </EditSectionBlock>

            {/* 其他资料（教育与职业 + 事件管理） */}
            <EditSectionBlock
              sectionKey="other"
              title="教育、工作与事件"
              summary={`教育 ${
                educationEntries.filter(
                  (e) =>
                    e.period?.trim() ||
                    e.structuredPeriod ||
                    e.level?.trim() ||
                    e.school?.trim()
                ).length
              } · 工作 ${
                careerEntries.filter(
                  (c) =>
                    c.period?.trim() ||
                    c.structuredPeriod ||
                    c.organization?.trim() ||
                    c.position?.trim()
                ).length
              }${(formData.events?.length || 0) > 0 ? ` · 其他 ${formData.events!.length}` : ''}`}
              expanded={expandedEditSections.other}
              onToggle={() =>
                setExpandedEditSections((prev) => ({
                  ...prev,
                  other: !prev.other,
                }))
              }
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[13px] font-semibold text-[#212225] dark:text-slate-100">
                    教育经历
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddEducationEntry}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#057091] dark:text-[#58B1CD] hover:underline cursor-pointer"
                  >
                    <Plus size={12} aria-hidden="true" />
                    <span>添加</span>
                  </button>
                </div>
                <div className="space-y-2.5">
                  {educationEntries.map((entry, idx) => (
                    <div key={entry.id} className="flex items-end gap-1.5">
                      <div className="flex-1 min-w-0 grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          {idx === 0 && (
                            <label
                              htmlFor={`edit-edu-period-${entry.id}`}
                              className="block text-[11.5px] font-medium text-[#56585A] dark:text-slate-400 mb-1"
                            >
                              开始时间
                            </label>
                          )}
                          <DateInput
                            id={`edit-edu-period-${entry.id}`}
                            label="教育开始时间"
                            value={readEntryGenealogyDate(entry)}
                            onChange={(val) =>
                              handleUpdateEducationDate(entry.id, val)
                            }
                            enableTime={false}
                            enableOriginal
                            placeholder="如 1995-09"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="col-span-3">
                          {idx === 0 && (
                            <label
                              htmlFor={`edit-edu-level-${entry.id}`}
                              className="block text-[11.5px] font-medium text-[#56585A] dark:text-slate-400 mb-1"
                            >
                              学历
                            </label>
                          )}
                          <Select
                            id={`edit-edu-level-${entry.id}`}
                            value={entry.level || ''}
                            isPlaceholder={!entry.level}
                            onChange={(e) =>
                              handleUpdateEducationEntry(
                                entry.id,
                                'level',
                                e.target.value
                              )
                            }
                            className="h-9 text-xs"
                          >
                            <option value="">请选择</option>
                            {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="col-span-4">
                          {idx === 0 && (
                            <label
                              htmlFor={`edit-edu-school-${entry.id}`}
                              className="block text-[11.5px] font-medium text-[#56585A] dark:text-slate-400 mb-1"
                            >
                              学校
                            </label>
                          )}
                          <Input
                            id={`edit-edu-school-${entry.id}`}
                            autoComplete="off"
                            maxLength={120}
                            value={entry.school || ''}
                            onChange={(e) =>
                              handleUpdateEducationEntry(
                                entry.id,
                                'school',
                                e.target.value
                              )
                            }
                            placeholder="如：贵州大学"
                            className="h-9 text-xs px-2.5"
                          />
                        </div>
                      </div>
                      {educationEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEducationEntry(entry.id)}
                          aria-label={`删除教育经历 ${idx + 1}`}
                          className="h-9 w-7 shrink-0 flex items-center justify-center rounded text-[#56585A] hover:text-[#C93B3B] cursor-pointer"
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#ECEEEE] dark:border-slate-700/70">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[13px] font-semibold text-[#212225] dark:text-slate-100">
                    工作 / 功名经历
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddCareerEntry}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#057091] dark:text-[#58B1CD] hover:underline cursor-pointer"
                  >
                    <Plus size={12} aria-hidden="true" />
                    <span>添加</span>
                  </button>
                </div>
                <div className="space-y-2.5">
                  {careerEntries.map((entry, idx) => (
                    <div key={entry.id} className="flex items-end gap-1.5">
                      <div className="flex-1 min-w-0 grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          {idx === 0 && (
                            <label
                              htmlFor={`edit-career-period-${entry.id}`}
                              className="block text-[11.5px] font-medium text-[#56585A] dark:text-slate-400 mb-1"
                            >
                              开始时间
                            </label>
                          )}
                          <DateInput
                            id={`edit-career-period-${entry.id}`}
                            label="工作开始时间"
                            value={readEntryGenealogyDate(entry)}
                            onChange={(val) =>
                              handleUpdateCareerDate(entry.id, val)
                            }
                            enableTime={false}
                            enableOriginal
                            placeholder="如 2002-07"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="col-span-4">
                          {idx === 0 && (
                            <label
                              htmlFor={`edit-career-org-${entry.id}`}
                              className="block text-[11.5px] font-medium text-[#56585A] dark:text-slate-400 mb-1"
                            >
                              单位
                            </label>
                          )}
                          <Input
                            id={`edit-career-org-${entry.id}`}
                            autoComplete="off"
                            maxLength={120}
                            value={entry.organization || ''}
                            onChange={(e) =>
                              handleUpdateCareerEntry(
                                entry.id,
                                'organization',
                                e.target.value
                              )
                            }
                            placeholder="如：省档案馆"
                            className="h-9 text-xs px-2.5"
                          />
                        </div>
                        <div className="col-span-3">
                          {idx === 0 && (
                            <label
                              htmlFor={`edit-career-pos-${entry.id}`}
                              className="block text-[11.5px] font-medium text-[#56585A] dark:text-slate-400 mb-1"
                            >
                              职务
                            </label>
                          )}
                          <Input
                            id={`edit-career-pos-${entry.id}`}
                            autoComplete="off"
                            maxLength={120}
                            value={entry.position || ''}
                            onChange={(e) =>
                              handleUpdateCareerEntry(
                                entry.id,
                                'position',
                                e.target.value
                              )
                            }
                            placeholder="研究员"
                            className="h-9 text-xs px-2"
                          />
                        </div>
                      </div>
                      {careerEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCareerEntry(entry.id)}
                          aria-label={`删除工作经历 ${idx + 1}`}
                          className="h-9 w-7 shrink-0 flex items-center justify-center rounded text-[#56585A] hover:text-[#C93B3B] cursor-pointer"
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {formData.events && formData.events.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-[#ECEEEE] dark:border-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[13px] font-semibold text-[#212225] dark:text-slate-100">
                      其他自定义事件
                    </h4>
                  </div>
                  <ul className="space-y-1.5">
                    {formData.events.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-[#F5F6F6] dark:bg-[#252B33] text-[12px]"
                      >
                        <span className="truncate">
                          <strong>
                            {ev.customTypeLabel ||
                              EVENT_TYPE_LABELS[ev.type] ||
                              '事件'}
                          </strong>
                          {ev.date ? ` · ${ev.date}` : ''}
                          {ev.place ? ` · ${ev.place}` : ''}
                          {ev.description ? ` · ${ev.description}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft((prev) => ({
                              ...prev,
                              events: (prev.events || []).filter(
                                (item) => item.id !== ev.id
                              ),
                            }))
                          }
                          aria-label="删除事件"
                          className="text-[#56585A] hover:text-[#C93B3B] cursor-pointer shrink-0"
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </EditSectionBlock>

            {/* 家庭成员维护 */}
            <EditSectionBlock
              sectionKey="family"
              title="家族成员关系"
              summary={`${systemRankDisplay ? `${systemRankDisplay} · ` : ''}配偶 ${familyCounts.spouses} · 子女 ${familyCounts.children}`}
              expanded={expandedEditSections.family}
              onToggle={() =>
                setExpandedEditSections((prev) => ({
                  ...prev,
                  family: !prev.family,
                }))
              }
            >
              <PersonFamilySection
                person={formData}
                allPersons={allPersons}
                clanSurname={clanSurname}
                isWide={width >= 540}
                onSelectPerson={(targetId) => onSelectPerson?.(targetId)}
                onAddChild={(fid, motherInfo) =>
                  onAddChild(isSpouseNode ? person.id : fid, 'male', motherInfo)
                }
                onAddSpouse={(pid) => onAddSpouse(pid)}
                onAddSibling={onAddSibling}
              />
            </EditSectionBlock>

            {/* 传记与备注 */}
            <EditSectionBlock
              sectionKey="biography"
              title="传记与备注"
              summary={
                formData.biography?.trim()
                  ? `${formData.biography.trim().length} 字`
                  : '未填写'
              }
              expanded={expandedEditSections.biography}
              onToggle={() =>
                setExpandedEditSections((prev) => ({
                  ...prev,
                  biography: !prev.biography,
                }))
              }
            >
              <div>
                <label htmlFor="edit-person-biography" className={labelClass}>
                  人物传记 / 行状事略
                </label>
                <Textarea
                  id="edit-person-biography"
                  rows={4}
                  value={formData.biography || ''}
                  onChange={(e) =>
                    handleFieldChange('biography', e.target.value)
                  }
                  placeholder="填写人物生平事略、功名事迹或补充说明..."
                  className="min-h-[104px] text-[13.5px] p-3 leading-relaxed resize-y"
                />
              </div>

              <div>
                <label htmlFor="edit-person-notes" className={labelClass}>
                  末尾备注
                </label>
                <Input
                  id="edit-person-notes"
                  autoComplete="off"
                  maxLength={256}
                  value={formData.notes || ''}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="如：族谱备注说明"
                  className={controlInputClass}
                />
              </div>
            </EditSectionBlock>
          </div>

          {/* Fixed 72px Footer — exact match with AddRelativeModal */}
          <div className="h-[72px] shrink-0 px-5 border-t border-[#E0E2E2] dark:border-slate-700/80 bg-white dark:bg-[#1E2329] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="h-10 px-5 rounded-[6px] text-[14px] font-semibold text-[#057091] dark:text-[#58B1CD] hover:bg-[#EAF4F7] dark:hover:bg-[#057091]/20 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="h-10 px-6 rounded-[6px] text-[14px] font-semibold bg-[#057091] hover:bg-[#045B76] active:bg-[#034C63] text-white shadow-xs transition-colors cursor-pointer"
            >
              保存并返回
            </button>
          </div>
        </form>
      )}

      {/* Complete Profile Modal */}
      <PersonProfileModal
        isOpen={profileModalOpen}
        person={person}
        allPersons={allPersons}
        clanSurname={clanSurname}
        onClose={() => setProfileModalOpen(false)}
        onEdit={() => enterEditMode('basic')}
        onSelectPerson={(targetId) => onSelectPerson?.(targetId)}
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
    </aside>
  );
};
