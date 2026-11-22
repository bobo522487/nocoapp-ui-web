import { formatGenealogyDate, getPersonDateDisplay } from '../../date-input';
import type { GenealogyDate } from '../../date-input/date.types';
import { formatGenealogyPlace, getPersonPlaceDisplay } from '../../place-input';
import {
  BiographyPreviewPreferences,
  PersonEventType,
  PersonLifeEvent,
  PersonRecord,
  RelationKind,
} from '../types';
import { formatGivenName } from './nameUtils';

export const RELATION_TYPE_OPTIONS: RelationKind[] = [
  '生子',
  '抚子',
  '养子',
  '继子',
  '赘子',
  '义子',
  '出继',
  '出嗣',
  '承嗣',
  '出祧',
  '兼祧',
  '出绍',
  '过继',
  '承继',
  '奉祀',
  '无(断代)',
];

export const FEMALE_RELATION_TYPE_OPTIONS: RelationKind[] = [
  '生女',
  '继女',
  '养女',
];

export const SPOUSE_TYPE_OPTIONS = ['妻子', '丈夫', '配偶'] as const;

export const SPOUSE_RANK_OPTIONS = ['原配', '继配', '三配', '四配'] as const;

export const SPOUSE_RANK_ORDER: Record<string, number> = {
  原配: 1,
  元配: 1,
  正室: 1,
  继配: 2,
  次配: 2,
  再配: 2,
  三配: 3,
  四配: 4,
  五配: 5,
  六配: 6,
};


function getRankScore(p: PersonRecord): number {
  if (p.siblingOrder !== undefined) return p.siblingOrder;
  if (p.biographyOrder !== undefined) return p.biographyOrder;
  return 50;
}

export function getSpouseSortScore(person: PersonRecord): number {
  if (person.siblingOrder !== undefined) return person.siblingOrder;
  if (person.biographyOrder !== undefined) return person.biographyOrder;
  return 50;
}

export interface LineageGraphIndex {
  personById: Map<string, PersonRecord>;
  childrenByFatherId: Map<string, PersonRecord[]>;
  spousesByPartnerId: Map<string, PersonRecord[]>;
}

/**
 * Build O(N) adjacency index over PersonRecord[] for fast lookups across tables,
 * grids, stats, book compilation, and canvas layout.
 */
export function buildLineageGraphIndex(
  persons: PersonRecord[]
): LineageGraphIndex {
  const personById = new Map<string, PersonRecord>();
  const childrenByFatherId = new Map<string, PersonRecord[]>();
  const spousesByPartnerId = new Map<string, PersonRecord[]>();

  for (const p of persons) {
    personById.set(p.id, p);
  }

  for (const p of persons) {
    if (p.spouseOfId) {
      const list = spousesByPartnerId.get(p.spouseOfId);
      if (list) list.push(p);
      else spousesByPartnerId.set(p.spouseOfId, [p]);
    } else if (p.fatherId) {
      const list = childrenByFatherId.get(p.fatherId);
      if (list) list.push(p);
      else childrenByFatherId.set(p.fatherId, [p]);
    }
  }

  for (const list of childrenByFatherId.values()) {
    list.sort((a, b) => getRankScore(a) - getRankScore(b));
  }

  for (const list of spousesByPartnerId.values()) {
    list.sort((a, b) => getSpouseSortScore(a) - getSpouseSortScore(b));
  }

  return {
    personById,
    childrenByFatherId,
    spousesByPartnerId,
  };
}

/**
 * Derive children from the single-source-of-truth person graph using fatherId.
 */
export function getDerivedChildren(
  allPersons: PersonRecord[],
  parentId: string
): PersonRecord[] {
  return allPersons
    .filter((p) => p.fatherId === parentId && !p.spouseOfId)
    .sort((a, b) => getRankScore(a) - getRankScore(b));
}

/**
 * Derive ordered spouse nodes for a partner, sorted by siblingOrder / biographyOrder.
 */
export function getDerivedSpouses(
  allPersons: PersonRecord[],
  partnerId: string
): PersonRecord[] {
  return allPersons
    .filter((p) => p.spouseOfId === partnerId)
    .sort((a, b) => getSpouseSortScore(a) - getSpouseSortScore(b));
}

/**
 * Compute 1-based sequence order for a spouse node among all spouses of the same partner.
 */
export function computeSpouseOrderIndex(
  person: PersonRecord,
  allPersons: PersonRecord[]
): number {
  if (!person.spouseOfId) return person.siblingOrder || 1;
  const spouses = getDerivedSpouses(allPersons, person.spouseOfId);
  const idx = spouses.findIndex((s) => s.id === person.id);
  return idx >= 0 ? idx + 1 : person.siblingOrder || 1;
}

/**
 * Collect self + all descendants to prevent circular parent assignments.
 */
export function getDescendantExclusionSet(
  allPersons: PersonRecord[],
  personId: string
): Set<string> {
  const excluded = new Set<string>([personId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of allPersons) {
      if (p.fatherId && excluded.has(p.fatherId) && !excluded.has(p.id)) {
        excluded.add(p.id);
        changed = true;
      }
    }
  }
  return excluded;
}

const CHINESE_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

function toChineseNumber(num: number): string {
  if (num <= 0) return String(num);
  if (num < 10) return CHINESE_DIGITS[num];
  if (num === 10) return '十';
  if (num < 20) return `十${CHINESE_DIGITS[num % 10]}`;
  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${CHINESE_DIGITS[tens]}十${ones > 0 ? CHINESE_DIGITS[ones] : ''}`;
  }
  return String(num);
}

export function toChineseOrderPrefix(orderNum: number): string {
  if (orderNum === 1) return '长';
  if (orderNum === 2) return '次';
  return toChineseNumber(orderNum);
}

export function formatSpouseSequenceLabel(orderNum: number): string {
  if (orderNum === 1) return '原配';
  if (orderNum === 2) return '继配';
  return `${toChineseNumber(orderNum)}配`;
}

export function getDefaultRelationType(
  person: Pick<PersonRecord, 'gender' | 'spouseOfId'>,
  partnerGender?: 'male' | 'female' | 'unknown'
): RelationKind {
  if (person.spouseOfId) {
    if (person.gender === 'male') return '丈夫';
    if (person.gender === 'female') return '妻子';
    if (partnerGender === 'male') return '妻子';
    if (partnerGender === 'female') return '丈夫';
    return '配偶';
  }
  return person.gender === 'female' ? '生女' : '生子';
}

export function getExtraRelationBadge(
  person: Pick<PersonRecord, 'gender' | 'spouseOfId' | 'relationType'>,
  partnerGender?: 'male' | 'female' | 'unknown'
): string | undefined {
  const rel = person.relationType?.trim();
  if (!rel) return undefined;
  const defaultRel = getDefaultRelationType(person, partnerGender);
  if (rel === defaultRel) return undefined;
  if (person.spouseOfId && (rel === '妻子' || rel === '丈夫' || rel === '配偶')) {
    return undefined;
  }
  return rel;
}

/**
 * Compute automatic rank label from topology:
 * - Spouses: 原配 / 继配 / 三配 / 四配...
 * - Root: 始祖 / 首节点
 * - Children (split into male and female groups):
 *   - 1 male -> 之男; 2+ males -> 长子 / 次子 / 三子...
 *   - 1 female -> 之女; 2+ females -> 长女 / 次女 / 三女...
 */
export function computeAutoRankLabel(
  person: PersonRecord,
  allPersons: PersonRecord[]
): string {
  if (person.spouseOfId) {
    const orderNum = computeSpouseOrderIndex(person, allPersons);
    return formatSpouseSequenceLabel(orderNum);
  }
  if (!person.fatherId) {
    return person.generation === 1 ? '始祖' : '首节点';
  }
  const allChildren = getDerivedChildren(allPersons, person.fatherId);
  const isFemale = person.gender === 'female';
  const sameGenderGroup = allChildren.filter((c) =>
    isFemale ? c.gender === 'female' : c.gender !== 'female'
  );

  if (sameGenderGroup.length <= 1) {
    return isFemale ? '之女' : '之男';
  }

  const idx = sameGenderGroup.findIndex((s) => s.id === person.id);
  const orderNum = idx >= 0 ? idx + 1 : 1;
  return `${toChineseOrderPrefix(orderNum)}${isFemale ? '女' : '子'}`;
}

export function computeRankDisplay(
  person: PersonRecord,
  allPersons: PersonRecord[]
): string {
  return computeAutoRankLabel(person, allPersons);
}

export function getPersonAliases(
  person: Pick<PersonRecord, 'aliases'> | null | undefined
): string[] {
  if (!person?.aliases?.length) return [];
  return Array.from(
    new Set(person.aliases.map((item) => item.trim()).filter(Boolean))
  );
}

export function formatPersonAliases(
  person: Pick<PersonRecord, 'aliases'> | null | undefined
): string {
  return getPersonAliases(person).join('、');
}

export function parseAliasInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[、,，;；\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

const VALID_EVENT_TYPES: ReadonlySet<PersonEventType> = new Set([
  'birth',
  'education',
  'career',
  'marriage',
  'residence',
  'death',
  'other',
]);

const EVENT_TYPE_TEXT_MAP: Record<PersonEventType, string> = {
  birth: '出生',
  education: '求学',
  career: '任职',
  marriage: '婚姻',
  residence: '迁居',
  death: '卒葬',
  other: '其他',
};

export function normalizeEventType(rawType: unknown): PersonEventType {
  if (rawType === 'burial') return 'death';
  if (rawType === 'honor') return 'career';
  if (typeof rawType === 'string' && VALID_EVENT_TYPES.has(rawType as PersonEventType)) {
    return rawType as PersonEventType;
  }
  return 'other';
}

export function getPersonPrimaryTitle(
  person: Pick<PersonRecord, 'events'> | null | undefined
): string {
  const firstCareer = person?.events?.find((ev) => ev.type === 'career');
  return firstCareer?.description?.trim() || '';
}

/**
 * Hydrate draft form data cleanly from canonical PersonRecord.
 */
export function hydratePersonDraft(
  person: PersonRecord,
  clanSurname: string = ''
): PersonRecord {
  const resolvedAliases = getPersonAliases(person);
  const hydratedEvents: PersonLifeEvent[] = (person.events || []).map((ev, idx) => ({
    id: ev.id || `ev-${idx + 1}`,
    type: normalizeEventType(ev.type),
    structuredDate: ev.structuredDate ?? undefined,
    structuredPlace: ev.structuredPlace ?? undefined,
    description: ev.description ?? '',
  }));

  return {
    ...person,
    surname: person.spouseOfId
      ? (person.surname ?? '')
      : (person.surname ?? clanSurname),
    aliases: resolvedAliases,
    nameSuffix: person.nameSuffix ?? '',
    romanizedName: {
      surname: person.romanizedName?.surname ?? '',
      name: person.romanizedName?.name ?? '',
      suffix: person.romanizedName?.suffix ?? '',
    },
    relationType:
      person.relationType ??
      (person.spouseOfId
        ? person.gender === 'male'
          ? '丈夫'
          : '妻子'
        : person.gender === 'female'
          ? '生女'
          : '生子'),
    birth: {
      structuredDate: person.birth?.structuredDate ?? undefined,
      structuredPlace: person.birth?.structuredPlace ?? undefined,
      summary: person.birth?.summary ?? '',
    },
    death: {
      structuredDate: person.death?.structuredDate ?? undefined,
      structuredPlace: person.death?.structuredPlace ?? undefined,
      structuredBurialDate: person.death?.structuredBurialDate ?? undefined,
      structuredBurialPlace: person.death?.structuredBurialPlace ?? undefined,
      cause: person.death?.cause ?? '',
      summary: person.death?.summary ?? '',
      manualAge: person.death?.manualAge,
    },
    events: hydratedEvents,
    sequenceMeta: {
      mainLabel: person.sequenceMeta?.mainLabel ?? '',
      mainNumber: person.sequenceMeta?.mainNumber,
      subLabel: person.sequenceMeta?.subLabel ?? '',
      subNumber: person.sequenceMeta?.subNumber,
      originalPage: person.sequenceMeta?.originalPage,
    },
    privateInfo: {
      idCardNum: person.privateInfo?.idCardNum ?? '',
      mobile: person.privateInfo?.mobile ?? '',
      address: person.privateInfo?.address ?? '',
    },
  };
}

/**
 * Normalize draft before committing to the lineage store using canonical SSOT fields only.
 */
export function normalizePersonForSave(
  draft: PersonRecord,
  allPersons: PersonRecord[]
): PersonRecord {
  const father = draft.fatherId
    ? allPersons.find((p) => p.id === draft.fatherId)
    : null;

  const cleanedAliases = getPersonAliases(draft);

  const cleanedEvents: PersonLifeEvent[] = (draft.events || [])
    .map((ev, idx) => {
      const desc = ev.description?.trim() || undefined;
      return {
        id: ev.id || `ev-${idx + 1}`,
        type: normalizeEventType(ev.type),
        ...(ev.structuredDate ? { structuredDate: ev.structuredDate } : {}),
        ...(ev.structuredPlace ? { structuredPlace: ev.structuredPlace } : {}),
        ...(desc ? { description: desc } : {}),
      };
    })
    .filter((ev) =>
      Boolean(ev.structuredDate || ev.structuredPlace || ev.description)
    );

  const romSurname = draft.romanizedName?.surname?.trim() || undefined;
  const romName = draft.romanizedName?.name?.trim() || undefined;
  const romSuffix = draft.romanizedName?.suffix?.trim() || undefined;
  const romanizedName =
    romSurname || romName || romSuffix
      ? {
          ...(romSurname ? { surname: romSurname } : {}),
          ...(romName ? { name: romName } : {}),
          ...(romSuffix ? { suffix: romSuffix } : {}),
        }
      : undefined;

  const birthObj =
    draft.birth?.structuredDate ||
    draft.birth?.structuredPlace ||
    draft.birth?.summary?.trim()
      ? {
          structuredDate: draft.birth.structuredDate ?? undefined,
          structuredPlace: draft.birth.structuredPlace ?? undefined,
          summary: draft.birth.summary?.trim() || undefined,
        }
      : undefined;

  const manualAge =
    typeof draft.death?.manualAge === 'number' &&
    Number.isFinite(draft.death.manualAge) &&
    draft.death.manualAge >= 0
      ? Math.round(draft.death.manualAge)
      : undefined;

  const deathObj =
    draft.death?.structuredDate ||
    draft.death?.structuredPlace ||
    draft.death?.structuredBurialDate ||
    draft.death?.structuredBurialPlace ||
    draft.death?.cause?.trim() ||
    draft.death?.summary?.trim() ||
    manualAge !== undefined
      ? {
          structuredDate: draft.death?.structuredDate ?? undefined,
          structuredPlace: draft.death?.structuredPlace ?? undefined,
          structuredBurialDate: draft.death?.structuredBurialDate ?? undefined,
          structuredBurialPlace: draft.death?.structuredBurialPlace ?? undefined,
          cause: draft.death?.cause?.trim() || undefined,
          summary: draft.death?.summary?.trim() || undefined,
          manualAge,
        }
      : undefined;

  const seqObj =
    draft.sequenceMeta?.mainLabel?.trim() ||
    draft.sequenceMeta?.mainNumber !== undefined ||
    draft.sequenceMeta?.subLabel?.trim() ||
    draft.sequenceMeta?.subNumber !== undefined ||
    draft.sequenceMeta?.originalPage !== undefined
      ? {
          mainLabel: draft.sequenceMeta?.mainLabel?.trim() || undefined,
          mainNumber: draft.sequenceMeta?.mainNumber,
          subLabel: draft.sequenceMeta?.subLabel?.trim() || undefined,
          subNumber: draft.sequenceMeta?.subNumber,
          originalPage: draft.sequenceMeta?.originalPage,
        }
      : undefined;

  const privObj =
    draft.privateInfo?.idCardNum?.trim() ||
    draft.privateInfo?.mobile?.trim() ||
    draft.privateInfo?.address?.trim()
      ? {
          idCardNum: draft.privateInfo?.idCardNum?.trim() || undefined,
          mobile: draft.privateInfo?.mobile?.trim() || undefined,
          address: draft.privateInfo?.address?.trim() || undefined,
        }
      : undefined;

  return {
    id: draft.id,
    branchId: draft.branchId,
    avatarUrl: draft.avatarUrl,
    surname: draft.surname?.trim() || undefined,
    name: draft.name.trim() || '未命名',
    nameSuffix: draft.nameSuffix?.trim() || undefined,
    romanizedName,
    legalName: draft.legalName?.trim() || undefined,
    aliases: cleanedAliases.length > 0 ? cleanedAliases : undefined,
    childhoodName: draft.childhoodName?.trim() || undefined,
    gender: draft.gender,
    status: draft.status,
    generation: draft.spouseOfId
      ? draft.generation
      : father
        ? father.generation + 1
        : draft.generation || 1,
    generationWord: draft.generationWord?.trim() || undefined,
    hangOrder: draft.hangOrder?.trim() || undefined,
    siblingOrder: draft.siblingOrder,
    fatherId: draft.fatherId ?? null,
    motherId: draft.motherId?.trim() || undefined,
    spouseOfId: draft.spouseOfId,
    relationType:
      draft.relationType !== undefined ? draft.relationType : undefined,
    fatherRelationType: draft.fatherRelationType,
    motherRelationType: draft.motherRelationType,
    relationTitle: draft.relationTitle?.trim() || undefined,
    relationPrefix: draft.relationPrefix?.trim() || undefined,
    relationNotes: draft.relationNotes?.trim() || undefined,
    lineageRemarks: draft.lineageRemarks?.trim() || undefined,
    branchLabel: draft.branchLabel?.trim() || undefined,
    headingLine: draft.headingLine?.trim() || undefined,
    birth: birthObj,
    death: deathObj,
    events: cleanedEvents.length > 0 ? cleanedEvents : undefined,
    sequenceMeta: seqObj,
    privateInfo: privObj,
    biography: draft.biography?.trim() || undefined,
    biographyOrder: draft.biographyOrder,
    notes: draft.notes?.trim() || undefined,
  };
}

function extractYearFromStructuredDate(
  structuredDate?: GenealogyDate | null
): number | null {
  if (!structuredDate) return null;
  if (structuredDate.kind === 'date') {
    if (
      structuredDate.calendar === 'gregorian' ||
      structuredDate.calendar === 'chinese_lunisolar'
    ) {
      const parts = structuredDate.parts as { year?: number };
      if (typeof parts.year === 'number' && Number.isFinite(parts.year)) {
        return parts.year;
      }
    }
    if (structuredDate.normalized?.start) {
      const m = structuredDate.normalized.start.match(/^(-?\d{4})/);
      if (m) return parseInt(m[1], 10);
    }
  } else if (structuredDate.kind === 'range') {
    if (
      structuredDate.start.calendar === 'gregorian' ||
      structuredDate.start.calendar === 'chinese_lunisolar'
    ) {
      const parts = structuredDate.start.parts as { year?: number };
      if (typeof parts.year === 'number' && Number.isFinite(parts.year)) {
        return parts.year;
      }
    }
  } else if (structuredDate.kind === 'phrase') {
    const m = structuredDate.originalText.match(/(1\d{3}|20\d{2})/);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

export interface LiveBiographySummary {
  displayName: string;
  legalNameText: string;
  statusBadge: string;
  kinshipLine: string;
  spouseLine: string;
  birthLine: string;
  lifeLine: string;
  deathLine: string;
  biographyLine: string;
  childrenLine: string;
  remarksLine: string;
  privateRows: { label: string; value: string }[];
}

export function buildBiographyPreviewData(
  draft: PersonRecord,
  allPersons: PersonRecord[],
  prefs: BiographyPreviewPreferences,
  clanSurname: string = ''
): LiveBiographySummary {
  const effectiveSurname = draft.spouseOfId
    ? draft.surname?.trim() || ''
    : draft.surname?.trim() || clanSurname;
  const givenName = draft.spouseOfId
    ? draft.name.trim()
    : formatGivenName(draft.name, effectiveSurname);
  const fullNameBase =
    draft.spouseOfId &&
    effectiveSurname &&
    givenName &&
    !givenName.startsWith(effectiveSurname)
      ? `${effectiveSurname}${givenName}`
      : givenName;
  const nameWithSuffix = [fullNameBase, draft.nameSuffix?.trim() || ''].join('');
  const displayName = [draft.relationPrefix, nameWithSuffix]
    .filter(Boolean)
    .join(' ');
  const legalNameText = draft.legalName ? `（${draft.legalName}）` : '';
  const statusBadge = draft.status === 'living' ? '存' : '歿';

  const father = draft.fatherId
    ? allPersons.find((p) => p.id === draft.fatherId)
    : null;
  const fatherLabel = father ? formatGivenName(father.name, effectiveSurname) : '';

  const kinshipParts: string[] = [];
  const resolvedRank = computeAutoRankLabel(draft, allPersons);
  if (draft.relationTitle) {
    kinshipParts.push(draft.relationTitle);
  } else if (fatherLabel) {
    const customRelation =
      draft.relationType &&
      draft.relationType !== '生子' &&
      draft.relationType !== '生女'
        ? draft.relationType
        : '';
    const displayRank =
      customRelation ||
      resolvedRank ||
      (draft.gender === 'female' ? '女' : '子');
    kinshipParts.push(
      displayRank.startsWith('之')
        ? `${fatherLabel}${displayRank}`
        : `${fatherLabel}之${displayRank}`
    );
  } else if (draft.generation === 1 && !draft.spouseOfId) {
    kinshipParts.push('开基始祖');
  }

  const aliasText = formatPersonAliases(draft);
  if (aliasText) kinshipParts.push(`别名 ${aliasText}`);
  if (draft.hangOrder) kinshipParts.push(draft.hangOrder);
  if (draft.lineageRemarks) kinshipParts.push(draft.lineageRemarks);
  if (draft.branchLabel) kinshipParts.push(`分房：${draft.branchLabel}`);
  if (draft.headingLine) kinshipParts.push(`题行：${draft.headingLine}`);

  const spouseNodes = draft.spouseOfId
    ? []
    : getDerivedSpouses(allPersons, draft.id);
  const spouseLine =
    spouseNodes.length > 0
      ? spouseNodes
          .map((sp) => {
            const rel = computeAutoRankLabel(sp, allPersons) || '配';
            const pre = sp.relationPrefix ? `${sp.relationPrefix} ` : '';
            const sSurname = sp.surname?.trim() || '';
            const sName =
              sSurname && sp.name && !sp.name.startsWith(sSurname)
                ? `${sSurname}${sp.name}`
                : sp.name || '配偶';
            const origin = sp.notes?.trim() ? `（${sp.notes.trim()}）` : '';
            const burialText = getPersonPlaceDisplay(sp, 'burial').trim();
            const burial = burialText ? `，${burialText}` : '';
            const rem = sp.lineageRemarks?.trim()
              ? `，${sp.lineageRemarks.trim()}`
              : '';
            return `${rel} ${pre}${sName}${origin}${burial}${rem}`;
          })
          .join('；')
      : '';

  const birthParts: string[] = [];
  const birthDisplay = getPersonDateDisplay(draft, 'birth');
  if (prefs.showBirth && birthDisplay) {
    birthParts.push(`生于 ${birthDisplay}`);
  }
  const birthPlaceText = getPersonPlaceDisplay(draft, 'birth').trim();
  if (prefs.showBirthDetail) {
    if (birthPlaceText) {
      birthParts.push(
        `${birthParts.length ? '生地 ' : '生于 '}${birthPlaceText}`
      );
    }
    if (draft.birth?.summary) birthParts.push(draft.birth.summary);
  }

  const lifeParts = prefs.showLife
    ? (draft.events || [])
        .map((ev) => {
          const dText = ev.structuredDate
            ? formatGenealogyDate(ev.structuredDate).trim()
            : '';
          const pText = ev.structuredPlace
            ? formatGenealogyPlace(ev.structuredPlace).trim()
            : '';
          const descText = ev.description?.trim() || '';
          if (!dText && !pText && !descText) return '';
          const typeLabel = EVENT_TYPE_TEXT_MAP[normalizeEventType(ev.type)];
          const body = [dText, pText, descText].filter(Boolean).join(' ');
          return typeLabel && !descText ? `${typeLabel} ${body}`.trim() : body;
        })
        .filter(Boolean)
    : [];

  const deathParts: string[] = [];
  if (draft.status === 'deceased') {
    const deathDisplay = getPersonDateDisplay(draft, 'death');
    if (prefs.showDeath && deathDisplay) {
      deathParts.push(`卒于 ${deathDisplay}`);
    }
    const deathPlaceText = getPersonPlaceDisplay(draft, 'death').trim();
    if (prefs.showDeathDetail && deathPlaceText) {
      deathParts.push(`卒地 ${deathPlaceText}`);
    }
    if (prefs.showDeathDetail && draft.death?.cause?.trim()) {
      deathParts.push(`死因 ${draft.death.cause.trim()}`);
    }
    const birthYear = extractYearFromStructuredDate(draft.birth?.structuredDate);
    const deathYear = extractYearFromStructuredDate(draft.death?.structuredDate);
    const computedAge =
      birthYear !== null && deathYear !== null && deathYear >= birthYear
        ? deathYear - birthYear
        : null;
    const ageVal = draft.death?.manualAge ?? computedAge;
    if (prefs.showDeath && ageVal !== null && ageVal !== undefined) {
      deathParts.push(`享寿 ${ageVal} 龄`);
    }
    const burialDateDisplay = getPersonDateDisplay(draft, 'burial');
    const burialPlaceText = getPersonPlaceDisplay(draft, 'burial').trim();
    if (prefs.showDeathDetail && (burialDateDisplay || burialPlaceText)) {
      const burialJoin = [burialDateDisplay, burialPlaceText]
        .filter(Boolean)
        .join(' ');
      deathParts.push(`葬 ${burialJoin}`);
    }
    if (prefs.showDeathDetail && draft.death?.summary) {
      deathParts.push(draft.death.summary);
    }
  }

  const derivedChildren = getDerivedChildren(allPersons, draft.id);
  const sons = derivedChildren.filter((c) => c.gender !== 'female');
  const daughters = derivedChildren.filter((c) => c.gender === 'female');
  const childSegments: string[] = [];
  if (sons.length > 0) {
    childSegments.push(
      `子 ${sons.length}：${sons
        .map((s) => formatGivenName(s.name, effectiveSurname))
        .join('、')}`
    );
  }
  if (daughters.length > 0) {
    childSegments.push(
      `女 ${daughters.length}：${daughters
        .map((d) => formatGivenName(d.name, effectiveSurname))
        .join('、')}`
    );
  }

  const privateRows: { label: string; value: string }[] = [];
  if (prefs.showPrivateInfo && draft.privateInfo) {
    if (draft.privateInfo.mobile) {
      privateRows.push({ label: '电话', value: draft.privateInfo.mobile });
    }
    if (draft.privateInfo.idCardNum) {
      privateRows.push({ label: '证件', value: draft.privateInfo.idCardNum });
    }
    if (draft.privateInfo.address) {
      privateRows.push({ label: '地址', value: draft.privateInfo.address });
    }
  }

  return {
    displayName: displayName || '未命名',
    legalNameText,
    statusBadge,
    kinshipLine: kinshipParts.join(' · '),
    spouseLine,
    birthLine: birthParts.join('，'),
    lifeLine: lifeParts.join('；'),
    deathLine: deathParts.join('，'),
    biographyLine: prefs.showBiography ? draft.biography?.trim() || '' : '',
    childrenLine: prefs.showChildren ? childSegments.join('；') : '',
    remarksLine: prefs.showRemarks ? draft.notes?.trim() || '' : '',
    privateRows,
  };
}
