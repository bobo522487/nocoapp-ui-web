import { formatGenealogyDate, getPersonDateDisplay } from '../../date-input';
import { formatGenealogyPlace } from '../../place-input';
import {
  BiographyPreviewPreferences,
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
    .filter((p) => p.fatherId === parentId)
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

/**
 * Compute automatic rank label (e.g. "始祖", "长子", "次女", or spouse "原配"/"继配"/"三配"/"四配").
 */
export function computeAutoRankLabel(
  person: PersonRecord,
  allPersons: PersonRecord[]
): string {
  if (person.spouseOfId) {
    const orderNum = computeSpouseOrderIndex(person, allPersons);
    if (orderNum === 1) return '原配';
    if (orderNum === 2) return '继配';
    if (orderNum === 3) return '三配';
    if (orderNum === 4) return '四配';
    return `第${orderNum}配`;
  }
  if (!person.fatherId) {
    return person.generation === 1 ? '始祖' : '首节点';
  }
  const siblings = getDerivedChildren(allPersons, person.fatherId);
  const idx = siblings.findIndex((s) => s.id === person.id);
  const orderNum = idx >= 0 ? idx + 1 : person.siblingOrder || 1;
  const suffix = person.gender === 'female' ? '女' : '子';
  if (orderNum === 1) return `长${suffix}`;
  if (orderNum === 2) return `次${suffix}`;
  if (orderNum === 3) return `三${suffix}`;
  if (orderNum === 4) return `四${suffix}`;
  if (orderNum === 5) return `五${suffix}`;
  if (orderNum === 6) return `六${suffix}`;
  return `第${orderNum}${suffix}`;
}

/**
 * Compute read-only rank display such as "1-长子" from sibling order.
 */
export function computeRankDisplay(
  person: PersonRecord,
  allPersons: PersonRecord[]
): string {
  if (!person.fatherId) {
    return person.generation === 1 ? '始祖' : person.rank || '首节点';
  }
  const siblings = getDerivedChildren(allPersons, person.fatherId);
  const idx = siblings.findIndex((s) => s.id === person.id);
  const orderNum = idx >= 0 ? idx + 1 : person.siblingOrder || 1;
  const fallbackRank = person.rank || computeAutoRankLabel(person, allPersons);
  return `${orderNum}-${fallbackRank}`;
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

  return {
    ...person,
    surname: person.spouseOfId
      ? (person.surname ?? '')
      : (person.surname ?? clanSurname),
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
      educationLevel: career.educationLevel ?? '',
      graduationStatus: career.graduationStatus ?? '',
      school: career.school ?? '',
      major: career.major ?? '',
      educationSummary: fallbackEduSummary,
      profession: career.profession ?? '',
      title: career.title ?? person.officialTitle ?? '',
      resume: career.resume ?? '',
      lifeSummary: career.lifeSummary ?? '',
    },
    death: {
      date: person.death?.structuredDate
        ? formatGenealogyDate(person.death.structuredDate)
        : (person.death?.date ?? person.deathDate ?? ''),
      structuredDate: person.death?.structuredDate ?? undefined,
      burialPlace: person.death?.structuredPlace
        ? formatGenealogyPlace(person.death.structuredPlace)
        : (person.death?.burialPlace ?? person.burialPlace ?? ''),
      structuredPlace: person.death?.structuredPlace ?? undefined,
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
  const birthDate = birthStructured
    ? formatGenealogyDate(birthStructured).trim() || undefined
    : draft.birth?.date?.trim() || undefined;
  const deathDate = deathStructured
    ? formatGenealogyDate(deathStructured).trim() || undefined
    : draft.death?.date?.trim() || undefined;
  const birthStructuredPlace = draft.birth?.structuredPlace ?? undefined;
  const deathStructuredPlace = draft.death?.structuredPlace ?? undefined;
  const birthPlace = birthStructuredPlace
    ? formatGenealogyPlace(birthStructuredPlace).trim() || undefined
    : draft.birth?.place?.trim() || undefined;
  const burialPlace = deathStructuredPlace
    ? formatGenealogyPlace(deathStructuredPlace).trim() || undefined
    : draft.death?.burialPlace?.trim() || undefined;
  const age = draft.death?.age || undefined;
  const officialTitle =
    draft.career?.title?.trim() ||
    draft.career?.profession?.trim() ||
    undefined;

  const cleanedSpouses = (draft.spouses || []).filter(
    (s) => s.name?.trim() || s.clanOrigin?.trim() || s.remarks?.trim()
  );

  return {
    ...draft,
    name: draft.name.trim() || '未命名',
    surname: draft.surname?.trim() || undefined,
    legalName: draft.legalName?.trim() || undefined,
    courtesyName: draft.courtesyName?.trim() || undefined,
    hangOrder: draft.hangOrder?.trim() || undefined,
    rank: draft.rank?.trim() || undefined,
    fatherName: father ? father.name : draft.fatherId ? draft.fatherName : undefined,
    motherName: draft.motherName?.trim() || undefined,
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
          burialPlace: burialPlace || '',
          structuredPlace: deathStructuredPlace,
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
  const displayName = [draft.relationPrefix, givenName]
    .filter(Boolean)
    .join(' ');
  const legalNameText = draft.legalName ? `（${draft.legalName}）` : '';
  const statusBadge = draft.status === 'living' ? '健在' : '殁';

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
    kinshipParts.push(
      `${fatherLabel}之${customRelation || resolvedRank || (draft.gender === 'female' ? '女' : '子')}`
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
    const ageVal = draft.death?.age ?? draft.age;
    if (prefs.showDeath && ageVal) {
      deathParts.push(`享寿 ${ageVal} 龄`);
    }
    if (prefs.showDeathDetail) {
      const burial = draft.death?.burialPlace || draft.burialPlace;
      if (burial) deathParts.push(`葬 ${burial}`);
      if (draft.death?.summary) deathParts.push(draft.death.summary);
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
