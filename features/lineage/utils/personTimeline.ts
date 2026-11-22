import { formatGenealogyDate, getPersonDateDisplay } from '../../date-input';
import {
  computeRegnalGregorianYear,
  normalizeDatePoint,
  resolveEraForRegnalParts,
} from '../../date-input/calendar-adapter';
import { toCalendarDatePoint } from '../../date-input/date-core';
import type {
  CalendarDatePoint,
  GenealogyDate,
} from '../../date-input/date.types';
import { formatGenealogyPlace, getPersonPlaceDisplay } from '../../place-input';
import type { GenealogyPlace } from '../../place-input/place.types';
import {
  PersonEventType,
  PersonLifeEvent,
  PersonRecord,
} from '../types';
import { formatGivenName } from './nameUtils';
import {
  computeAutoRankLabel,
  getDerivedChildren,
  getDerivedSpouses,
  normalizeEventType,
  normalizePersonForSave,
} from './personHelpers';

export const EVENT_TYPE_OPTIONS: ReadonlyArray<{
  value: PersonEventType;
  label: string;
}> = [
  { value: 'birth', label: '出生' },
  { value: 'education', label: '求学' },
  { value: 'career', label: '任职' },
  { value: 'marriage', label: '婚姻' },
  { value: 'residence', label: '迁居' },
  { value: 'death', label: '卒葬' },
  { value: 'other', label: '其他' },
];

export const EVENT_TYPE_LABELS: Record<PersonEventType, string> = {
  birth: '出生',
  education: '求学',
  career: '任职',
  marriage: '婚姻',
  residence: '迁居',
  death: '卒葬',
  other: '其他',
};

export interface FamilyMemberRow {
  key: string;
  personId?: string;
  displayName: string;
  avatarUrl?: string;
  gender: 'male' | 'female' | 'unknown';
  relationshipLabel: string;
  yearsLabel: string;
}

export interface ImmediateFamilyGroups {
  upperGroup: FamilyMemberRow[];
  lowerGroup: FamilyMemberRow[];
  totalCount: number;
}

export type TimelineSectionTarget = 'vital' | 'other' | 'family' | 'biography';

export type TimelineSourceKind =
  | 'birth'
  | 'death'
  | 'burial'
  | 'marriage_node'
  | 'child_birth'
  | 'custom_event';

export interface TimelineRelatedPerson {
  personId?: string;
  displayName: string;
  avatarUrl?: string;
  gender: 'male' | 'female' | 'unknown';
}

export interface PersonTimelineEvent {
  id: string;
  eventType: PersonEventType;
  sourceKind: TimelineSourceKind;
  sourceId?: string;
  targetPersonId: string;
  sortYear: number;
  sortOrder: number;
  yearLabel: string;
  ageLabel?: string;
  title: string;
  dateText?: string;
  structuredDate?: GenealogyDate | null;
  placeText?: string;
  structuredPlace?: GenealogyPlace | null;
  detailText?: string;
  description?: string;
  relatedPerson?: TimelineRelatedPerson;
  editTargetSection: TimelineSectionTarget;
  jumpPersonId?: string;
}

export interface CoupleMarriageInfo {
  dateText: string;
  placeText: string;
  structuredDate: GenealogyDate | null;
  structuredPlace: GenealogyPlace | null;
  description: string;
  partnerEventId: string;
  spouseEventId: string;
}

function matchMarriageEventOnRecord(
  ownerEvents: PersonLifeEvent[],
  otherId: string,
  otherGivenName: string,
  otherDisplayName: string,
  spouseCount: number
): PersonLifeEvent | undefined {
  const marriageEvents = ownerEvents.filter(
    (ce) => normalizeEventType(ce.type) === 'marriage'
  );
  if (marriageEvents.length === 0) return undefined;

  const byDeterministicId = marriageEvents.find(
    (ce) =>
      ce.id === `ev-marriage-${otherId}` ||
      ce.id === `ev-marriage-partner-${otherId}`
  );
  if (byDeterministicId) return byDeterministicId;

  const byDesc = marriageEvents.find((ce) => {
    const desc = ce.description?.trim() || '';
    return (
      (otherDisplayName && desc.includes(otherDisplayName)) ||
      (otherGivenName && desc.includes(otherGivenName))
    );
  });
  if (byDesc) return byDesc;

  if (spouseCount === 1 && marriageEvents.length === 1) {
    return marriageEvents[0];
  }
  return undefined;
}

export function findCoupleMarriageInfo(
  partner: PersonRecord,
  spouse: PersonRecord,
  spouseCount: number,
  clanSurname: string = ''
): CoupleMarriageInfo {
  const partnerName = resolvePersonDisplayName(partner, clanSurname);
  const spouseName = resolvePersonDisplayName(spouse, clanSurname);

  const onPartner = matchMarriageEventOnRecord(
    partner.events || [],
    spouse.id,
    spouse.name,
    spouseName,
    spouseCount
  );
  const onSpouse = matchMarriageEventOnRecord(
    spouse.events || [],
    partner.id,
    partner.name,
    partnerName,
    1
  );

  const primary = onPartner || onSpouse;
  const structuredDate =
    onPartner?.structuredDate ?? onSpouse?.structuredDate ?? null;
  const structuredPlace =
    onPartner?.structuredPlace ?? onSpouse?.structuredPlace ?? null;

  return {
    dateText: structuredDate ? formatGenealogyDate(structuredDate).trim() : '',
    placeText: structuredPlace
      ? formatGenealogyPlace(structuredPlace).trim()
      : '',
    structuredDate,
    structuredPlace,
    description: primary?.description?.trim() || '',
    partnerEventId: onPartner?.id || `ev-marriage-${spouse.id}`,
    spouseEventId: onSpouse?.id || `ev-marriage-${partner.id}`,
  };
}

export function resolvePersonDisplayName(
  person: PersonRecord,
  clanSurname: string = ''
): string {
  const isSpouse = Boolean(person.spouseOfId);
  const effectiveSurname = isSpouse
    ? person.surname?.trim() || ''
    : person.surname?.trim() || clanSurname.trim();
  const baseName = isSpouse
    ? [
        effectiveSurname && !person.name.startsWith(effectiveSurname)
          ? effectiveSurname
          : '',
        person.name,
      ]
        .join('')
        .trim() || '配偶'
    : (() => {
        const given = formatGivenName(person.name, effectiveSurname);
        if (effectiveSurname && given && !given.startsWith(effectiveSurname)) {
          return `${effectiveSurname}${given}`;
        }
        return given || effectiveSurname;
      })();

  return [baseName, person.nameSuffix?.trim() || ''].join('') || '未命名';
}

export function resolveRomanizedDisplayName(person: PersonRecord): string {
  const parts = [
    person.romanizedName?.surname?.trim(),
    person.romanizedName?.name?.trim(),
    person.romanizedName?.suffix?.trim(),
  ].filter(Boolean);
  return parts.join(' ');
}

function parseIsoYear(iso?: string | null): number | null {
  if (!iso) return null;
  const m = iso.match(/^(-?\d+)-/);
  if (!m) return null;
  const yr = parseInt(m[1], 10);
  return Number.isFinite(yr) ? yr : null;
}

function extractPointGregorianYear(point: CalendarDatePoint): number | null {
  const norm = normalizeDatePoint(point);
  const normYear = parseIsoYear(norm.start);
  if (normYear !== null) return normYear;

  if (
    point.calendar === 'gregorian' ||
    point.calendar === 'chinese_lunisolar'
  ) {
    if (
      typeof point.parts.year === 'number' &&
      Number.isFinite(point.parts.year)
    ) {
      return point.parts.year;
    }
  } else if (point.calendar === 'regnal') {
    const era = resolveEraForRegnalParts(point.parts);
    if (era) {
      return computeRegnalGregorianYear(era, point.parts.yearInEra);
    }
  }

  return null;
}

export function extractGregorianYear(
  structuredDate?: GenealogyDate | null
): number | null {
  if (!structuredDate) return null;

  if (structuredDate.kind === 'date') {
    const normalizedYear = parseIsoYear(structuredDate.normalized?.start);
    if (normalizedYear !== null) return normalizedYear;
    return extractPointGregorianYear(toCalendarDatePoint(structuredDate));
  }

  if (structuredDate.kind === 'range') {
    return extractPointGregorianYear(structuredDate.start);
  }

  if (structuredDate.kind === 'phrase') {
    const m = structuredDate.originalText.match(/(?<!\d)(-?\d{4})(?!\d)/);
    if (m) return parseInt(m[1], 10);
  }

  return null;
}

function formatCanvasGregorianYear(year: number | null): string {
  if (year === null) return '';
  return year < 0 ? `前${Math.abs(year)}` : String(year);
}

export function formatPersonGregorianLifespan(
  person: Pick<PersonRecord, 'status' | 'birth' | 'death'>
): string {
  const birthYear = extractGregorianYear(person.birth?.structuredDate);
  const isDeceased = person.status === 'deceased';
  const deathYear = isDeceased
    ? extractGregorianYear(person.death?.structuredDate)
    : null;

  const birthStr = formatCanvasGregorianYear(birthYear);
  const deathStr = formatCanvasGregorianYear(deathYear);

  if (birthStr && deathStr) return `${birthStr} - ${deathStr}`;
  if (birthStr) return isDeceased ? `${birthStr} - 歿` : `${birthStr} - 存`;
  if (deathStr) return `卒 ${deathStr}`;
  return isDeceased ? '歿' : '存';
}

export function extractYearDisplay(
  structuredDate?: GenealogyDate | null
): string {
  const gy = extractGregorianYear(structuredDate);
  if (gy !== null) return String(gy);

  if (structuredDate) {
    if (structuredDate.kind === 'date' && structuredDate.calendar === 'regnal') {
      const p = structuredDate.parts as {
        eraName?: string;
        yearInEra?: number;
      };
      if (p.eraName) {
        return `${p.eraName}${p.yearInEra === 1 ? '元' : p.yearInEra || ''}年`;
      }
    }
    if (structuredDate.kind === 'date' && structuredDate.calendar === 'sexagenary') {
      const p = structuredDate.parts as { cycleYear?: string };
      if (p.cycleYear) {
        return `${p.cycleYear}年`;
      }
    }
    const formatted = formatGenealogyDate(structuredDate).trim();
    if (formatted) return formatted;
  }

  return '';
}

export function extractYearLabel(
  structuredDate?: GenealogyDate | null
): string {
  if (!structuredDate) return '';
  if (structuredDate.kind === 'date') {
    if (
      structuredDate.calendar === 'gregorian' ||
      structuredDate.calendar === 'chinese_lunisolar'
    ) {
      const parts = structuredDate.parts as { year?: number };
      if (typeof parts.year === 'number' && Number.isFinite(parts.year)) {
        return String(parts.year);
      }
    }
    if (structuredDate.calendar === 'regnal') {
      const p = structuredDate.parts as {
        eraName?: string;
        yearInEra?: number;
      };
      if (p.eraName) {
        return `${p.eraName}${p.yearInEra === 1 ? '元' : p.yearInEra || ''}年`;
      }
    }
  }
  return extractYearDisplay(structuredDate);
}

export function calculateAgeDisplay(
  person: PersonRecord,
  atYear?: number | null
): number | null {
  if (
    atYear === undefined &&
    person.status === 'deceased' &&
    typeof person.death?.manualAge === 'number'
  ) {
    return person.death.manualAge;
  }

  const birthYear = extractGregorianYear(person.birth?.structuredDate);
  if (birthYear === null) return null;

  if (typeof atYear === 'number') {
    const diff = atYear - birthYear;
    return diff >= 0 && diff <= 130 ? diff : null;
  }

  if (person.status === 'deceased') {
    const deathYear = extractGregorianYear(person.death?.structuredDate);
    if (deathYear !== null) {
      const diff = deathYear - birthYear;
      return diff >= 0 && diff <= 130 ? diff : null;
    }
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - birthYear;
  const structured = person.birth?.structuredDate;
  if (structured?.kind === 'date' && structured.calendar === 'gregorian') {
    const parts = structured.parts as {
      month?: number | null;
      day?: number | null;
    };
    const m = parts.month;
    const d = parts.day;
    if (m) {
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      if (currentMonth < m || (currentMonth === m && d && currentDay < d)) {
        age -= 1;
      }
    }
  }
  return age >= 0 && age <= 130 ? age : null;
}

export function formatPersonYearsSummary(person: PersonRecord): string {
  const birthYear = extractGregorianYear(person.birth?.structuredDate);
  const deathYear =
    person.status === 'deceased'
      ? extractGregorianYear(person.death?.structuredDate)
      : null;

  if (birthYear !== null && deathYear !== null) {
    return `${birthYear} - ${deathYear}`;
  }
  if (birthYear !== null) {
    return person.status === 'living'
      ? `出生：${birthYear}`
      : `${birthYear} - 歿`;
  }
  if (deathYear !== null) {
    return `卒于：${deathYear}`;
  }

  const rawBirth = getPersonDateDisplay(person, 'birth').trim();
  const rawDeath =
    person.status === 'deceased' ? getPersonDateDisplay(person, 'death').trim() : '';

  if (rawBirth && rawDeath) return `${rawBirth} - ${rawDeath}`;
  if (rawBirth) return `出生：${rawBirth}`;
  if (rawDeath) return `卒于：${rawDeath}`;
  return person.status === 'living' ? '健在' : '已故';
}

export function formatHeaderBirthLine(person: PersonRecord): string {
  const birthDateText = getPersonDateDisplay(person, 'birth').trim();
  const deathDateText =
    person.status === 'deceased'
      ? getPersonDateDisplay(person, 'death').trim()
      : '';

  const age = calculateAgeDisplay(person);

  if (birthDateText && person.status === 'living') {
    return age !== null ? `${birthDateText}（年龄 ${age}）` : birthDateText;
  }
  if (birthDateText && deathDateText) {
    return age !== null
      ? `${birthDateText} – ${deathDateText}（享寿 ${age} 岁）`
      : `${birthDateText} – ${deathDateText}`;
  }
  if (birthDateText) {
    return age !== null
      ? `生于 ${birthDateText}（享寿 ${age} 岁）`
      : `生于 ${birthDateText}`;
  }
  if (deathDateText) {
    return age !== null
      ? `卒于 ${deathDateText}（享寿 ${age} 岁）`
      : `卒于 ${deathDateText}`;
  }
  return '';
}

export function resolvePersonRelationshipHeader(
  person: PersonRecord,
  allPersons: PersonRecord[]
): string {
  if (person.spouseOfId) {
    const partner = allPersons.find((p) => p.id === person.spouseOfId);
    const rankLabel = computeAutoRankLabel(person, allPersons);
    const role =
      person.gender === 'male'
        ? '丈夫'
        : person.gender === 'female'
          ? '妻子'
          : '配偶';
    return partner
      ? `第 ${person.generation} 世 · ${role}（${rankLabel}）`
      : `第 ${person.generation} 世 · ${rankLabel}`;
  }

  const autoRank = computeAutoRankLabel(person, allPersons);
  const titleParts = [`第 ${person.generation} 世`];
  if (person.relationTitle?.trim()) {
    titleParts.push(person.relationTitle.trim());
  } else if (autoRank) {
    titleParts.push(autoRank);
  }
  if (person.branchLabel?.trim()) {
    titleParts.push(person.branchLabel.trim());
  }
  return titleParts.join(' · ');
}

export function buildImmediateFamilyGroups(
  person: PersonRecord,
  allPersons: PersonRecord[],
  clanSurname: string = ''
): ImmediateFamilyGroups {
  const upperGroup: FamilyMemberRow[] = [];
  const lowerGroup: FamilyMemberRow[] = [];

  const isSpouseNode = Boolean(person.spouseOfId);

  if (!isSpouseNode) {
    const father = person.fatherId
      ? allPersons.find((p) => p.id === person.fatherId) || null
      : null;

    if (father) {
      upperGroup.push({
        key: `father-${father.id}`,
        personId: father.id,
        displayName: resolvePersonDisplayName(father, clanSurname),
        avatarUrl: father.avatarUrl,
        gender: father.gender,
        relationshipLabel: '父亲',
        yearsLabel: formatPersonYearsSummary(father),
      });

      const fatherSpouses = getDerivedSpouses(allPersons, father.id);
      const matchedMother = person.motherId
        ? fatherSpouses.find((m) => m.id === person.motherId) ||
          allPersons.find((m) => m.id === person.motherId)
        : fatherSpouses[0];

      if (matchedMother) {
        upperGroup.push({
          key: `mother-${matchedMother.id}`,
          personId: matchedMother.id,
          displayName: resolvePersonDisplayName(matchedMother, clanSurname),
          avatarUrl: matchedMother.avatarUrl,
          gender: matchedMother.gender,
          relationshipLabel: '母亲',
          yearsLabel: formatPersonYearsSummary(matchedMother),
        });
      }

      const siblings = getDerivedChildren(allPersons, father.id).filter(
        (sib) => sib.id !== person.id
      );
      siblings.forEach((sib) => {
        upperGroup.push({
          key: `sib-${sib.id}`,
          personId: sib.id,
          displayName: resolvePersonDisplayName(sib, clanSurname),
          avatarUrl: sib.avatarUrl,
          gender: sib.gender,
          relationshipLabel: sib.gender === 'female' ? '姐妹' : '兄弟',
          yearsLabel: formatPersonYearsSummary(sib),
        });
      });
    } else if (person.motherId) {
      const mother = allPersons.find((p) => p.id === person.motherId);
      if (mother) {
        upperGroup.push({
          key: `mother-${mother.id}`,
          personId: mother.id,
          displayName: resolvePersonDisplayName(mother, clanSurname),
          avatarUrl: mother.avatarUrl,
          gender: mother.gender,
          relationshipLabel: '母亲',
          yearsLabel: formatPersonYearsSummary(mother),
        });
      }
    }
  }

  if (isSpouseNode) {
    const primary = allPersons.find((p) => p.id === person.spouseOfId);
    if (primary) {
      lowerGroup.push({
        key: `partner-${primary.id}`,
        personId: primary.id,
        displayName: resolvePersonDisplayName(primary, clanSurname),
        avatarUrl: primary.avatarUrl,
        gender: primary.gender,
        relationshipLabel: primary.gender === 'male' ? '丈夫' : '妻子',
        yearsLabel: formatPersonYearsSummary(primary),
      });

      const primarySpouses = getDerivedSpouses(allPersons, primary.id);
      const children = getDerivedChildren(allPersons, primary.id).filter(
        (child) => {
          if (child.motherId) return child.motherId === person.id;
          return primarySpouses[0]?.id === person.id;
        }
      );

      children.forEach((child) => {
        lowerGroup.push({
          key: `child-${child.id}`,
          personId: child.id,
          displayName: resolvePersonDisplayName(child, clanSurname),
          avatarUrl: child.avatarUrl,
          gender: child.gender,
          relationshipLabel: child.gender === 'female' ? '女儿' : '儿子',
          yearsLabel: formatPersonYearsSummary(child),
        });
      });
    }
  } else {
    const spouseNodes = getDerivedSpouses(allPersons, person.id);
    spouseNodes.forEach((sp) => {
      const disp = resolvePersonDisplayName(sp, clanSurname);
      const seqLabel = computeAutoRankLabel(sp, allPersons);
      const baseRole =
        sp.gender === 'male'
          ? '丈夫'
          : sp.gender === 'female'
            ? '妻子'
            : '配偶';
      lowerGroup.push({
        key: `spouse-${sp.id}`,
        personId: sp.id,
        displayName: disp,
        avatarUrl: sp.avatarUrl,
        gender: sp.gender,
        relationshipLabel:
          seqLabel && seqLabel !== '原配'
            ? `${baseRole}（${seqLabel}）`
            : baseRole,
        yearsLabel: formatPersonYearsSummary(sp),
      });
    });

    const children = getDerivedChildren(allPersons, person.id);
    children.forEach((child) => {
      lowerGroup.push({
        key: `child-${child.id}`,
        personId: child.id,
        displayName: resolvePersonDisplayName(child, clanSurname),
        avatarUrl: child.avatarUrl,
        gender: child.gender,
        relationshipLabel: child.gender === 'female' ? '女儿' : '儿子',
        yearsLabel: formatPersonYearsSummary(child),
      });
    });
  }

  return {
    upperGroup,
    lowerGroup,
    totalCount: upperGroup.length + lowerGroup.length,
  };
}

export function buildPersonTimelineEvents(
  person: PersonRecord,
  allPersons: PersonRecord[],
  clanSurname: string = ''
): PersonTimelineEvent[] {
  const events: PersonTimelineEvent[] = [];
  const birthYear = extractGregorianYear(person.birth?.structuredDate);

  const computeAgeAt = (year: number | null): string | undefined => {
    if (birthYear === null || year === null) return undefined;
    const age = year - birthYear;
    if (age < 0 || age > 130) return undefined;
    return `年龄 ${age}`;
  };

  // 1. Birth
  const birthDateText = getPersonDateDisplay(person, 'birth').trim();
  const birthPlaceText = getPersonPlaceDisplay(person, 'birth').trim();
  if (birthDateText || birthPlaceText || person.birth?.summary?.trim()) {
    events.push({
      id: `tl-birth-${person.id}`,
      eventType: 'birth',
      sourceKind: 'birth',
      targetPersonId: person.id,
      sortYear: birthYear ?? -99999,
      sortOrder: 10,
      yearLabel:
        birthYear !== null
          ? String(birthYear)
          : extractYearDisplay(person.birth?.structuredDate) || '出生',
      title: '出生',
      dateText: birthDateText || undefined,
      structuredDate: person.birth?.structuredDate ?? null,
      placeText: birthPlaceText || undefined,
      structuredPlace: person.birth?.structuredPlace ?? null,
      detailText: person.birth?.summary?.trim() || undefined,
      description: person.birth?.summary?.trim() || undefined,
      editTargetSection: 'vital',
    });
  }

  // 2. Marriage Events (independent spouse PersonRecord nodes + unified marriage events)
  const customEvents = person.events || [];
  const consumedMarriageEventIds = new Set<string>();

  const findMatchedMarriageEvent = (
    partnerId: string,
    partnerGivenName: string,
    partnerDisplayName: string,
    spouseCount: number
  ): PersonLifeEvent | undefined => {
    const marriageEvents = customEvents.filter(
      (ce) => normalizeEventType(ce.type) === 'marriage' && !consumedMarriageEventIds.has(ce.id)
    );
    if (marriageEvents.length === 0) return undefined;

    const byDeterministicId = marriageEvents.find(
      (ce) => ce.id === `ev-marriage-${partnerId}` || ce.id === `ev-marriage-partner-${partnerId}`
    );
    if (byDeterministicId) return byDeterministicId;

    const byDesc = marriageEvents.find((ce) => {
      const desc = ce.description?.trim() || '';
      return (
        (partnerDisplayName && desc.includes(partnerDisplayName)) ||
        (partnerGivenName && desc.includes(partnerGivenName))
      );
    });
    if (byDesc) return byDesc;

    if (spouseCount === 1 && marriageEvents.length === 1) {
      return marriageEvents[0];
    }
    return undefined;
  };

  const isSpouseNode = Boolean(person.spouseOfId);
  if (isSpouseNode) {
    const partner = allPersons.find((p) => p.id === person.spouseOfId);
    if (partner) {
      const partnerName = resolvePersonDisplayName(partner, clanSurname);
      const matchedEv = findMatchedMarriageEvent(
        partner.id,
        partner.name,
        partnerName,
        1
      );
      if (matchedEv) consumedMarriageEventIds.add(matchedEv.id);
      const mDateText = matchedEv?.structuredDate
        ? formatGenealogyDate(matchedEv.structuredDate).trim()
        : '';
      const mPlaceText = matchedEv?.structuredPlace
        ? formatGenealogyPlace(matchedEv.structuredPlace).trim()
        : '';
      const mYear = extractGregorianYear(matchedEv?.structuredDate);

      events.push({
        id: `tl-marriage-${partner.id}`,
        eventType: 'marriage',
        sourceKind: 'marriage_node',
        sourceId: matchedEv?.id || `ev-marriage-${partner.id}`,
        targetPersonId: person.id,
        sortYear: mYear ?? (birthYear !== null ? birthYear + 24 : 90200),
        sortOrder: 40,
        yearLabel:
          mYear !== null
            ? String(mYear)
            : extractYearDisplay(matchedEv?.structuredDate) || '婚姻',
        ageLabel: computeAgeAt(mYear),
        title: '婚姻',
        dateText: mDateText || undefined,
        structuredDate: matchedEv?.structuredDate ?? null,
        placeText: mPlaceText || undefined,
        structuredPlace: matchedEv?.structuredPlace ?? null,
        detailText: matchedEv?.description?.trim() || undefined,
        description: matchedEv?.description?.trim() || undefined,
        relatedPerson: {
          personId: partner.id,
          displayName: partnerName,
          avatarUrl: partner.avatarUrl,
          gender: partner.gender,
        },
        editTargetSection: 'family',
        jumpPersonId: partner.id,
      });
    }
  } else {
    const spouseNodes = getDerivedSpouses(allPersons, person.id);
    spouseNodes.forEach((sp, idx) => {
      const name = resolvePersonDisplayName(sp, clanSurname);
      const matchedEv = findMatchedMarriageEvent(
        sp.id,
        sp.name,
        name,
        spouseNodes.length
      );
      if (matchedEv) consumedMarriageEventIds.add(matchedEv.id);
      const mDateText = matchedEv?.structuredDate
        ? formatGenealogyDate(matchedEv.structuredDate).trim()
        : '';
      const mPlaceText = matchedEv?.structuredPlace
        ? formatGenealogyPlace(matchedEv.structuredPlace).trim()
        : '';
      const mYear = extractGregorianYear(matchedEv?.structuredDate);

      events.push({
        id: `tl-marriage-${sp.id}`,
        eventType: 'marriage',
        sourceKind: 'marriage_node',
        sourceId: matchedEv?.id || `ev-marriage-${sp.id}`,
        targetPersonId: person.id,
        sortYear:
          mYear ?? (birthYear !== null ? birthYear + 25 + idx : 90200 + idx),
        sortOrder: 40 + idx,
        yearLabel:
          mYear !== null
            ? String(mYear)
            : extractYearDisplay(matchedEv?.structuredDate) || '婚姻',
        ageLabel: computeAgeAt(mYear),
        title: '婚姻',
        dateText: mDateText || undefined,
        structuredDate: matchedEv?.structuredDate ?? null,
        placeText: mPlaceText || undefined,
        structuredPlace: matchedEv?.structuredPlace ?? null,
        detailText: matchedEv?.description?.trim() || undefined,
        description: matchedEv?.description?.trim() || undefined,
        relatedPerson: {
          personId: sp.id,
          displayName: name,
          avatarUrl: sp.avatarUrl,
          gender: sp.gender,
        },
        editTargetSection: 'family',
        jumpPersonId: sp.id,
      });
    });
  }

  // 3. Children Births
  const primaryId = person.spouseOfId || person.id;
  const derivedChildren = getDerivedChildren(allPersons, primaryId).filter(
    (child) => {
      if (!isSpouseNode) return true;
      if (child.motherId) return child.motherId === person.id;
      return getDerivedSpouses(allPersons, primaryId)[0]?.id === person.id;
    }
  );

  derivedChildren.forEach((child, idx) => {
    const cDateText = getPersonDateDisplay(child, 'birth').trim();
    const cPlaceText = getPersonPlaceDisplay(child, 'birth').trim();
    const cYear = extractGregorianYear(child.birth?.structuredDate);
    events.push({
      id: `tl-child-${child.id}`,
      eventType: 'birth',
      sourceKind: 'child_birth',
      sourceId: child.id,
      targetPersonId: child.id,
      sortYear:
        cYear ?? (birthYear !== null ? birthYear + 27 + idx : 90300 + idx),
      sortOrder: 50 + idx,
      yearLabel:
        cYear !== null
          ? String(cYear)
          : extractYearDisplay(child.birth?.structuredDate) || '子嗣',
      ageLabel: computeAgeAt(cYear),
      title: child.gender === 'female' ? '女儿出生' : '儿子出生',
      dateText: cDateText || undefined,
      structuredDate: child.birth?.structuredDate ?? null,
      placeText: cPlaceText || undefined,
      structuredPlace: child.birth?.structuredPlace ?? null,
      detailText: child.birth?.summary?.trim() || undefined,
      description: child.birth?.summary?.trim() || undefined,
      relatedPerson: {
        personId: child.id,
        displayName: resolvePersonDisplayName(child, clanSurname),
        avatarUrl: child.avatarUrl,
        gender: child.gender,
      },
      editTargetSection: 'family',
      jumpPersonId: child.id,
    });
  });

  // 4. Unified Life Events (from person.events[])
  const FALLBACK_OFFSET_BY_TYPE: Record<PersonEventType, number> = {
    birth: -99990,
    education: 18,
    career: 24,
    marriage: 25,
    residence: 30,
    death: 99050,
    other: 35,
  };

  customEvents.forEach((ev, idx) => {
    if (consumedMarriageEventIds.has(ev.id)) return;
    const evType = normalizeEventType(ev.type);
    const evDateText = ev.structuredDate
      ? formatGenealogyDate(ev.structuredDate).trim()
      : '';
    const evPlaceText = ev.structuredPlace
      ? formatGenealogyPlace(ev.structuredPlace).trim()
      : '';
    const evYear = extractGregorianYear(ev.structuredDate);
    const title = EVENT_TYPE_LABELS[evType] || '其他';
    const desc = ev.description?.trim() || undefined;

    const fallbackSortYear =
      evType === 'birth'
        ? -99990
        : evType === 'death'
          ? 99050
          : birthYear !== null
            ? birthYear + FALLBACK_OFFSET_BY_TYPE[evType] + idx * 0.01
            : 90400 + idx;

    events.push({
      id: `tl-ev-${ev.id}`,
      eventType: evType,
      sourceKind: 'custom_event',
      sourceId: ev.id,
      targetPersonId: person.id,
      sortYear: evYear ?? fallbackSortYear,
      sortOrder: 60 + idx,
      yearLabel:
        evYear !== null
          ? String(evYear)
          : extractYearDisplay(ev.structuredDate) || title,
      ageLabel: computeAgeAt(evYear),
      title,
      dateText: evDateText || undefined,
      structuredDate: ev.structuredDate ?? null,
      placeText: evPlaceText || undefined,
      structuredPlace: ev.structuredPlace ?? null,
      detailText: desc,
      description: desc,
      editTargetSection: 'other',
    });
  });

  // 5. Death & Burial (when deceased)
  if (person.status === 'deceased') {
    const deathDateText = getPersonDateDisplay(person, 'death').trim();
    const deathPlaceText = getPersonPlaceDisplay(person, 'death').trim();
    const deathCauseText = person.death?.cause?.trim() || '';
    const deathYear = extractGregorianYear(person.death?.structuredDate);
    const deathAgeVal =
      person.death?.manualAge ??
      (deathYear !== null && birthYear !== null ? deathYear - birthYear : null);

    if (
      deathDateText ||
      deathPlaceText ||
      deathCauseText ||
      person.death?.summary?.trim()
    ) {
      events.push({
        id: `tl-death-${person.id}`,
        eventType: 'death',
        sourceKind: 'death',
        targetPersonId: person.id,
        sortYear: deathYear ?? 99000,
        sortOrder: 80,
        yearLabel:
          deathYear !== null
            ? String(deathYear)
            : extractYearDisplay(person.death?.structuredDate) || '卒葬',
        ageLabel:
          typeof deathAgeVal === 'number' && deathAgeVal >= 0
            ? `享寿 ${deathAgeVal}`
            : undefined,
        title: '卒葬',
        dateText: deathDateText || undefined,
        structuredDate: person.death?.structuredDate ?? null,
        placeText: deathPlaceText || undefined,
        structuredPlace: person.death?.structuredPlace ?? null,
        detailText:
          [
            deathCauseText ? `死因：${deathCauseText}` : '',
            person.death?.summary?.trim() || '',
          ]
            .filter(Boolean)
            .join(' · ') || undefined,
        description: person.death?.summary?.trim() || undefined,
        editTargetSection: 'vital',
      });
    }

    const burialDateText = getPersonDateDisplay(person, 'burial').trim();
    const burialPlaceText = getPersonPlaceDisplay(person, 'burial').trim();
    const burialYear = extractGregorianYear(person.death?.structuredBurialDate);

    if (burialDateText || burialPlaceText) {
      events.push({
        id: `tl-burial-${person.id}`,
        eventType: 'death',
        sourceKind: 'burial',
        targetPersonId: person.id,
        sortYear: burialYear ?? (deathYear !== null ? deathYear : 99100),
        sortOrder: 90,
        yearLabel:
          burialYear !== null
            ? String(burialYear)
            : extractYearDisplay(person.death?.structuredBurialDate) || '卒葬',
        ageLabel: computeAgeAt(burialYear),
        title: '卒葬（安葬）',
        dateText: burialDateText || undefined,
        structuredDate: person.death?.structuredBurialDate ?? null,
        placeText: burialPlaceText || undefined,
        structuredPlace: person.death?.structuredBurialPlace ?? null,
        editTargetSection: 'vital',
      });
    }
  }

  return events.sort((a, b) => {
    if (a.sortYear !== b.sortYear) return a.sortYear - b.sortYear;
    return a.sortOrder - b.sortOrder;
  });
}

export interface UnifiedEventSubmitPayload {
  type: PersonEventType;
  structuredDate: GenealogyDate | null;
  structuredPlace: GenealogyPlace | null;
  description: string;
}

export interface EventEditContext {
  mode: 'create' | 'edit';
  sourceKind?: TimelineSourceKind;
  sourceId?: string;
  targetPersonId: string;
  initialEvent: UnifiedEventSubmitPayload;
  canDelete?: boolean;
  coupleMeta?: {
    partnerId: string;
    spouseId: string;
    partnerEventId?: string;
    spouseEventId?: string;
  };
}

/**
 * Apply a unified 4-field event save payload onto the target PersonRecord cleanly and normalize.
 */
export function applyUnifiedEventToPerson(
  targetPerson: PersonRecord,
  allPersons: PersonRecord[],
  payload: UnifiedEventSubmitPayload,
  context: EventEditContext
): Partial<PersonRecord> {
  const desc = payload.description.trim();
  const normalizedType = normalizeEventType(payload.type);

  const hasExistingBirth = Boolean(
    targetPerson.birth?.structuredDate ||
      targetPerson.birth?.structuredPlace ||
      targetPerson.birth?.summary?.trim()
  );

  // 1. Vital Birth (editing vital/child birth, or creating birth when vital birth is empty)
  if (
    context.sourceKind === 'birth' ||
    context.sourceKind === 'child_birth' ||
    (context.mode === 'create' && normalizedType === 'birth' && !hasExistingBirth)
  ) {
    const nextBirth = {
      ...(targetPerson.birth || {}),
      structuredDate: payload.structuredDate ?? undefined,
      structuredPlace: payload.structuredPlace ?? undefined,
      summary: desc || undefined,
    };
    return normalizePersonForSave(
      {
        ...targetPerson,
        birth: nextBirth,
      },
      allPersons
    );
  }

  const hasExistingDeath = Boolean(
    targetPerson.status === 'deceased' &&
      (targetPerson.death?.structuredDate ||
        targetPerson.death?.structuredPlace ||
        targetPerson.death?.summary?.trim())
  );

  // 2. Vital Death (editing vital death, or creating death when vital death is empty)
  if (
    context.sourceKind === 'death' ||
    (context.mode === 'create' && normalizedType === 'death' && !hasExistingDeath)
  ) {
    const nextDeath = {
      ...(targetPerson.death || {}),
      structuredDate: payload.structuredDate ?? undefined,
      structuredPlace: payload.structuredPlace ?? undefined,
      summary: desc || undefined,
    };
    return normalizePersonForSave(
      {
        ...targetPerson,
        status: 'deceased',
        death: nextDeath,
      },
      allPersons
    );
  }

  // 3. Vital Burial
  if (context.sourceKind === 'burial') {
    const nextDeath = {
      ...(targetPerson.death || {}),
      structuredBurialDate: payload.structuredDate ?? undefined,
      structuredBurialPlace: payload.structuredPlace ?? undefined,
      summary: desc || targetPerson.death?.summary || undefined,
    };
    return normalizePersonForSave(
      {
        ...targetPerson,
        status: 'deceased',
        death: nextDeath,
      },
      allPersons
    );
  }

  // 4. Unified Events (education, career, marriage, residence, other, or additional birth/death records)
  const existingEvents: PersonLifeEvent[] = [...(targetPerson.events || [])];
  const eventId =
    context.mode === 'edit' && context.sourceId
      ? context.sourceId
      : `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

  const nextLifeEvent: PersonLifeEvent = {
    id: eventId,
    type: normalizedType,
    structuredDate: payload.structuredDate ?? undefined,
    structuredPlace: payload.structuredPlace ?? undefined,
    description: desc || undefined,
  };

  const idx = existingEvents.findIndex((e) => e.id === eventId);
  const nextEvents =
    idx >= 0
      ? existingEvents.map((e, i) => (i === idx ? nextLifeEvent : e))
      : [...existingEvents, nextLifeEvent];

  return normalizePersonForSave(
    {
      ...targetPerson,
      events: nextEvents,
    },
    allPersons
  );
}

/**
 * Remove a removable event (custom_event or burial) from PersonRecord.
 */
export function removeUnifiedEventFromPerson(
  targetPerson: PersonRecord,
  allPersons: PersonRecord[],
  context: EventEditContext
): Partial<PersonRecord> | null {
  if (context.sourceKind === 'custom_event' && context.sourceId) {
    const nextEvents = (targetPerson.events || []).filter(
      (e) => e.id !== context.sourceId
    );
    return normalizePersonForSave(
      {
        ...targetPerson,
        events: nextEvents,
      },
      allPersons
    );
  }

  if (context.sourceKind === 'burial') {
    return normalizePersonForSave(
      {
        ...targetPerson,
        death: targetPerson.death
          ? {
              ...targetPerson.death,
              structuredBurialDate: undefined,
              structuredBurialPlace: undefined,
            }
          : undefined,
      },
      allPersons
    );
  }

  return null;
}
