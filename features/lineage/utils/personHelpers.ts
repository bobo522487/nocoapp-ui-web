import { formatGenealogyDate, getPersonDateDisplay } from '../../date-input';
import type { GenealogyDate } from '../../date-input/date.types';
import { formatGenealogyPlace } from '../../place-input';
import {
  BiographyPreviewPreferences,
  PersonCareerEntry,
  PersonEducationEntry,
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

export const EDUCATION_LEVEL_OPTIONS = [
  '小学',
  '初中',
  '高中',
  '技工',
  '中技',
  '中专',
  '专科',
  '大学专科',
  '大学本科',
  '研究生',
  '博士',
];

export const GRADUATION_STATUS_OPTIONS = ['毕业', '在读', '肄业'];

const RANK_SCORE: Record<string, number> = {
  始祖: 0,
  长子: 1,
  长女: 1,
  长: 1,
  次子: 2,
  次女: 2,
  二子: 2,
  二女: 2,
  三子: 3,
  三女: 3,
  四子: 4,
  四女: 4,
  五子: 5,
  五女: 5,
  六子: 6,
  六女: 6,
  幼子: 99,
  幼女: 99,
};

function getRankScore(p: PersonRecord): number {
  if (p.siblingOrder !== undefined) return p.siblingOrder;
  if (p.biographyOrder !== undefined) return p.biographyOrder;
  if (p.rank && RANK_SCORE[p.rank] !== undefined) return RANK_SCORE[p.rank];
  return 50;
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

export function getSpouseSortScore(person: PersonRecord): number {
  const rankOrder = person.spouseRelationLabel
    ? SPOUSE_RANK_ORDER[person.spouseRelationLabel.trim()]
    : undefined;
  if (rankOrder !== undefined) return rankOrder;
  if (person.siblingOrder !== undefined) return person.siblingOrder;
  if (person.biographyOrder !== undefined) return person.biographyOrder;
  return 50;
}

/**
 * Derive ordered spouse nodes for a partner, sorted by spouse rank / siblingOrder / biographyOrder.
 */
export function getDerivedSpouses(
  allPersons: PersonRecord[],
  partnerId: string
): PersonRecord[] {
  return allPersons
    .filter((p) => p.spouseOfId === partnerId)
    .sort((a, b) => {
      const scoreDiff = getSpouseSortScore(a) - getSpouseSortScore(b);
      if (scoreDiff !== 0) return scoreDiff;
      const orderA = a.siblingOrder ?? a.biographyOrder ?? 50;
      const orderB = b.siblingOrder ?? b.biographyOrder ?? 50;
      return orderA - orderB;
    });
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
 * Compute automatic rank label:
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

/**
 * Compute read-only pure Chinese rank display (e.g. "之男", "长子", "次女", "原配", "始祖").
 */
export function computeRankDisplay(
  person: PersonRecord,
  allPersons: PersonRecord[]
): string {
  return computeAutoRankLabel(person, allPersons);
}

/**
 * Synchronize persisted rank & spouseRelationLabel snapshots across all persons.
 */
export function syncDerivedRankSnapshots(
  persons: PersonRecord[]
): PersonRecord[] {
  const spouseLabelById = new Map<string, string>();
  const spouseNameById = new Map<string, string>();

  persons.forEach((p) => {
    if (p.spouseOfId) {
      spouseLabelById.set(p.id, computeAutoRankLabel(p, persons));
      const ms = p.surname?.trim() || '';
      const mn = p.name?.trim() || '';
      spouseNameById.set(
        p.id,
        ms && mn && !mn.startsWith(ms) ? `${ms}${mn}` : mn || '配偶'
      );
    }
  });

  return persons.map((p) => {
    if (p.spouseOfId) {
      const nextLabel = spouseLabelById.get(p.id) || '配偶';
      if (p.spouseRelationLabel === nextLabel) return p;
      return { ...p, spouseRelationLabel: nextLabel };
    }

    const nextRank = computeAutoRankLabel(p, persons);
    let nextSpouses = p.spouses;
    let spousesChanged = false;

    if (p.spouses && p.spouses.length > 0) {
      const mapped = p.spouses.map((sp) => {
        if (!sp.id || !spouseLabelById.has(sp.id)) return sp;
        const nextRelLabel = spouseLabelById.get(sp.id)!;
        const nextName = spouseNameById.get(sp.id) || sp.name;
        if (sp.relationLabel === nextRelLabel && sp.name === nextName) {
          return sp;
        }
        spousesChanged = true;
        return {
          ...sp,
          relationLabel: nextRelLabel,
          name: nextName,
        };
      });
      if (spousesChanged) {
        nextSpouses = mapped;
      }
    }

    if (p.rank === nextRank && !spousesChanged) {
      return p;
    }

    return {
      ...p,
      rank: nextRank,
      ...(spousesChanged ? { spouses: nextSpouses } : {}),
    };
  });
}

export function parseAliasList(
  aliases?: string[],
  courtesyName?: string
): string[] {
  if (aliases && aliases.length > 0) {
    return Array.from(
      new Set(aliases.map((item) => item.trim()).filter(Boolean))
    );
  }
  if (courtesyName?.trim()) {
    return Array.from(
      new Set(
        courtesyName
          .split(/[、,，;；\s]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }
  return [];
}

export function readEntryGenealogyDate(entry: {
  period?: string;
  structuredPeriod?: GenealogyDate | null;
}): GenealogyDate | null {
  if (entry.structuredPeriod) {
    return entry.structuredPeriod;
  }
  const legacyText = entry.period?.trim();
  if (legacyText) {
    return {
      schemaVersion: 1,
      kind: 'phrase',
      originalText: legacyText,
    };
  }
  return null;
}

export function writeEntryGenealogyDate<
  T extends { period?: string; structuredPeriod?: GenealogyDate | null },
>(entry: T, value: GenealogyDate | null): T {
  const formatted = value ? formatGenealogyDate(value).trim() : '';
  return {
    ...entry,
    period: formatted,
    structuredPeriod: value ?? undefined,
  };
}

/**
 * Hydrate draft form data from PersonRecord, seamlessly bridging legacy top-level fields.
 */
export function hydratePersonDraft(
  person: PersonRecord,
  clanSurname: string = ''
): PersonRecord {
  const career = person.career || {};
  const fallbackEduSummary =
    career.educationSummary ||
    [career.school, career.major, career.educationLevel, career.graduationStatus]
      .filter(Boolean)
      .join(' ');

  const resolvedAliases = parseAliasList(person.aliases, person.courtesyName);

  const hydratedEducationHistory: PersonEducationEntry[] =
    career.educationHistory && career.educationHistory.length > 0
      ? career.educationHistory.map((item, idx) => ({
          id: item.id || `edu-${idx + 1}`,
          period: item.structuredPeriod
            ? formatGenealogyDate(item.structuredPeriod)
            : (item.period ?? ''),
          structuredPeriod: item.structuredPeriod ?? undefined,
          level: item.level ?? '',
          school: item.school ?? '',
        }))
      : career.educationLevel || career.school || career.educationPeriod
        ? [
            {
              id: 'edu-1',
              period: career.educationPeriod ?? '',
              structuredPeriod: undefined,
              level: career.educationLevel ?? '',
              school: career.school ?? '',
            },
          ]
        : [];

  const hydratedCareerHistory: PersonCareerEntry[] =
    career.careerHistory && career.careerHistory.length > 0
      ? career.careerHistory.map((item, idx) => ({
          id: item.id || `career-${idx + 1}`,
          period: item.structuredPeriod
            ? formatGenealogyDate(item.structuredPeriod)
            : (item.period ?? ''),
          structuredPeriod: item.structuredPeriod ?? undefined,
          location: item.location ?? '',
          organization: item.organization ?? '',
          position: item.position ?? '',
        }))
      : career.profession || career.title || person.officialTitle
        ? [
            {
              id: 'career-1',
              period: '',
              structuredPeriod: undefined,
              location: '',
              organization: career.profession ?? '',
              position: career.title ?? person.officialTitle ?? '',
            },
          ]
        : [];

  return {
    ...person,
    surname: person.spouseOfId
      ? (person.surname ?? '')
      : (person.surname ?? clanSurname),
    aliases: resolvedAliases,
    courtesyName: resolvedAliases.join('、') || person.courtesyName || '',
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
    spouses: (person.spouses || []).map((s) => ({ ...s })),
    birth: {
      date: person.birth?.structuredDate
        ? formatGenealogyDate(person.birth.structuredDate)
        : (person.birth?.date ?? person.birthDate ?? ''),
      structuredDate: person.birth?.structuredDate ?? undefined,
      place: person.birth?.structuredPlace
        ? formatGenealogyPlace(person.birth.structuredPlace)
        : (person.birth?.place ?? ''),
      structuredPlace: person.birth?.structuredPlace ?? undefined,
      summary: person.birth?.summary ?? '',
    },
    career: {
      educationPeriod: career.educationPeriod ?? '',
      educationLevel: career.educationLevel ?? '',
      graduationStatus: career.graduationStatus ?? '',
      school: career.school ?? '',
      major: career.major ?? '',
      educationSummary: fallbackEduSummary,
      educationHistory: hydratedEducationHistory,
      profession: career.profession ?? '',
      title: career.title ?? person.officialTitle ?? '',
      resume: career.resume ?? '',
      lifeSummary: career.lifeSummary ?? '',
      careerHistory: hydratedCareerHistory,
    },
    death: {
      date: person.death?.structuredDate
        ? formatGenealogyDate(person.death.structuredDate)
        : (person.death?.date ?? person.deathDate ?? ''),
      structuredDate: person.death?.structuredDate ?? undefined,
      place: person.death?.structuredPlace
        ? formatGenealogyPlace(person.death.structuredPlace)
        : (person.death?.place ?? ''),
      structuredPlace: person.death?.structuredPlace ?? undefined,
      burialDate: person.death?.structuredBurialDate
        ? formatGenealogyDate(person.death.structuredBurialDate)
        : (person.death?.burialDate ?? ''),
      structuredBurialDate: person.death?.structuredBurialDate ?? undefined,
      burialPlace: person.death?.structuredBurialPlace
        ? formatGenealogyPlace(person.death.structuredBurialPlace)
        : (person.death?.burialPlace ?? person.burialPlace ?? ''),
      structuredBurialPlace: person.death?.structuredBurialPlace ?? undefined,
      cause: person.death?.cause ?? '',
      summary: person.death?.summary ?? '',
      age: person.death?.age ?? person.age,
    },
    sequenceMeta: {
      mainLabel: person.sequenceMeta?.mainLabel ?? '',
      mainNumber: person.sequenceMeta?.mainNumber,
      subLabel: person.sequenceMeta?.subLabel ?? '',
      subNumber: person.sequenceMeta?.subNumber,
      originalPage: person.sequenceMeta?.originalPage ?? person.biographyPage,
    },
    privateInfo: {
      idCardName: person.privateInfo?.idCardName ?? '',
      idCardNum: person.privateInfo?.idCardNum ?? '',
      mobile: person.privateInfo?.mobile ?? '',
      address: person.privateInfo?.address ?? '',
    },
  };
}

/**
 * Normalize draft before committing to the lineage store so top-level fields stay in sync.
 */
export function normalizePersonForSave(
  draft: PersonRecord,
  allPersons: PersonRecord[]
): PersonRecord {
  const father = draft.fatherId
    ? allPersons.find((p) => p.id === draft.fatherId)
    : null;

  const birthStructured = draft.birth?.structuredDate ?? undefined;
  const deathStructured = draft.death?.structuredDate ?? undefined;
  const burialDateStructured = draft.death?.structuredBurialDate ?? undefined;
  const birthDate = birthStructured
    ? formatGenealogyDate(birthStructured).trim() || undefined
    : draft.birth?.date?.trim() || undefined;
  const deathDate = deathStructured
    ? formatGenealogyDate(deathStructured).trim() || undefined
    : draft.death?.date?.trim() || undefined;
  const burialDate = burialDateStructured
    ? formatGenealogyDate(burialDateStructured).trim() || undefined
    : draft.death?.burialDate?.trim() || undefined;

  const birthStructuredPlace = draft.birth?.structuredPlace ?? undefined;
  const deathStructuredPlace = draft.death?.structuredPlace ?? undefined;
  const burialStructuredPlace = draft.death?.structuredBurialPlace ?? undefined;
  const birthPlace = birthStructuredPlace
    ? formatGenealogyPlace(birthStructuredPlace).trim() || undefined
    : draft.birth?.place?.trim() || undefined;
  const deathPlace = deathStructuredPlace
    ? formatGenealogyPlace(deathStructuredPlace).trim() || undefined
    : draft.death?.place?.trim() || undefined;
  const burialPlace = burialStructuredPlace
    ? formatGenealogyPlace(burialStructuredPlace).trim() || undefined
    : draft.death?.burialPlace?.trim() || undefined;

  const age = draft.death?.age || undefined;

  const cleanedAliases = Array.from(
    new Set((draft.aliases || []).map((a) => a.trim()).filter(Boolean))
  );
  const courtesyName =
    cleanedAliases.length > 0
      ? cleanedAliases.join('、')
      : draft.courtesyName?.trim() || undefined;

  const cleanedEducationHistory: PersonEducationEntry[] = (
    draft.career?.educationHistory || []
  )
    .map((entry, idx) => {
      const structuredPeriod = entry.structuredPeriod ?? undefined;
      const period = structuredPeriod
        ? formatGenealogyDate(structuredPeriod).trim() || undefined
        : entry.period?.trim() || undefined;
      return {
        id: entry.id || `edu-${idx + 1}`,
        period,
        structuredPeriod,
        level: entry.level?.trim() || undefined,
        school: entry.school?.trim() || undefined,
      };
    })
    .filter((entry) =>
      Boolean(entry.period || entry.structuredPeriod || entry.level || entry.school)
    );

  const primaryEdu = cleanedEducationHistory[0];
  const educationPeriod =
    primaryEdu?.period || draft.career?.educationPeriod?.trim() || undefined;
  const educationLevel =
    primaryEdu?.level || draft.career?.educationLevel?.trim() || undefined;
  const school =
    primaryEdu?.school || draft.career?.school?.trim() || undefined;

  const cleanedCareerHistory: PersonCareerEntry[] = (
    draft.career?.careerHistory || []
  )
    .map((entry, idx) => {
      const structuredPeriod = entry.structuredPeriod ?? undefined;
      const period = structuredPeriod
        ? formatGenealogyDate(structuredPeriod).trim() || undefined
        : entry.period?.trim() || undefined;
      return {
        id: entry.id || `career-${idx + 1}`,
        period,
        structuredPeriod,
        location: entry.location?.trim() || undefined,
        organization: entry.organization?.trim() || undefined,
        position: entry.position?.trim() || undefined,
      };
    })
    .filter(
      (entry) =>
        Boolean(
          entry.period ||
            entry.structuredPeriod ||
            entry.location ||
            entry.organization ||
            entry.position
        )
    );

  const primaryCareer = cleanedCareerHistory[0];
  const educationSummary =
    [
      educationPeriod,
      school,
      draft.career?.major?.trim(),
      educationLevel,
      draft.career?.graduationStatus?.trim(),
    ]
      .filter(Boolean)
      .join(' ') ||
    draft.career?.educationSummary?.trim() ||
    undefined;

  const profession =
    primaryCareer?.organization || draft.career?.profession?.trim() || undefined;
  const careerTitle =
    primaryCareer?.position || draft.career?.title?.trim() || undefined;

  const officialTitle = careerTitle || profession || undefined;

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

  const cleanedSpouses = (draft.spouses || []).filter(
    (s) => s.name?.trim() || s.clanOrigin?.trim() || s.remarks?.trim()
  );

  const mergedForRank = allPersons.some((p) => p.id === draft.id)
    ? allPersons.map((p) => (p.id === draft.id ? draft : p))
    : [...allPersons, draft];
  const derivedRankSnapshot = computeAutoRankLabel(draft, mergedForRank);

  return {
    ...draft,
    name: draft.name.trim() || '未命名',
    surname: draft.surname?.trim() || undefined,
    nameSuffix: draft.nameSuffix?.trim() || undefined,
    romanizedName,
    legalName: draft.legalName?.trim() || undefined,
    aliases: cleanedAliases.length > 0 ? cleanedAliases : undefined,
    courtesyName,
    hangOrder: draft.hangOrder?.trim() || undefined,
    rank: draft.spouseOfId ? draft.rank?.trim() || undefined : derivedRankSnapshot,
    spouseRelationLabel: draft.spouseOfId
      ? derivedRankSnapshot
      : draft.spouseRelationLabel,
    fatherId: draft.fatherId ?? null,
    fatherName: father ? father.name : draft.fatherId ? draft.fatherName : undefined,
    generation: draft.spouseOfId
      ? draft.generation
      : father
        ? father.generation + 1
        : 1,
    motherId: draft.motherId?.trim() || undefined,
    motherName: (() => {
      const mId = draft.motherId?.trim();
      if (mId) {
        const motherNode = allPersons.find((p) => p.id === mId);
        if (motherNode) {
          const ms = motherNode.surname?.trim() || '';
          const mn = motherNode.name?.trim() || '';
          return ms && mn && !mn.startsWith(ms) ? `${ms}${mn}` : mn || draft.motherName?.trim() || undefined;
        }
      }
      return draft.motherName?.trim() || undefined;
    })(),
    generationWord: draft.generationWord?.trim() || undefined,
    relationType:
      draft.relationType !== undefined ? draft.relationType : undefined,
    relationTitle: draft.relationTitle?.trim() || undefined,
    relationPrefix: draft.relationPrefix?.trim() || undefined,
    relationNotes: draft.relationNotes?.trim() || undefined,
    lineageRemarks: draft.lineageRemarks?.trim() || undefined,
    branchLabel: draft.branchLabel?.trim() || undefined,
    headingLine: draft.headingLine?.trim() || undefined,
    biography: draft.biography?.trim() || undefined,
    notes: draft.notes?.trim() || undefined,
    spouses: cleanedSpouses,
    career: draft.career
      ? {
          ...draft.career,
          educationPeriod,
          educationLevel,
          graduationStatus: draft.career.graduationStatus?.trim() || undefined,
          school,
          major: draft.career.major?.trim() || undefined,
          educationSummary,
          educationHistory:
            cleanedEducationHistory.length > 0
              ? cleanedEducationHistory
              : undefined,
          profession,
          title: careerTitle,
          careerHistory:
            cleanedCareerHistory.length > 0 ? cleanedCareerHistory : undefined,
        }
      : undefined,
    birth: draft.birth
      ? {
          ...draft.birth,
          date: birthDate || '',
          structuredDate: birthStructured,
          place: birthPlace || '',
          structuredPlace: birthStructuredPlace,
        }
      : undefined,
    death: draft.death
      ? {
          ...draft.death,
          date: deathDate || '',
          structuredDate: deathStructured,
          place: deathPlace || '',
          structuredPlace: deathStructuredPlace,
          burialDate: burialDate || '',
          structuredBurialDate: burialDateStructured,
          burialPlace: burialPlace || '',
          structuredBurialPlace: burialStructuredPlace,
          cause: draft.death.cause?.trim() || undefined,
        }
      : undefined,
    birthDate,
    deathDate,
    burialPlace,
    age,
    officialTitle,
    biographyPage: draft.sequenceMeta?.originalPage ?? draft.biographyPage,
  };
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
  const effectiveSurname = draft.surname?.trim() || clanSurname;
  const givenName = formatGivenName(draft.name, effectiveSurname);
  const nameWithSuffix = [givenName, draft.nameSuffix?.trim() || ''].join('');
  const displayName = [draft.relationPrefix, nameWithSuffix]
    .filter(Boolean)
    .join(' ');
  const legalNameText = draft.legalName ? `（${draft.legalName}）` : '';
  const statusBadge = draft.status === 'living' ? '存' : '歿';

  const father = draft.fatherId
    ? allPersons.find((p) => p.id === draft.fatherId)
    : null;
  const fatherLabel = father
    ? formatGivenName(father.name, effectiveSurname)
    : draft.fatherName
    ? formatGivenName(draft.fatherName, effectiveSurname)
    : '';

  const kinshipParts: string[] = [];
  const resolvedRank = draft.rank?.trim() || computeAutoRankLabel(draft, allPersons);
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
  } else if (draft.generation === 1) {
    kinshipParts.push('开基始祖');
  }
  if (draft.courtesyName) kinshipParts.push(`别名 ${draft.courtesyName}`);
  if (draft.hangOrder) kinshipParts.push(draft.hangOrder);
  if (draft.lineageRemarks) kinshipParts.push(draft.lineageRemarks);
  if (draft.branchLabel) kinshipParts.push(`分房：${draft.branchLabel}`);
  if (draft.headingLine) kinshipParts.push(`题行：${draft.headingLine}`);

  const spouseLine =
    draft.spouses && draft.spouses.length > 0
      ? draft.spouses
          .filter((s) => s.name?.trim())
          .map((s) => {
            const rel = s.relationLabel || '配';
            const pre = s.prefix ? `${s.prefix} ` : '';
            const origin = s.clanOrigin ? `（${s.clanOrigin}）` : '';
            const burial = s.burialPlace ? `，${s.burialPlace}` : '';
            const rem = s.remarks ? `，${s.remarks}` : '';
            return `${rel} ${pre}${s.name}${origin}${burial}${rem}`;
          })
          .join('；')
      : '';

  const birthParts: string[] = [];
  const birthDisplay = getPersonDateDisplay(draft, 'birth');
  if (prefs.showBirth && birthDisplay) {
    birthParts.push(`生于 ${birthDisplay}`);
  }
  if (prefs.showBirthDetail) {
    if (draft.birth?.place) {
      birthParts.push(
        `${birthParts.length ? '生地 ' : '生于 '}${draft.birth.place}`
      );
    }
    if (draft.birth?.summary) birthParts.push(draft.birth.summary);
  }

  const eduText =
    draft.career?.educationSummary ||
    [
      draft.career?.school,
      draft.career?.major,
      draft.career?.educationLevel,
      draft.career?.graduationStatus,
    ]
      .filter(Boolean)
      .join(' ');
  const lifeParts = prefs.showLife
    ? [
        eduText,
        draft.career?.profession,
        draft.career?.title || draft.officialTitle,
        draft.career?.resume,
        draft.career?.lifeSummary,
      ].filter(Boolean)
    : [];

  const deathParts: string[] = [];
  if (draft.status === 'deceased') {
    const deathDisplay = getPersonDateDisplay(draft, 'death');
    if (prefs.showDeath && deathDisplay) {
      deathParts.push(`卒于 ${deathDisplay}`);
    }
    if (prefs.showDeathDetail && draft.death?.place?.trim()) {
      deathParts.push(`卒地 ${draft.death.place.trim()}`);
    }
    if (prefs.showDeathDetail && draft.death?.cause?.trim()) {
      deathParts.push(`死因 ${draft.death.cause.trim()}`);
    }
    const ageVal = draft.death?.age ?? draft.age;
    if (prefs.showDeath && ageVal) {
      deathParts.push(`享寿 ${ageVal} 龄`);
    }
    const burialDateDisplay = getPersonDateDisplay(draft, 'burial');
    const burial = draft.death?.burialPlace || draft.burialPlace;
    if (prefs.showDeathDetail && (burialDateDisplay || burial)) {
      const burialJoin = [burialDateDisplay, burial].filter(Boolean).join(' ');
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
    if (draft.privateInfo.idCardName) {
      privateRows.push({ label: '实名', value: draft.privateInfo.idCardName });
    }
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
