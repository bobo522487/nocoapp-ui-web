import { formatGenealogyDate } from '../../date-input/date-format';
import type { GenealogyDate } from '../../date-input/date.types';
import { formatGenealogyPlace } from '../../place-input';
import type { GenealogyPlace } from '../../place-input/place.types';
import {
  PersonCareerEntry,
  PersonEducationEntry,
  PersonEventType,
  PersonLifeEvent,
  PersonRecord,
} from '../types';
import { formatGivenName } from './nameUtils';
import {
  computeAutoRankLabel,
  getDerivedChildren,
  getDerivedSpouses,
  normalizePersonForSave,
} from './personHelpers';

export const EVENT_TYPE_OPTIONS: ReadonlyArray<{
  value: PersonEventType;
  label: string;
}> = [
  { value: 'birth', label: '出生' },
  { value: 'death', label: '去世' },
  { value: 'burial', label: '安葬' },
  { value: 'marriage', label: '结婚' },
  { value: 'education', label: '教育' },
  { value: 'career', label: '工作' },
  { value: 'residence', label: '迁居 / 居住' },
  { value: 'honor', label: '功名 / 荣誉' },
  { value: 'other', label: '其他事件' },
];

export const EVENT_TYPE_LABELS: Record<PersonEventType, string> = {
  birth: '出生',
  death: '去世',
  burial: '安葬',
  marriage: '结婚',
  education: '教育',
  career: '工作',
  residence: '迁居 / 居住',
  honor: '功名 / 荣誉',
  other: '其他事件',
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
  | 'education'
  | 'career'
  | 'marriage_node'
  | 'marriage_legacy'
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
  targetPersonId: string; // Whose record gets updated when editing this event
  customTypeLabel?: string;
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
  organization?: string;
  position?: string;
  educationLevel?: string;
  deathCause?: string;
  relatedPerson?: TimelineRelatedPerson;
  editTargetSection: TimelineSectionTarget;
  jumpPersonId?: string;
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

export function extractGregorianYear(
  rawDate?: string,
  structuredDate?: GenealogyDate | null
): number | null {
  if (structuredDate) {
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
  }

  const clean = rawDate?.trim();
  if (!clean) return null;
  const fourDigit = clean.match(/(?:^|\D)(1\d{3}|20\d{2})(?:\D|$)/);
  if (fourDigit) return parseInt(fourDigit[1], 10);
  return null;
}

export function extractYearDisplay(
  rawDate?: string,
  structuredDate?: GenealogyDate | null
): string {
  const gy = extractGregorianYear(rawDate, structuredDate);
  if (gy !== null) return String(gy);

  if (structuredDate) {
    if (structuredDate.kind === 'date' && structuredDate.calendar === 'regnal') {
      const p = structuredDate.parts as {
        dynastyId?: string;
        eraName?: string;
        yearInEra?: number;
      };
      if (p.eraName) {
        return `${p.eraName}${p.yearInEra === 1 ? '元' : p.yearInEra || ''}年`;
      }
    }
    const formatted = formatGenealogyDate(structuredDate).trim();
    if (formatted) return formatted;
  }

  return rawDate?.trim() || '';
}

export function calculateAgeDisplay(
  person: PersonRecord,
  atYear?: number | null
): number | null {
  const birthYear = extractGregorianYear(
    person.birth?.date || person.birthDate,
    person.birth?.structuredDate
  );
  if (birthYear === null) return null;

  if (typeof atYear === 'number') {
    const diff = atYear - birthYear;
    return diff >= 0 && diff <= 130 ? diff : null;
  }

  if (person.status === 'deceased') {
    if (typeof person.death?.age === 'number') return person.death.age;
    if (typeof person.age === 'number') return person.age;
    const deathYear = extractGregorianYear(
      person.death?.date || person.deathDate,
      person.death?.structuredDate
    );
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
  const birthYear = extractGregorianYear(
    person.birth?.date || person.birthDate,
    person.birth?.structuredDate
  );
  const deathYear =
    person.status === 'deceased'
      ? extractGregorianYear(
          person.death?.date || person.deathDate,
          person.death?.structuredDate
        )
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

  const rawBirth = (
    person.birth?.structuredDate
      ? formatGenealogyDate(person.birth.structuredDate)
      : person.birth?.date || person.birthDate || ''
  ).trim();
  const rawDeath = (
    person.death?.structuredDate
      ? formatGenealogyDate(person.death.structuredDate)
      : person.death?.date || person.deathDate || ''
  ).trim();

  if (rawBirth && rawDeath) return `${rawBirth} - ${rawDeath}`;
  if (rawBirth) return `出生：${rawBirth}`;
  if (rawDeath) return `卒于：${rawDeath}`;
  return person.status === 'living' ? '健在' : '已故';
}

export function formatHeaderBirthLine(person: PersonRecord): string {
  const birthDateText = (
    person.birth?.structuredDate
      ? formatGenealogyDate(person.birth.structuredDate)
      : person.birth?.date || person.birthDate || ''
  ).trim();
  const deathDateText =
    person.status === 'deceased'
      ? (person.death?.structuredDate
          ? formatGenealogyDate(person.death.structuredDate)
          : person.death?.date || person.deathDate || ''
        ).trim()
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
      let matchedMother: PersonRecord | undefined;
      if (person.motherId) {
        matchedMother = fatherSpouses.find((m) => m.id === person.motherId);
      }
      if (!matchedMother && person.motherName?.trim()) {
        const cleanM = person.motherName.trim();
        matchedMother = fatherSpouses.find(
          (m) =>
            resolvePersonDisplayName(m, clanSurname) === cleanM ||
            m.name.trim() === cleanM
        );
      }
      if (!matchedMother && fatherSpouses.length > 0 && !person.motherName) {
        matchedMother = fatherSpouses[0];
      }

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
      } else if (person.motherName?.trim()) {
        upperGroup.push({
          key: `mother-text-${person.motherName}`,
          displayName: person.motherName.trim(),
          gender: 'female',
          relationshipLabel: '母亲',
          yearsLabel: '',
        });
      } else if (father.spouses?.[0]?.name?.trim()) {
        upperGroup.push({
          key: `mother-legacy-${father.spouses[0].name}`,
          displayName: father.spouses[0].name.trim(),
          gender: 'female',
          relationshipLabel: '母亲',
          yearsLabel: '',
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
    } else {
      if (person.fatherName?.trim()) {
        upperGroup.push({
          key: `father-text-${person.fatherName}`,
          displayName: person.fatherName.trim(),
          gender: 'male',
          relationshipLabel: '父亲',
          yearsLabel: '',
        });
      }
      if (person.motherName?.trim()) {
        upperGroup.push({
          key: `mother-text-${person.motherName}`,
          displayName: person.motherName.trim(),
          gender: 'female',
          relationshipLabel: '母亲',
          yearsLabel: '',
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
          if (child.motherName?.trim()) {
            const myFull = resolvePersonDisplayName(person, clanSurname);
            return (
              child.motherName.trim() === myFull ||
              child.motherName.trim() === person.name.trim()
            );
          }
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
    const seenNames = new Set<string>();

    spouseNodes.forEach((sp) => {
      const disp = resolvePersonDisplayName(sp, clanSurname);
      seenNames.add(disp);
      seenNames.add(sp.name.trim());
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

    (person.spouses || []).forEach((sp, idx) => {
      if (sp.id && spouseNodes.some((n) => n.id === sp.id)) return;
      const cleanName = sp.name?.trim();
      if (!cleanName || seenNames.has(cleanName)) return;
      const inferredGender: 'male' | 'female' | 'unknown' =
        person.gender === 'male'
          ? 'female'
          : person.gender === 'female'
            ? 'male'
            : 'unknown';
      const yearsParts = [sp.birthDate?.trim(), sp.deathDate?.trim()].filter(
        Boolean
      );
      lowerGroup.push({
        key: `legacy-spouse-${sp.id || idx}`,
        displayName: cleanName,
        gender: inferredGender,
        relationshipLabel: sp.relationLabel?.trim() || '配偶',
        yearsLabel: yearsParts.join(' - '),
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
  const birthYear = extractGregorianYear(
    person.birth?.date || person.birthDate,
    person.birth?.structuredDate
  );

  const computeAgeAt = (year: number | null): string | undefined => {
    if (birthYear === null || year === null) return undefined;
    const age = year - birthYear;
    if (age < 0 || age > 130) return undefined;
    return `年龄 ${age}`;
  };

  // 1. Birth
  const birthDateText = (
    person.birth?.structuredDate
      ? formatGenealogyDate(person.birth.structuredDate)
      : person.birth?.date || person.birthDate || ''
  ).trim();
  const birthPlaceText = (
    person.birth?.structuredPlace
      ? formatGenealogyPlace(person.birth.structuredPlace)
      : person.birth?.place || ''
  ).trim();
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
          : extractYearDisplay(birthDateText, person.birth?.structuredDate) ||
            '出生',
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

  // 2. Education History
  const eduList = person.career?.educationHistory || [];
  if (eduList.length > 0) {
    eduList.forEach((edu, idx) => {
      const dateText = (
        edu.structuredPeriod
          ? formatGenealogyDate(edu.structuredPeriod)
          : edu.period || ''
      ).trim();
      const detail = [edu.school?.trim(), edu.level?.trim()]
        .filter(Boolean)
        .join(' · ');
      if (!dateText && !detail) return;
      const y = extractGregorianYear(dateText, edu.structuredPeriod);
      events.push({
        id: `tl-edu-${edu.id || idx}`,
        eventType: 'education',
        sourceKind: 'education',
        sourceId: edu.id || `edu-${idx}`,
        targetPersonId: person.id,
        sortYear: y ?? (birthYear !== null ? birthYear + 18 + idx : 90000 + idx),
        sortOrder: 20 + idx,
        yearLabel:
          y !== null
            ? String(y)
            : extractYearDisplay(dateText, edu.structuredPeriod) || '求学',
        ageLabel: computeAgeAt(y),
        title: '教育',
        dateText: dateText || undefined,
        structuredDate: edu.structuredPeriod ?? null,
        detailText: detail || undefined,
        description: detail || undefined,
        organization: edu.school?.trim() || undefined,
        educationLevel: edu.level?.trim() || undefined,
        editTargetSection: 'other',
      });
    });
  } else if (
    person.career?.school?.trim() ||
    person.career?.educationLevel?.trim() ||
    person.career?.educationPeriod?.trim()
  ) {
    const dateText = person.career?.educationPeriod?.trim() || '';
    const detail = [
      person.career?.school?.trim(),
      person.career?.major?.trim(),
      person.career?.educationLevel?.trim(),
    ]
      .filter(Boolean)
      .join(' · ');
    const y = extractGregorianYear(dateText);
    events.push({
      id: `tl-edu-legacy`,
      eventType: 'education',
      sourceKind: 'education',
      sourceId: 'legacy-edu',
      targetPersonId: person.id,
      sortYear: y ?? (birthYear !== null ? birthYear + 18 : 90000),
      sortOrder: 20,
      yearLabel: y !== null ? String(y) : dateText || '求学',
      ageLabel: computeAgeAt(y),
      title: '教育',
      dateText: dateText || undefined,
      detailText: detail || undefined,
      description: detail || undefined,
      organization: person.career?.school?.trim() || undefined,
      educationLevel: person.career?.educationLevel?.trim() || undefined,
      editTargetSection: 'other',
    });
  }

  // 3. Career History
  const careerList = person.career?.careerHistory || [];
  if (careerList.length > 0) {
    careerList.forEach((job, idx) => {
      const dateText = (
        job.structuredPeriod
          ? formatGenealogyDate(job.structuredPeriod)
          : job.period || ''
      ).trim();
      const detail = [job.organization?.trim(), job.position?.trim()]
        .filter(Boolean)
        .join(' · ');
      const placeText = job.location?.trim() || '';
      if (!dateText && !detail && !placeText) return;
      const y = extractGregorianYear(dateText, job.structuredPeriod);
      events.push({
        id: `tl-career-${job.id || idx}`,
        eventType: 'career',
        sourceKind: 'career',
        sourceId: job.id || `career-${idx}`,
        targetPersonId: person.id,
        sortYear: y ?? (birthYear !== null ? birthYear + 24 + idx : 90100 + idx),
        sortOrder: 30 + idx,
        yearLabel:
          y !== null
            ? String(y)
            : extractYearDisplay(dateText, job.structuredPeriod) || '任职',
        ageLabel: computeAgeAt(y),
        title: '工作',
        dateText: dateText || undefined,
        structuredDate: job.structuredPeriod ?? null,
        placeText: placeText || undefined,
        detailText: detail || undefined,
        description: detail || undefined,
        organization: job.organization?.trim() || undefined,
        position: job.position?.trim() || undefined,
        editTargetSection: 'other',
      });
    });
  } else if (
    person.career?.profession?.trim() ||
    person.career?.title?.trim() ||
    person.officialTitle?.trim()
  ) {
    const detail = [
      person.career?.profession?.trim(),
      person.career?.title?.trim() || person.officialTitle?.trim(),
    ]
      .filter(Boolean)
      .join(' · ');
    events.push({
      id: `tl-career-legacy`,
      eventType: 'career',
      sourceKind: 'career',
      sourceId: 'legacy-career',
      targetPersonId: person.id,
      sortYear: birthYear !== null ? birthYear + 25 : 90100,
      sortOrder: 30,
      yearLabel: '工作/功名',
      title: '工作',
      detailText: detail,
      description: detail,
      organization: person.career?.profession?.trim() || undefined,
      position:
        person.career?.title?.trim() ||
        person.officialTitle?.trim() ||
        undefined,
      editTargetSection: 'other',
    });
  }

  // 4. Marriage Events (linked to custom marriage records in person.events if matching)
  const customEvents = person.events || [];
  const consumedMarriageEventIds = new Set<string>();

  const findMatchedMarriageEvent = (
    relatedId?: string,
    relatedName?: string
  ): PersonLifeEvent | undefined => {
    return customEvents.find((ce) => {
      if (ce.type !== 'marriage') return false;
      if (relatedId && ce.relatedPersonId === relatedId) return true;
      if (relatedName && ce.relatedPersonName?.trim() === relatedName.trim()) {
        return true;
      }
      return false;
    });
  };

  const isSpouseNode = Boolean(person.spouseOfId);
  if (isSpouseNode) {
    const partner = allPersons.find((p) => p.id === person.spouseOfId);
    if (partner) {
      const partnerName = resolvePersonDisplayName(partner, clanSurname);
      const matchedEv = findMatchedMarriageEvent(partner.id, partnerName);
      if (matchedEv) consumedMarriageEventIds.add(matchedEv.id);
      const mDateText = matchedEv?.structuredDate
        ? formatGenealogyDate(matchedEv.structuredDate).trim()
        : matchedEv?.date?.trim() || '';
      const mPlaceText = matchedEv?.structuredPlace
        ? formatGenealogyPlace(matchedEv.structuredPlace).trim()
        : matchedEv?.place?.trim() || '';
      const mYear = extractGregorianYear(mDateText, matchedEv?.structuredDate);

      events.push({
        id: `tl-marriage-${partner.id}`,
        eventType: 'marriage',
        sourceKind: 'marriage_node',
        sourceId: matchedEv?.id || partner.id,
        targetPersonId: person.id,
        sortYear:
          mYear ?? (birthYear !== null ? birthYear + 24 : 90200),
        sortOrder: 40,
        yearLabel:
          mYear !== null
            ? String(mYear)
            : extractYearDisplay(mDateText, matchedEv?.structuredDate) || '结婚',
        ageLabel: computeAgeAt(mYear),
        title: '结婚',
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
    const seen = new Set<string>();
    spouseNodes.forEach((sp, idx) => {
      const name = resolvePersonDisplayName(sp, clanSurname);
      seen.add(name);
      seen.add(sp.name.trim());
      const matchedEv = findMatchedMarriageEvent(sp.id, name);
      if (matchedEv) consumedMarriageEventIds.add(matchedEv.id);
      const mDateText = matchedEv?.structuredDate
        ? formatGenealogyDate(matchedEv.structuredDate).trim()
        : matchedEv?.date?.trim() || '';
      const mPlaceText = matchedEv?.structuredPlace
        ? formatGenealogyPlace(matchedEv.structuredPlace).trim()
        : matchedEv?.place?.trim() || '';
      const mYear = extractGregorianYear(mDateText, matchedEv?.structuredDate);

      events.push({
        id: `tl-marriage-${sp.id}`,
        eventType: 'marriage',
        sourceKind: 'marriage_node',
        sourceId: matchedEv?.id || sp.id,
        targetPersonId: person.id,
        sortYear:
          mYear ?? (birthYear !== null ? birthYear + 25 + idx : 90200 + idx),
        sortOrder: 40 + idx,
        yearLabel:
          mYear !== null
            ? String(mYear)
            : extractYearDisplay(mDateText, matchedEv?.structuredDate) || '结婚',
        ageLabel: computeAgeAt(mYear),
        title: '结婚',
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

    (person.spouses || []).forEach((sp, idx) => {
      if (sp.id && spouseNodes.some((n) => n.id === sp.id)) return;
      const cleanName = sp.name?.trim();
      if (!cleanName || seen.has(cleanName)) return;
      const matchedEv = findMatchedMarriageEvent(sp.id, cleanName);
      if (matchedEv) consumedMarriageEventIds.add(matchedEv.id);
      const mDateText = matchedEv?.structuredDate
        ? formatGenealogyDate(matchedEv.structuredDate).trim()
        : matchedEv?.date?.trim() || '';
      const mPlaceText = matchedEv?.structuredPlace
        ? formatGenealogyPlace(matchedEv.structuredPlace).trim()
        : matchedEv?.place?.trim() || '';
      const mYear = extractGregorianYear(mDateText, matchedEv?.structuredDate);

      events.push({
        id: `tl-marriage-legacy-${sp.id || idx}`,
        eventType: 'marriage',
        sourceKind: 'marriage_legacy',
        sourceId: matchedEv?.id || sp.id || `legacy-sp-${idx}`,
        targetPersonId: person.id,
        sortYear:
          mYear ?? (birthYear !== null ? birthYear + 25 + idx : 90250 + idx),
        sortOrder: 45 + idx,
        yearLabel:
          mYear !== null
            ? String(mYear)
            : extractYearDisplay(mDateText, matchedEv?.structuredDate) ||
              sp.relationLabel?.trim() ||
              '结婚',
        ageLabel: computeAgeAt(mYear),
        title: '结婚',
        dateText: mDateText || undefined,
        structuredDate: matchedEv?.structuredDate ?? null,
        placeText: mPlaceText || undefined,
        structuredPlace: matchedEv?.structuredPlace ?? null,
        detailText:
          matchedEv?.description?.trim() ||
          sp.clanOrigin?.trim() ||
          undefined,
        description:
          matchedEv?.description?.trim() ||
          sp.clanOrigin?.trim() ||
          undefined,
        relatedPerson: {
          displayName: cleanName,
          gender:
            person.gender === 'male'
              ? 'female'
              : person.gender === 'female'
                ? 'male'
                : 'unknown',
        },
        editTargetSection: 'family',
      });
    });
  }

  // 5. Children Births
  const primaryId = person.spouseOfId || person.id;
  const derivedChildren = getDerivedChildren(allPersons, primaryId).filter(
    (child) => {
      if (!isSpouseNode) return true;
      if (child.motherId) return child.motherId === person.id;
      if (child.motherName?.trim()) {
        const myFull = resolvePersonDisplayName(person, clanSurname);
        return (
          child.motherName.trim() === myFull ||
          child.motherName.trim() === person.name.trim()
        );
      }
      return getDerivedSpouses(allPersons, primaryId)[0]?.id === person.id;
    }
  );

  derivedChildren.forEach((child, idx) => {
    const cDateText = (
      child.birth?.structuredDate
        ? formatGenealogyDate(child.birth.structuredDate)
        : child.birth?.date || child.birthDate || ''
    ).trim();
    const cPlaceText = (
      child.birth?.structuredPlace
        ? formatGenealogyPlace(child.birth.structuredPlace)
        : child.birth?.place || ''
    ).trim();
    const cYear = extractGregorianYear(cDateText, child.birth?.structuredDate);
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
          : extractYearDisplay(cDateText, child.birth?.structuredDate) || '子嗣',
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

  // 6. Custom / Additional Unified Events (e.g., 迁居, 功名, 补充婚姻/教育/工作, 其他事件)
  customEvents.forEach((ev, idx) => {
    if (consumedMarriageEventIds.has(ev.id)) return;
    const evDateText = (
      ev.structuredDate
        ? formatGenealogyDate(ev.structuredDate)
        : ev.date || ''
    ).trim();
    const evPlaceText = (
      ev.structuredPlace
        ? formatGenealogyPlace(ev.structuredPlace)
        : ev.place || ''
    ).trim();
    const evYear = extractGregorianYear(evDateText, ev.structuredDate);
    const title =
      ev.type === 'other' && ev.customTypeLabel?.trim()
        ? ev.customTypeLabel.trim()
        : EVENT_TYPE_LABELS[ev.type] || '其他事件';
    const detail = [
      ev.organization?.trim(),
      ev.position?.trim() || ev.educationLevel?.trim(),
      ev.description?.trim(),
    ]
      .filter(Boolean)
      .join(' · ');

    const matchedRelPerson = ev.relatedPersonId
      ? allPersons.find((p) => p.id === ev.relatedPersonId)
      : undefined;

    events.push({
      id: `tl-custom-${ev.id}`,
      eventType: ev.type,
      sourceKind: 'custom_event',
      sourceId: ev.id,
      targetPersonId: person.id,
      customTypeLabel: ev.customTypeLabel,
      sortYear:
        evYear ?? (birthYear !== null ? birthYear + 30 + idx : 90500 + idx),
      sortOrder: 60 + idx,
      yearLabel:
        evYear !== null
          ? String(evYear)
          : extractYearDisplay(evDateText, ev.structuredDate) || title,
      ageLabel: computeAgeAt(evYear),
      title,
      dateText: evDateText || undefined,
      structuredDate: ev.structuredDate ?? null,
      placeText: evPlaceText || undefined,
      structuredPlace: ev.structuredPlace ?? null,
      detailText: detail || undefined,
      description: ev.description?.trim() || undefined,
      organization: ev.organization,
      position: ev.position,
      educationLevel: ev.educationLevel,
      deathCause: ev.deathCause,
      relatedPerson:
        matchedRelPerson || ev.relatedPersonName?.trim()
          ? {
              personId: matchedRelPerson?.id,
              displayName: matchedRelPerson
                ? resolvePersonDisplayName(matchedRelPerson, clanSurname)
                : ev.relatedPersonName!.trim(),
              avatarUrl: matchedRelPerson?.avatarUrl,
              gender: matchedRelPerson?.gender || 'unknown',
            }
          : undefined,
      editTargetSection: 'other',
    });
  });

  // 7. Death & Burial (when deceased)
  if (person.status === 'deceased') {
    const deathDateText = (
      person.death?.structuredDate
        ? formatGenealogyDate(person.death.structuredDate)
        : person.death?.date || person.deathDate || ''
    ).trim();
    const deathPlaceText = (
      person.death?.structuredPlace
        ? formatGenealogyPlace(person.death.structuredPlace)
        : person.death?.place || ''
    ).trim();
    const deathCauseText = person.death?.cause?.trim() || '';
    const deathYear = extractGregorianYear(
      deathDateText,
      person.death?.structuredDate
    );
    const deathAgeVal =
      person.death?.age ??
      person.age ??
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
            : extractYearDisplay(deathDateText, person.death?.structuredDate) ||
              '卒年',
        ageLabel:
          typeof deathAgeVal === 'number' && deathAgeVal >= 0
            ? `享寿 ${deathAgeVal}`
            : undefined,
        title: '去世',
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
        deathCause: deathCauseText || undefined,
        editTargetSection: 'vital',
      });
    }

    const burialDateText = (
      person.death?.structuredBurialDate
        ? formatGenealogyDate(person.death.structuredBurialDate)
        : person.death?.burialDate || ''
    ).trim();
    const burialPlaceText = (
      person.death?.structuredBurialPlace
        ? formatGenealogyPlace(person.death.structuredBurialPlace)
        : person.death?.burialPlace || person.burialPlace || ''
    ).trim();
    const burialYear = extractGregorianYear(
      burialDateText,
      person.death?.structuredBurialDate
    );

    if (burialDateText || burialPlaceText) {
      events.push({
        id: `tl-burial-${person.id}`,
        eventType: 'burial',
        sourceKind: 'burial',
        targetPersonId: person.id,
        sortYear: burialYear ?? (deathYear !== null ? deathYear : 99100),
        sortOrder: 90,
        yearLabel:
          burialYear !== null
            ? String(burialYear)
            : extractYearDisplay(
                burialDateText,
                person.death?.structuredBurialDate
              ) || '安葬',
        ageLabel: computeAgeAt(burialYear),
        title: '安葬',
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
  customTypeLabel?: string;
  structuredDate: GenealogyDate | null;
  structuredPlace: GenealogyPlace | null;
  description: string;
  // Optional type-specific supplements
  statusOverride?: 'living' | 'deceased';
  deathCause?: string;
  organization?: string;
  position?: string;
  educationLevel?: string;
  relatedPersonId?: string;
  relatedPersonName?: string;
}

export interface EventEditContext {
  mode: 'create' | 'edit';
  sourceKind?: TimelineSourceKind;
  sourceId?: string;
  targetPersonId: string;
  initialEvent: UnifiedEventSubmitPayload;
  canDelete?: boolean;
}

/**
 * Apply a unified event save payload onto the target PersonRecord cleanly and normalize.
 */
export function applyUnifiedEventToPerson(
  targetPerson: PersonRecord,
  allPersons: PersonRecord[],
  payload: UnifiedEventSubmitPayload,
  context: EventEditContext
): Partial<PersonRecord> {
  const formattedDate = payload.structuredDate
    ? formatGenealogyDate(payload.structuredDate).trim()
    : '';
  const formattedPlace = payload.structuredPlace
    ? formatGenealogyPlace(payload.structuredPlace).trim()
    : '';
  const desc = payload.description.trim();

  // 1. Birth
  if (
    context.sourceKind === 'birth' ||
    context.sourceKind === 'child_birth' ||
    (context.mode === 'create' && payload.type === 'birth')
  ) {
    const nextBirth = {
      ...(targetPerson.birth || {}),
      date: formattedDate,
      structuredDate: payload.structuredDate ?? undefined,
      place: formattedPlace,
      structuredPlace: payload.structuredPlace ?? undefined,
      summary: desc || undefined,
    };
    return normalizePersonForSave(
      {
        ...targetPerson,
        birth: nextBirth,
        birthDate: formattedDate || undefined,
      },
      allPersons
    );
  }

  // 2. Death
  if (
    context.sourceKind === 'death' ||
    (context.mode === 'create' && payload.type === 'death')
  ) {
    const nextStatus = payload.statusOverride || 'deceased';
    const nextDeath =
      nextStatus === 'living'
        ? undefined
        : {
            ...(targetPerson.death || {}),
            date: formattedDate,
            structuredDate: payload.structuredDate ?? undefined,
            place: formattedPlace,
            structuredPlace: payload.structuredPlace ?? undefined,
            cause: payload.deathCause?.trim() || undefined,
            summary: desc || undefined,
          };
    return normalizePersonForSave(
      {
        ...targetPerson,
        status: nextStatus,
        death: nextDeath,
        deathDate: nextStatus === 'living' ? undefined : formattedDate || undefined,
      },
      allPersons
    );
  }

  // 3. Burial
  if (
    context.sourceKind === 'burial' ||
    (context.mode === 'create' && payload.type === 'burial')
  ) {
    const nextDeath = {
      ...(targetPerson.death || {}),
      burialDate: formattedDate,
      structuredBurialDate: payload.structuredDate ?? undefined,
      burialPlace: formattedPlace,
      structuredBurialPlace: payload.structuredPlace ?? undefined,
      summary: desc || targetPerson.death?.summary || undefined,
    };
    return normalizePersonForSave(
      {
        ...targetPerson,
        status: 'deceased',
        death: nextDeath,
        burialPlace: formattedPlace || undefined,
      },
      allPersons
    );
  }

  // 4. Education
  if (
    context.sourceKind === 'education' ||
    (context.mode === 'create' && payload.type === 'education')
  ) {
    const existingList: PersonEducationEntry[] = [
      ...(targetPerson.career?.educationHistory || []),
    ];
    const schoolVal = payload.organization?.trim() || desc;
    const levelVal = payload.educationLevel?.trim() || undefined;

    if (context.mode === 'edit' && context.sourceId && context.sourceId !== 'legacy-edu') {
      const updated = existingList.map((item) =>
        item.id === context.sourceId
          ? {
              ...item,
              period: formattedDate || undefined,
              structuredPeriod: payload.structuredDate ?? undefined,
              school: schoolVal || undefined,
              level: levelVal,
            }
          : item
      );
      return normalizePersonForSave(
        {
          ...targetPerson,
          career: {
            ...(targetPerson.career || {}),
            educationHistory: updated,
          },
        },
        allPersons
      );
    }

    const newEntry: PersonEducationEntry = {
      id: `edu-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      period: formattedDate || undefined,
      structuredPeriod: payload.structuredDate ?? undefined,
      school: schoolVal || undefined,
      level: levelVal,
    };
    const nextList =
      context.sourceId === 'legacy-edu'
        ? [newEntry]
        : [...existingList, newEntry];
    return normalizePersonForSave(
      {
        ...targetPerson,
        career: {
          ...(targetPerson.career || {}),
          educationHistory: nextList,
        },
      },
      allPersons
    );
  }

  // 5. Career / Work
  if (
    context.sourceKind === 'career' ||
    (context.mode === 'create' && payload.type === 'career')
  ) {
    const existingList: PersonCareerEntry[] = [
      ...(targetPerson.career?.careerHistory || []),
    ];
    const orgVal = payload.organization?.trim() || desc;
    const posVal = payload.position?.trim() || undefined;

    if (
      context.mode === 'edit' &&
      context.sourceId &&
      context.sourceId !== 'legacy-career'
    ) {
      const updated = existingList.map((item) =>
        item.id === context.sourceId
          ? {
              ...item,
              period: formattedDate || undefined,
              structuredPeriod: payload.structuredDate ?? undefined,
              location: formattedPlace || undefined,
              organization: orgVal || undefined,
              position: posVal,
            }
          : item
      );
      return normalizePersonForSave(
        {
          ...targetPerson,
          career: {
            ...(targetPerson.career || {}),
            careerHistory: updated,
          },
        },
        allPersons
      );
    }

    const newEntry: PersonCareerEntry = {
      id: `career-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      period: formattedDate || undefined,
      structuredPeriod: payload.structuredDate ?? undefined,
      location: formattedPlace || undefined,
      organization: orgVal || undefined,
      position: posVal,
    };
    const nextList =
      context.sourceId === 'legacy-career'
        ? [newEntry]
        : [...existingList, newEntry];
    return normalizePersonForSave(
      {
        ...targetPerson,
        career: {
          ...(targetPerson.career || {}),
          careerHistory: nextList,
        },
      },
      allPersons
    );
  }

  // 6. Marriage / Residence / Honor / Other (stored in targetPerson.events)
  const existingEvents: PersonLifeEvent[] = [...(targetPerson.events || [])];
  const eventId =
    context.mode === 'edit' &&
    context.sourceKind === 'custom_event' &&
    context.sourceId
      ? context.sourceId
      : context.sourceKind === 'marriage_node' ||
          context.sourceKind === 'marriage_legacy'
        ? existingEvents.find(
            (ce) =>
              ce.id === context.sourceId ||
              (ce.type === 'marriage' &&
                ((payload.relatedPersonId &&
                  ce.relatedPersonId === payload.relatedPersonId) ||
                  (payload.relatedPersonName &&
                    ce.relatedPersonName === payload.relatedPersonName)))
          )?.id || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
        : `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

  const nextLifeEvent: PersonLifeEvent = {
    id: eventId,
    type: payload.type,
    customTypeLabel:
      payload.type === 'other' ? payload.customTypeLabel?.trim() || undefined : undefined,
    date: formattedDate || undefined,
    structuredDate: payload.structuredDate ?? undefined,
    place: formattedPlace || undefined,
    structuredPlace: payload.structuredPlace ?? undefined,
    description: desc || undefined,
    relatedPersonId: payload.relatedPersonId || undefined,
    relatedPersonName: payload.relatedPersonName?.trim() || undefined,
    organization: payload.organization?.trim() || undefined,
    position: payload.position?.trim() || undefined,
    educationLevel: payload.educationLevel?.trim() || undefined,
    deathCause: payload.deathCause?.trim() || undefined,
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
 * Remove a removable event (education, career, custom_event, or burial) from PersonRecord.
 */
export function removeUnifiedEventFromPerson(
  targetPerson: PersonRecord,
  allPersons: PersonRecord[],
  context: EventEditContext
): Partial<PersonRecord> | null {
  if (context.sourceKind === 'education' && context.sourceId) {
    if (context.sourceId === 'legacy-edu') {
      return normalizePersonForSave(
        {
          ...targetPerson,
          career: {
            ...(targetPerson.career || {}),
            educationPeriod: undefined,
            educationLevel: undefined,
            school: undefined,
            major: undefined,
            educationSummary: undefined,
          },
        },
        allPersons
      );
    }
    const nextEdu = (targetPerson.career?.educationHistory || []).filter(
      (e) => e.id !== context.sourceId
    );
    return normalizePersonForSave(
      {
        ...targetPerson,
        career: {
          ...(targetPerson.career || {}),
          educationHistory: nextEdu,
        },
      },
      allPersons
    );
  }

  if (context.sourceKind === 'career' && context.sourceId) {
    if (context.sourceId === 'legacy-career') {
      return normalizePersonForSave(
        {
          ...targetPerson,
          officialTitle: undefined,
          career: {
            ...(targetPerson.career || {}),
            profession: undefined,
            title: undefined,
          },
        },
        allPersons
      );
    }
    const nextCareer = (targetPerson.career?.careerHistory || []).filter(
      (c) => c.id !== context.sourceId
    );
    return normalizePersonForSave(
      {
        ...targetPerson,
        career: {
          ...(targetPerson.career || {}),
          careerHistory: nextCareer,
        },
      },
      allPersons
    );
  }

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
        burialPlace: undefined,
        death: targetPerson.death
          ? {
              ...targetPerson.death,
              burialDate: '',
              structuredBurialDate: undefined,
              burialPlace: '',
              structuredBurialPlace: undefined,
            }
          : undefined,
      },
      allPersons
    );
  }

  return null;
}
