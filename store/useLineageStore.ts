import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TreeItem } from '../components/common/Tree/types';
import { findItemDeep, removeItem, setProperty } from '../components/common/Tree/utilities';
import { createAppStorage } from './storageAdapter';
import {
  LineageViewMode,
  PersonLifeEvent,
  PersonRecord,
} from '../features/lineage/types';
import { createSeedPersonsForChart } from '../features/lineage/lineageData';
import { parseQuickDateInput } from '../features/date-input';
import type { GenealogyDate } from '../features/date-input/date.types';
import { parsePlaceText, type GenealogyPlace } from '../features/place-input';
import {
  SPOUSE_RANK_ORDER,
  normalizeEventType,
} from '../features/lineage/utils/personHelpers';

export const DEFAULT_LINEAGE_TREE: TreeItem[] = [
  {
    id: 'lineage-group-royal',
    type: 'folder',
    collapsed: false,
    data: { name: '【范例】皇族世系参考' },
    children: [
      {
        id: 'lineage-royal-1',
        type: 'chart',
        data: { name: '西汉天潢图系' },
        children: [],
      },
      {
        id: 'lineage-royal-2',
        type: 'chart',
        data: { name: '西汉楚元王交公世系图' },
        children: [],
      },
      {
        id: 'lineage-royal-3',
        type: 'chart',
        data: { name: '西汉梁孝王武之裔图系' },
        children: [],
      },
      {
        id: 'lineage-royal-4',
        type: 'chart',
        data: { name: '东汉天潢图系' },
        children: [],
      },
      {
        id: 'lineage-royal-5',
        type: 'chart',
        data: { name: '蜀汉天潢图系' },
        children: [],
      },
      {
        id: 'lineage-royal-6',
        type: 'chart',
        data: { name: '东汉广陵思王荆之裔图系' },
        children: [],
      },
      {
        id: 'lineage-royal-7',
        type: 'chart',
        data: { name: '南朝宋刘天潢图系' },
        children: [],
      },
    ],
  },
  {
    id: 'lineage-group-other',
    type: 'folder',
    collapsed: false,
    data: { name: '【范例】其他世系参考' },
    children: [
      {
        id: 'lineage-other-1',
        type: 'chart',
        data: { name: '小田幼房世派世系图' },
        children: [],
      },
      {
        id: 'lineage-other-2',
        type: 'chart',
        data: { name: '墨山王氏習静位下世系' },
        children: [],
      },
      {
        id: 'lineage-other-3',
        type: 'chart',
        data: { name: '小田幼房世派世系图' },
        children: [],
      },
    ],
  },
  {
    id: 'lineage-group-ancestors',
    type: 'folder',
    collapsed: false,
    data: { name: '【范例】远祖世系参考' },
    children: [
      {
        id: 'lineage-ancestor-1',
        type: 'chart',
        data: { name: '彭氏远祖世次' },
        children: [],
      },
    ],
  },
];

export function findFirstChartId(items: TreeItem[]): string | null {
  for (const item of items) {
    if (item.type === 'chart') {
      return String(item.id);
    }
    if (item.children?.length) {
      const found = findFirstChartId(item.children);
      if (found) return found;
    }
  }
  return null;
}

export function countChartsInTree(items: TreeItem[]): number {
  let count = 0;
  for (const item of items) {
    if (item.type === 'chart') {
      count += 1;
    } else if (item.children?.length) {
      count += countChartsInTree(item.children);
    }
  }
  return count;
}

export function makeChartStorageKey(projectId: string, chartId: string): string {
  return `${projectId}::${chartId}`;
}

function cloneDefaultTree(): TreeItem[] {
  return structuredClone(DEFAULT_LINEAGE_TREE);
}

function preserveCollapsedChildren(
  prevItems: TreeItem[],
  nextItems: TreeItem[]
): TreeItem[] {
  return nextItems.map((item) => {
    const prevNode = findItemDeep(prevItems, item.id);
    const restoredChildren =
      item.collapsed && item.children.length === 0 && prevNode?.children?.length
        ? prevNode.children
        : preserveCollapsedChildren(prevItems, item.children || []);
    return {
      ...item,
      children: restoredChildren,
    };
  });
}

function cloneSubtreeWithNewIds(node: TreeItem, suffix: string): TreeItem {
  return {
    ...node,
    id: `${String(node.id)}-copy-${suffix}-${Math.random().toString(36).slice(2, 6)}`,
    data: {
      ...node.data,
      name: `${node.data?.name || String(node.id)} (副本)`,
    },
    children: (node.children || []).map((child) =>
      cloneSubtreeWithNewIds(child, suffix)
    ),
  };
}

function collectDescendantIds(persons: PersonRecord[], rootId: string): Set<string> {
  const toDelete = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of persons) {
      if (p.fatherId && toDelete.has(p.fatherId) && !toDelete.has(p.id)) {
        toDelete.add(p.id);
        changed = true;
      }
      if (p.spouseOfId && toDelete.has(p.spouseOfId) && !toDelete.has(p.id)) {
        toDelete.add(p.id);
        changed = true;
      }
    }
  }
  return toDelete;
}

export interface LineageChartMeta {
  name: string;
  surname?: string;
  hallName?: string;
  progenitor?: string;
  region?: GenealogyPlace | null;
}

export interface LineageState {
  treesByProject: Record<string, TreeItem[]>;
  selectedNodeIdByProject: Record<string, string>;
  personsByChart: Record<string, PersonRecord[]>;
  selectedPersonIdByChart: Record<string, string | null>;
  viewModeByProject: Record<string, LineageViewMode>;

  setTree: (projectId: string, items: TreeItem[]) => void;
  initializeProjectLineage: (
    projectId: string,
    params: {
      familyName: string;
      ancestor: string;
      surname?: string;
      region?: GenealogyPlace | string | null;
    }
  ) => void;
  selectNode: (projectId: string, nodeId: string) => void;
  addGroup: (projectId: string, name?: string) => string;
  addChart: (
    projectId: string,
    parentId?: string,
    input?: string | LineageChartMeta
  ) => string;
  updateChartMeta: (
    projectId: string,
    chartId: string,
    meta: LineageChartMeta
  ) => void;
  renameNode: (projectId: string, id: string, name: string) => void;
  duplicateNode: (projectId: string, id: string) => void;
  removeNode: (projectId: string, id: string) => void;

  setViewMode: (projectId: string, mode: LineageViewMode) => void;
  selectPerson: (projectId: string, chartId: string, personId: string | null) => void;
  addPerson: (
    projectId: string,
    chartId: string,
    person: PersonRecord,
    chartName?: string,
    surname?: string,
    options?: { select?: boolean }
  ) => void;
  addPersonsBatch: (
    projectId: string,
    chartId: string,
    persons: PersonRecord[],
    chartName?: string,
    surname?: string,
    options?: { selectId?: string | null }
  ) => void;
  updatePerson: (
    projectId: string,
    chartId: string,
    personId: string,
    updates: Partial<PersonRecord>,
    chartName?: string,
    surname?: string
  ) => void;
  deletePerson: (
    projectId: string,
    chartId: string,
    personId: string,
    chartName?: string,
    surname?: string
  ) => void;
  reorderSibling: (
    projectId: string,
    chartId: string,
    parentId: string,
    childId: string,
    direction: 'up' | 'down',
    chartName?: string,
    surname?: string
  ) => void;
  addParentForPerson: (
    projectId: string,
    chartId: string,
    childId: string,
    parentPerson: PersonRecord,
    chartName?: string,
    surname?: string,
    options?: { select?: boolean }
  ) => void;
  removePersonOnly: (
    projectId: string,
    chartId: string,
    personId: string,
    chartName?: string,
    surname?: string
  ) => void;
}

function legacyTextToGenealogyDate(raw?: string | null): GenealogyDate | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const parsed = parseQuickDateInput(trimmed);
  if (parsed.ok && parsed.value) return parsed.value;
  return {
    schemaVersion: 1,
    kind: 'phrase',
    originalText: trimmed,
  };
}

function migrateTreeNodesRegion(items: TreeItem[]): TreeItem[] {
  return items.map((item) => ({
    ...item,
    data: item.data
      ? {
          ...item.data,
          ...(item.data.region !== undefined
            ? { region: parsePlaceText(item.data.region) ?? undefined }
            : {}),
        }
      : item.data,
    children: item.children ? migrateTreeNodesRegion(item.children) : [],
  }));
}

interface LegacySpouseInput {
  id?: string;
  relationLabel?: string;
  prefix?: string;
  name?: string;
  clanOrigin?: string;
  birthDate?: string;
  deathDate?: string;
  burialPlace?: string;
  remarks?: string;
}

/**
 * Losslessly upgrade persisted PersonRecord[] from versions <4 into canonical SSOT PersonRecord[]:
 * - Promotes embedded `spouses[]` entries into independent spouse PersonRecord nodes (collision-safe IDs).
 * - Resolves child `motherName` -> `motherId` matching the mother's node ID.
 * - Converts legacy string date/place/career/alias/age/page fields into canonical nested fields.
 * - Deletes all legacy shadow keys from returned records.
 */
export function migrateChartPersonsV4(rawPersons: unknown[]): PersonRecord[] {
  if (!Array.isArray(rawPersons)) return [];

  const records: Array<Record<string, any>> = rawPersons.filter(
    (item): item is Record<string, any> => Boolean(item && typeof item === 'object')
  );

  const usedIds = new Set<string>(
    records.map((r) => String(r.id || '')).filter(Boolean)
  );
  const promotedSpouses: PersonRecord[] = [];
  const spousesByPartnerMap = new Map<string, PersonRecord[]>();

  const registerSpouseNode = (partnerId: string, sp: PersonRecord) => {
    const list = spousesByPartnerMap.get(partnerId);
    if (list) list.push(sp);
    else spousesByPartnerMap.set(partnerId, [sp]);
  };

  // Index any pre-existing independent spouse nodes
  for (const r of records) {
    if (r.spouseOfId) {
      registerSpouseNode(String(r.spouseOfId), r as PersonRecord);
    }
  }

  const nextCanonicalRecords: PersonRecord[] = [];

  for (const raw of records) {
    const birthRaw = raw.birth && typeof raw.birth === 'object' ? raw.birth : {};
    const deathRaw = raw.death && typeof raw.death === 'object' ? raw.death : {};
    const careerRaw = raw.career && typeof raw.career === 'object' ? raw.career : {};
    const seqRaw =
      raw.sequenceMeta && typeof raw.sequenceMeta === 'object' ? raw.sequenceMeta : {};
    const privRaw =
      raw.privateInfo && typeof raw.privateInfo === 'object' ? raw.privateInfo : {};

    // Aliases
    const aliasSet = new Set<string>();
    if (Array.isArray(raw.aliases)) {
      raw.aliases.forEach((a: unknown) => {
        if (typeof a === 'string' && a.trim()) aliasSet.add(a.trim());
      });
    }
    if (typeof raw.courtesyName === 'string' && raw.courtesyName.trim()) {
      raw.courtesyName
        .split(/[、,，;；\s]+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
        .forEach((s: string) => aliasSet.add(s));
    }

    // Education history (carried forward into v5 migration)
    const eduHistory: Array<Record<string, any>> = Array.isArray(careerRaw.educationHistory)
      ? careerRaw.educationHistory
          .map((e: any, idx: number) => ({
            id: e.id || `edu-${idx + 1}`,
            structuredPeriod:
              e.structuredPeriod ?? legacyTextToGenealogyDate(e.period),
            level: e.level?.trim() || undefined,
            school: e.school?.trim() || undefined,
            major: e.major?.trim() || undefined,
            graduationStatus: e.graduationStatus?.trim() || undefined,
          }))
          .filter((e: Record<string, any>) =>
            Boolean(
              e.structuredPeriod || e.level || e.school || e.major || e.graduationStatus
            )
          )
      : [];

    if (
      eduHistory.length === 0 &&
      (careerRaw.school || careerRaw.major || careerRaw.educationLevel || careerRaw.educationPeriod)
    ) {
      eduHistory.push({
        id: 'edu-1',
        structuredPeriod: legacyTextToGenealogyDate(careerRaw.educationPeriod),
        level: careerRaw.educationLevel?.trim() || undefined,
        school: careerRaw.school?.trim() || undefined,
        major: careerRaw.major?.trim() || undefined,
        graduationStatus: careerRaw.graduationStatus?.trim() || undefined,
      });
    }

    // Career history (carried forward into v5 migration)
    const careerHistory: Array<Record<string, any>> = Array.isArray(careerRaw.careerHistory)
      ? careerRaw.careerHistory
          .map((c: any, idx: number) => ({
            id: c.id || `career-${idx + 1}`,
            structuredPeriod:
              c.structuredPeriod ?? legacyTextToGenealogyDate(c.period),
            structuredPlace: c.structuredPlace ?? parsePlaceText(c.location) ?? undefined,
            organization: c.organization?.trim() || undefined,
            position: c.position?.trim() || undefined,
          }))
          .filter((c: Record<string, any>) =>
            Boolean(
              c.structuredPeriod || c.structuredPlace || c.organization || c.position
            )
          )
      : [];

    if (
      careerHistory.length === 0 &&
      (careerRaw.profession || careerRaw.title || raw.officialTitle)
    ) {
      careerHistory.push({
        id: 'career-1',
        organization: careerRaw.profession?.trim() || undefined,
        position:
          careerRaw.title?.trim() || raw.officialTitle?.trim() || undefined,
      });
    }

    // Events (carried forward into v5 migration)
    const migratedEvents: Array<Record<string, any>> | undefined = Array.isArray(raw.events)
      ? raw.events.map((ev: any) => ({
          id: ev.id,
          type: ev.type,
          customTypeLabel: ev.customTypeLabel,
          structuredDate:
            ev.structuredDate ?? legacyTextToGenealogyDate(ev.date),
          structuredPlace:
            ev.structuredPlace ?? parsePlaceText(ev.place) ?? undefined,
          description: ev.description,
          relatedPersonId: ev.relatedPersonId,
          relatedPersonName: ev.relatedPersonName,
          organization: ev.organization,
          position: ev.position,
          educationLevel: ev.educationLevel,
          deathCause: ev.deathCause,
        }))
      : undefined;

    const birthDate =
      birthRaw.structuredDate ?? legacyTextToGenealogyDate(birthRaw.date ?? raw.birthDate);
    const birthPlace =
      birthRaw.structuredPlace ?? parsePlaceText(birthRaw.place) ?? undefined;
    const deathDate =
      deathRaw.structuredDate ?? legacyTextToGenealogyDate(deathRaw.date ?? raw.deathDate);
    const deathPlace =
      deathRaw.structuredPlace ?? parsePlaceText(deathRaw.place) ?? undefined;
    const burialDate =
      deathRaw.structuredBurialDate ??
      legacyTextToGenealogyDate(deathRaw.burialDate);
    const burialPlace =
      deathRaw.structuredBurialPlace ??
      parsePlaceText(deathRaw.burialPlace ?? raw.burialPlace) ??
      undefined;
    const rawManualAge = deathRaw.manualAge ?? deathRaw.age ?? raw.age;
    const manualAge =
      typeof rawManualAge === 'number' && Number.isFinite(rawManualAge)
        ? Math.round(rawManualAge)
        : undefined;

    const originalPage =
      typeof seqRaw.originalPage === 'number'
        ? seqRaw.originalPage
        : typeof raw.biographyPage === 'number'
          ? raw.biographyPage
          : undefined;

    const legalName =
      raw.legalName?.trim() || privRaw.idCardName?.trim() || undefined;

    const spouseSiblingOrder =
      raw.spouseOfId && raw.siblingOrder === undefined && raw.spouseRelationLabel
        ? SPOUSE_RANK_ORDER[String(raw.spouseRelationLabel).trim()]
        : raw.siblingOrder;

    const canonical: PersonRecord = {
      id: String(raw.id),
      branchId: String(raw.branchId || 'default'),
      ...(raw.avatarUrl ? { avatarUrl: raw.avatarUrl } : {}),
      ...(raw.surname ? { surname: raw.surname } : {}),
      name: String(raw.name || '未命名'),
      ...(raw.nameSuffix ? { nameSuffix: raw.nameSuffix } : {}),
      ...(raw.romanizedName ? { romanizedName: raw.romanizedName } : {}),
      ...(legalName ? { legalName } : {}),
      ...(aliasSet.size > 0 ? { aliases: Array.from(aliasSet) } : {}),
      ...(raw.childhoodName ? { childhoodName: raw.childhoodName } : {}),
      gender: raw.gender || 'male',
      status: raw.status || 'deceased',
      generation: typeof raw.generation === 'number' ? raw.generation : 1,
      ...(raw.generationWord ? { generationWord: raw.generationWord } : {}),
      ...(raw.hangOrder ? { hangOrder: raw.hangOrder } : {}),
      ...(spouseSiblingOrder !== undefined
        ? { siblingOrder: spouseSiblingOrder }
        : {}),
      fatherId: raw.fatherId ?? null,
      ...(raw.motherId ? { motherId: raw.motherId } : {}),
      ...(raw.spouseOfId ? { spouseOfId: raw.spouseOfId } : {}),
      ...(raw.relationType ? { relationType: raw.relationType } : {}),
      ...(raw.fatherRelationType
        ? { fatherRelationType: raw.fatherRelationType }
        : {}),
      ...(raw.motherRelationType
        ? { motherRelationType: raw.motherRelationType }
        : {}),
      ...(raw.relationTitle ? { relationTitle: raw.relationTitle } : {}),
      ...(raw.relationPrefix ? { relationPrefix: raw.relationPrefix } : {}),
      ...(raw.relationNotes ? { relationNotes: raw.relationNotes } : {}),
      ...(raw.lineageRemarks ? { lineageRemarks: raw.lineageRemarks } : {}),
      ...(raw.branchLabel ? { branchLabel: raw.branchLabel } : {}),
      ...(raw.headingLine ? { headingLine: raw.headingLine } : {}),
      ...(birthDate || birthPlace || birthRaw.summary
        ? {
            birth: {
              ...(birthDate ? { structuredDate: birthDate } : {}),
              ...(birthPlace ? { structuredPlace: birthPlace } : {}),
              ...(birthRaw.summary ? { summary: birthRaw.summary } : {}),
            },
          }
        : {}),
      ...(eduHistory.length > 0 ||
      careerHistory.length > 0 ||
      careerRaw.resume ||
      careerRaw.lifeSummary
        ? {
            career: {
              ...(eduHistory.length > 0 ? { educationHistory: eduHistory } : {}),
              ...(careerHistory.length > 0 ? { careerHistory: careerHistory } : {}),
              ...(careerRaw.resume ? { resume: careerRaw.resume } : {}),
              ...(careerRaw.lifeSummary ? { lifeSummary: careerRaw.lifeSummary } : {}),
            },
          }
        : {}),
      ...(deathDate ||
      deathPlace ||
      burialDate ||
      burialPlace ||
      deathRaw.cause ||
      deathRaw.summary ||
      manualAge !== undefined
        ? {
            death: {
              ...(deathDate ? { structuredDate: deathDate } : {}),
              ...(deathPlace ? { structuredPlace: deathPlace } : {}),
              ...(burialDate ? { structuredBurialDate: burialDate } : {}),
              ...(burialPlace ? { structuredBurialPlace: burialPlace } : {}),
              ...(deathRaw.cause ? { cause: deathRaw.cause } : {}),
              ...(deathRaw.summary ? { summary: deathRaw.summary } : {}),
              ...(manualAge !== undefined ? { manualAge } : {}),
            },
          }
        : {}),
      ...(migratedEvents && migratedEvents.length > 0
        ? { events: migratedEvents as unknown as PersonLifeEvent[] }
        : {}),
      ...(seqRaw.mainLabel ||
      seqRaw.mainNumber !== undefined ||
      seqRaw.subLabel ||
      seqRaw.subNumber !== undefined ||
      originalPage !== undefined
        ? {
            sequenceMeta: {
              ...(seqRaw.mainLabel ? { mainLabel: seqRaw.mainLabel } : {}),
              ...(seqRaw.mainNumber !== undefined
                ? { mainNumber: seqRaw.mainNumber }
                : {}),
              ...(seqRaw.subLabel ? { subLabel: seqRaw.subLabel } : {}),
              ...(seqRaw.subNumber !== undefined
                ? { subNumber: seqRaw.subNumber }
                : {}),
              ...(originalPage !== undefined ? { originalPage } : {}),
            },
          }
        : {}),
      ...(privRaw.idCardNum || privRaw.mobile || privRaw.address
        ? {
            privateInfo: {
              ...(privRaw.idCardNum ? { idCardNum: privRaw.idCardNum } : {}),
              ...(privRaw.mobile ? { mobile: privRaw.mobile } : {}),
              ...(privRaw.address ? { address: privRaw.address } : {}),
            },
          }
        : {}),
      ...(raw.biography ? { biography: raw.biography } : {}),
      ...(raw.biographyOrder !== undefined
        ? { biographyOrder: raw.biographyOrder }
        : {}),
      ...(raw.notes ? { notes: raw.notes } : {}),
    };

    nextCanonicalRecords.push(canonical);

    // Promote embedded legacy spouses[] if not already backed by an independent node
    if (!raw.spouseOfId && Array.isArray(raw.spouses) && raw.spouses.length > 0) {
      const existingSpouses = spousesByPartnerMap.get(canonical.id) || [];
      raw.spouses.forEach((sp: LegacySpouseInput, spIdx: number) => {
        const cleanSpName = sp?.name?.trim();
        if (!cleanSpName) return;

        const alreadyExists =
          (sp.id && existingSpouses.some((e) => e.id === sp.id)) ||
          existingSpouses.some((e) => {
            const eFull = `${e.surname || ''}${e.name}`.trim();
            return e.name.trim() === cleanSpName || eFull === cleanSpName;
          });
        if (alreadyExists) return;

        let newId = sp.id && !usedIds.has(sp.id)
          ? sp.id
          : `${canonical.id}-sp-${spIdx + 1}`;
        while (usedIds.has(newId)) {
          newId = `${newId}-m`;
        }
        usedIds.add(newId);

        const rankOrder = sp.relationLabel
          ? SPOUSE_RANK_ORDER[sp.relationLabel.trim()]
          : undefined;
        const spBirthDate = legacyTextToGenealogyDate(sp.birthDate);
        const spDeathDate = legacyTextToGenealogyDate(sp.deathDate);
        const spBurialPlace = parsePlaceText(sp.burialPlace) ?? undefined;
        const spGender: 'male' | 'female' | 'unknown' =
          canonical.gender === 'female' ? 'male' : 'female';
        const isDeceased = Boolean(spDeathDate || spBurialPlace || canonical.status === 'deceased');

        const promoted: PersonRecord = {
          id: newId,
          branchId: canonical.branchId,
          name: cleanSpName,
          gender: spGender,
          status: isDeceased ? 'deceased' : 'living',
          generation: canonical.generation,
          fatherId: null,
          spouseOfId: canonical.id,
          siblingOrder: rankOrder ?? existingSpouses.length + spIdx + 1,
          relationType: spGender === 'male' ? '丈夫' : '妻子',
          ...(sp.prefix ? { relationPrefix: sp.prefix.trim() } : {}),
          ...(sp.remarks ? { lineageRemarks: sp.remarks.trim() } : {}),
          ...(sp.clanOrigin ? { notes: sp.clanOrigin.trim() } : {}),
          ...(spBirthDate ? { birth: { structuredDate: spBirthDate } } : {}),
          ...(spDeathDate || spBurialPlace
            ? {
                death: {
                  ...(spDeathDate ? { structuredDate: spDeathDate } : {}),
                  ...(spBurialPlace ? { structuredBurialPlace: spBurialPlace } : {}),
                },
              }
            : {}),
        };
        promotedSpouses.push(promoted);
        existingSpouses.push(promoted);
        registerSpouseNode(canonical.id, promoted);
      });
    }
  }

  const allMerged = [...nextCanonicalRecords, ...promotedSpouses];
  const rawMotherNameById = new Map<string, string>();
  for (const raw of records) {
    if (typeof raw.motherName === 'string' && raw.motherName.trim()) {
      rawMotherNameById.set(String(raw.id), raw.motherName.trim());
    }
  }

  return allMerged.map((person) => {
    if (person.spouseOfId || person.motherId || !person.fatherId) return person;
    const legacyMotherName = rawMotherNameById.get(person.id);
    if (!legacyMotherName) return person;
    const fatherSpouses = spousesByPartnerMap.get(person.fatherId) || [];
    const matched = fatherSpouses.find((sp) => {
      const full = `${sp.surname || ''}${sp.name}`.trim();
      return sp.name.trim() === legacyMotherName || full === legacyMotherName;
    });
    if (!matched) return person;
    return {
      ...person,
      motherId: matched.id,
    };
  });
}

/**
 * Losslessly upgrade persisted PersonRecord[] from v4 into v5 unified 4-field events:
 * - Converts `career.educationHistory[]` -> `events[]` (`type: 'education'`)
 * - Converts `career.careerHistory[]` -> `events[]` (`type: 'career'`)
 * - Folds `career.resume` / `career.lifeSummary` into `biography`
 * - Collapses all special-case event fields (`customTypeLabel`, `organization`, `position`,
 *   `educationLevel`, `relatedPersonName`, `deathCause`) into uniform `description`
 * - Maps legacy event types (`burial` -> `death`, `honor` -> `career`)
 * - Removes `career` and all legacy event sub-keys completely
 */
export function migrateChartPersonsV5(rawPersons: unknown[]): PersonRecord[] {
  if (!Array.isArray(rawPersons)) return [];

  return rawPersons
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object'))
    .map((raw) => {
      const nextEvents: PersonLifeEvent[] = [];
      const usedEventIds = new Set<string>();

      const pushUniqueEvent = (ev: PersonLifeEvent) => {
        if (!ev.structuredDate && !ev.structuredPlace && !ev.description?.trim()) {
          return;
        }
        let nextId = ev.id || `ev-${nextEvents.length + 1}`;
        while (usedEventIds.has(nextId)) {
          nextId = `${nextId}-m`;
        }
        usedEventIds.add(nextId);
        nextEvents.push({
          id: nextId,
          type: ev.type,
          ...(ev.structuredDate ? { structuredDate: ev.structuredDate } : {}),
          ...(ev.structuredPlace ? { structuredPlace: ev.structuredPlace } : {}),
          ...(ev.description?.trim() ? { description: ev.description.trim() } : {}),
        });
      };

      const careerRaw =
        raw.career && typeof raw.career === 'object' ? raw.career : null;

      if (careerRaw) {
        if (Array.isArray(careerRaw.educationHistory)) {
          careerRaw.educationHistory.forEach((edu: any, idx: number) => {
            if (!edu || typeof edu !== 'object') return;
            const date =
              edu.structuredPeriod ?? legacyTextToGenealogyDate(edu.period);
            const desc = [
              edu.school?.trim(),
              edu.major?.trim(),
              edu.level?.trim(),
              edu.graduationStatus?.trim(),
            ]
              .filter(Boolean)
              .join(' · ');
            pushUniqueEvent({
              id: edu.id || `ev-edu-${idx + 1}`,
              type: 'education',
              structuredDate: date ?? undefined,
              description: desc || undefined,
            });
          });
        }

        if (Array.isArray(careerRaw.careerHistory)) {
          careerRaw.careerHistory.forEach((job: any, idx: number) => {
            if (!job || typeof job !== 'object') return;
            const date =
              job.structuredPeriod ?? legacyTextToGenealogyDate(job.period);
            const place =
              job.structuredPlace ?? parsePlaceText(job.location) ?? undefined;
            const desc = [job.organization?.trim(), job.position?.trim()]
              .filter(Boolean)
              .join(' · ');
            pushUniqueEvent({
              id: job.id || `ev-career-${idx + 1}`,
              type: 'career',
              structuredDate: date ?? undefined,
              structuredPlace: place,
              description: desc || undefined,
            });
          });
        }
      }

      if (Array.isArray(raw.events)) {
        raw.events.forEach((ev: any, idx: number) => {
          if (!ev || typeof ev !== 'object') return;
          const rawType = ev.type;
          const normalizedType = normalizeEventType(rawType);
          const date = ev.structuredDate ?? legacyTextToGenealogyDate(ev.date);
          const place =
            ev.structuredPlace ?? parsePlaceText(ev.place) ?? undefined;

          const parts: string[] = [];
          const pushPart = (val: unknown) => {
            if (typeof val !== 'string') return;
            const trimmed = val.trim();
            if (!trimmed) return;
            if (!parts.includes(trimmed)) parts.push(trimmed);
          };

          if (rawType === 'burial') pushPart('安葬');
          if (rawType === 'honor') pushPart('功名');
          pushPart(ev.customTypeLabel);
          pushPart(ev.relatedPersonName);
          pushPart(ev.organization);
          pushPart(ev.position);
          pushPart(ev.educationLevel);
          if (typeof ev.deathCause === 'string' && ev.deathCause.trim()) {
            pushPart(`死因：${ev.deathCause.trim()}`);
          }
          pushPart(ev.description);

          pushUniqueEvent({
            id: ev.id || `ev-${idx + 1}`,
            type: normalizedType,
            structuredDate: date ?? undefined,
            structuredPlace: place,
            description: parts.join(' · ') || undefined,
          });
        });
      }

      let mergedBiography =
        typeof raw.biography === 'string' ? raw.biography.trim() : '';
      if (careerRaw) {
        const extraBioParts = [
          typeof careerRaw.resume === 'string' ? careerRaw.resume.trim() : '',
          typeof careerRaw.lifeSummary === 'string'
            ? careerRaw.lifeSummary.trim()
            : '',
        ].filter((txt) => txt && !mergedBiography.includes(txt));
        if (extraBioParts.length > 0) {
          mergedBiography = [mergedBiography, ...extraBioParts]
            .filter(Boolean)
            .join('\n');
        }
      }

      const { career: _droppedCareer, events: _droppedEvents, ...rest } = raw;
      return {
        ...(rest as PersonRecord),
        ...(mergedBiography ? { biography: mergedBiography } : {}),
        ...(nextEvents.length > 0 ? { events: nextEvents } : {}),
      };
    });
}

export function migrateLineagePersistedState(
  persistedState: unknown,
  version: number
): Partial<LineageState> {
  const state = (persistedState as Partial<LineageState>) || {};
  let nextState: Partial<LineageState> = { ...state };

  if (version < 3) {
    nextState.selectedPersonIdByChart = {};
  }

  if (version < 4) {
    if (nextState.treesByProject) {
      const nextTrees: Record<string, TreeItem[]> = {};
      for (const [projId, tree] of Object.entries(nextState.treesByProject)) {
        nextTrees[projId] = Array.isArray(tree) ? migrateTreeNodesRegion(tree) : [];
      }
      nextState.treesByProject = nextTrees;
    }

    if (nextState.personsByChart) {
      const nextPersonsByChart: Record<string, PersonRecord[]> = {};
      for (const [key, list] of Object.entries(nextState.personsByChart)) {
        nextPersonsByChart[key] = Array.isArray(list)
          ? migrateChartPersonsV4(list)
          : [];
      }
      nextState.personsByChart = nextPersonsByChart;
    }
  }

  if (version < 5 && nextState.personsByChart) {
    const nextPersonsByChart: Record<string, PersonRecord[]> = {};
    for (const [key, list] of Object.entries(nextState.personsByChart)) {
      nextPersonsByChart[key] = Array.isArray(list)
        ? migrateChartPersonsV5(list)
        : [];
    }
    nextState.personsByChart = nextPersonsByChart;
  }

  return nextState;
}

export const useLineageStore = create<LineageState>()(
  persist(
    (set, get) => ({
      treesByProject: {},
      selectedNodeIdByProject: {},
      personsByChart: {},
      selectedPersonIdByChart: {},
      viewModeByProject: {},

      setTree: (projectId, nextItems) =>
        set((state) => {
          const prevItems =
            state.treesByProject[projectId] || cloneDefaultTree();
          const merged = preserveCollapsedChildren(prevItems, nextItems);
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: merged,
            },
          };
        }),

      initializeProjectLineage: (
        projectId,
        { familyName, ancestor, surname, region }
      ) =>
        set((state) => {
          if (state.treesByProject[projectId]?.length) {
            return state;
          }
          const cleanFamily = familyName.trim() || '家族';
          const cleanAncestor = ancestor.trim() || '始迁祖';
          const cleanSurname = surname?.trim() || undefined;
          const cleanRegion = parsePlaceText(region) ?? undefined;
          const chartId = `lineage-chart-${Date.now()}`;
          const chartName = `${cleanFamily}总世系`;
          const key = makeChartStorageKey(projectId, chartId);

          const rootTree: TreeItem[] = [
            {
              id: chartId,
              type: 'chart',
              data: {
                name: chartName,
                ...(cleanSurname ? { surname: cleanSurname } : {}),
                progenitor: cleanAncestor,
                ...(cleanRegion ? { region: cleanRegion } : {}),
              },
              children: [],
            },
          ];

          const rootPerson: PersonRecord = {
            id: `${chartId}-root-1`,
            branchId: chartId,
            surname: cleanSurname,
            name: cleanAncestor,
            generation: 1,
            gender: 'male',
            relationTitle: '始迁祖',
            status: 'deceased',
            fatherId: null,
            biography: `「${cleanFamily}」始迁祖，可点击节点上方或右侧档案面板继续添录配偶、子嗣与生平传记。`,
            sequenceMeta: { originalPage: 1 },
            biographyOrder: 1,
          };

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: rootTree,
            },
            selectedNodeIdByProject: {
              ...state.selectedNodeIdByProject,
              [projectId]: chartId,
            },
            personsByChart: {
              ...state.personsByChart,
              [key]: [rootPerson],
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: null,
            },
          };
        }),

      selectNode: (projectId, nodeId) =>
        set((state) => ({
          selectedNodeIdByProject: {
            ...state.selectedNodeIdByProject,
            [projectId]: nodeId,
          },
        })),

      addGroup: (projectId, name) => {
        const id = `lineage-group-${Date.now()}`;
        const current = get().treesByProject[projectId] || cloneDefaultTree();
        const newGroup: TreeItem = {
          id,
          type: 'folder',
          collapsed: false,
          data: { name: name?.trim() || '新建世系分组' },
          children: [],
        };
        set((state) => ({
          treesByProject: {
            ...state.treesByProject,
            [projectId]: [...current, newGroup],
          },
          selectedNodeIdByProject: {
            ...state.selectedNodeIdByProject,
            [projectId]: id,
          },
        }));
        return id;
      },

      addChart: (projectId, parentId, input) => {
        const id = `lineage-chart-${Date.now()}`;
        const meta: LineageChartMeta =
          typeof input === 'string'
            ? { name: input }
            : input || { name: '新建世系图' };
        const chartName = meta.name?.trim() || '新建世系图';
        const cleanSurname = meta.surname?.trim() || undefined;
        const cleanHall = meta.hallName?.trim() || undefined;
        const cleanProgenitor = meta.progenitor?.trim() || undefined;
        const cleanRegion = parsePlaceText(meta.region) ?? undefined;

        const current = get().treesByProject[projectId] || cloneDefaultTree();
        const newChart: TreeItem = {
          id,
          type: 'chart',
          data: {
            name: chartName,
            ...(cleanSurname ? { surname: cleanSurname } : {}),
            ...(cleanHall ? { hallName: cleanHall } : {}),
            ...(cleanProgenitor ? { progenitor: cleanProgenitor } : {}),
            ...(cleanRegion ? { region: cleanRegion } : {}),
          },
          children: [],
        };

        let nextTree: TreeItem[];
        if (parentId) {
          const insertIntoParent = (items: TreeItem[]): TreeItem[] =>
            items.map((item) => {
              if (item.id === parentId) {
                return {
                  ...item,
                  collapsed: false,
                  children: [...(item.children || []), newChart],
                };
              }
              if (item.children?.length) {
                return { ...item, children: insertIntoParent(item.children) };
              }
              return item;
            });
          nextTree = insertIntoParent(current);
        } else {
          nextTree = [...current, newChart];
        }

        const key = makeChartStorageKey(projectId, id);
        const seed = createSeedPersonsForChart(
          id,
          chartName,
          cleanSurname,
          cleanProgenitor
        );

        set((state) => ({
          treesByProject: {
            ...state.treesByProject,
            [projectId]: nextTree,
          },
          selectedNodeIdByProject: {
            ...state.selectedNodeIdByProject,
            [projectId]: id,
          },
          personsByChart: {
            ...state.personsByChart,
            [key]: seed,
          },
          selectedPersonIdByChart: {
            ...state.selectedPersonIdByChart,
            [key]: null,
          },
        }));
        return id;
      },

      updateChartMeta: (projectId, chartId, meta) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || cloneDefaultTree();
          const prevNode = findItemDeep(current, chartId);
          const cleanName = meta.name.trim() || prevNode?.data?.name || '世系图';
          const cleanSurname = meta.surname?.trim() || '';
          const cleanHall = meta.hallName?.trim() || '';
          const cleanProgenitor = meta.progenitor?.trim() || '';
          const cleanRegion = parsePlaceText(meta.region) ?? undefined;

          const updatedTree = setProperty(
            structuredClone(current),
            chartId,
            'data',
            (data) => ({
              ...data,
              name: cleanName,
              surname: cleanSurname || undefined,
              hallName: cleanHall || undefined,
              progenitor: cleanProgenitor || undefined,
              region: cleanRegion,
            })
          );

          const key = makeChartStorageKey(projectId, chartId);
          const existingPersons = state.personsByChart[key];
          let nextPersonsByChart = state.personsByChart;

          if (existingPersons && existingPersons.length > 0) {
            const prevProgenitor = prevNode?.data?.progenitor?.trim();
            const rootId = `${chartId}-root-1`;
            const hasExplicitRoot = existingPersons.some((p) => p.id === rootId);
            const firstGenRoots = existingPersons.filter(
              (p) => p.generation === 1 && !p.fatherId && !p.spouseOfId
            );
            const targetRootId = hasExplicitRoot
              ? rootId
              : firstGenRoots.length === 1
                ? firstGenRoots[0].id
                : null;

            const updatedPersons = existingPersons.map((p) => {
              const isRootTarget =
                targetRootId !== null && p.id === targetRootId;
              const shouldUpdateName =
                isRootTarget &&
                cleanProgenitor &&
                (p.name !== cleanProgenitor || prevProgenitor === p.name);

              return {
                ...p,
                ...(isRootTarget && shouldUpdateName
                  ? { name: cleanProgenitor }
                  : {}),
                ...(isRootTarget && cleanSurname
                  ? { surname: cleanSurname }
                  : {}),
              };
            });

            nextPersonsByChart = {
              ...state.personsByChart,
              [key]: updatedPersons,
            };
          }

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: updatedTree,
            },
            personsByChart: nextPersonsByChart,
          };
        }),

      renameNode: (projectId, id, name) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || cloneDefaultTree();
          const trimmed = name.trim();
          if (!trimmed) return state;
          const updated = setProperty(
            structuredClone(current),
            id,
            'data',
            (data) => ({ ...data, name: trimmed })
          );
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: updated,
            },
          };
        }),

      duplicateNode: (projectId, id) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || cloneDefaultTree();
          const suffix = String(Date.now()).slice(-4);
          const nextPersonsByChart = { ...state.personsByChart };

          const insertCopy = (items: TreeItem[]): TreeItem[] => {
            const result: TreeItem[] = [];
            for (const item of items) {
              if (item.id === id) {
                result.push(item);
                const cloned = cloneSubtreeWithNewIds(item, suffix);
                result.push(cloned);
                if (item.type === 'chart') {
                  const srcKey = makeChartStorageKey(projectId, String(item.id));
                  const dstKey = makeChartStorageKey(projectId, String(cloned.id));
                  const srcPersons =
                    state.personsByChart[srcKey] ||
                    createSeedPersonsForChart(String(item.id), item.data?.name);
                  nextPersonsByChart[dstKey] = structuredClone(srcPersons);
                }
              } else if (item.children?.length) {
                result.push({
                  ...item,
                  children: insertCopy(item.children),
                });
              } else {
                result.push(item);
              }
            }
            return result;
          };

          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: insertCopy(current),
            },
            personsByChart: nextPersonsByChart,
          };
        }),

      removeNode: (projectId, id) =>
        set((state) => {
          const current =
            state.treesByProject[projectId] || cloneDefaultTree();
          const nextTree = removeItem(structuredClone(current), id);
          const currentSelected = state.selectedNodeIdByProject[projectId];
          const nextSelected =
            currentSelected === id
              ? findFirstChartId(nextTree) || String(nextTree[0]?.id || '')
              : currentSelected;
          const nextPersons = { ...state.personsByChart };
          delete nextPersons[makeChartStorageKey(projectId, id)];
          return {
            treesByProject: {
              ...state.treesByProject,
              [projectId]: nextTree,
            },
            selectedNodeIdByProject: {
              ...state.selectedNodeIdByProject,
              [projectId]: nextSelected,
            },
            personsByChart: nextPersons,
          };
        }),

      setViewMode: (projectId, mode) =>
        set((state) => ({
          viewModeByProject: {
            ...state.viewModeByProject,
            [projectId]: mode,
          },
        })),

      selectPerson: (projectId, chartId, personId) =>
        set((state) => ({
          selectedPersonIdByChart: {
            ...state.selectedPersonIdByChart,
            [makeChartStorageKey(projectId, chartId)]: personId,
          },
        })),

      addPerson: (projectId, chartId, person, chartName, surname, options) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);

          const nextPersons = [...currentPersons, person];
          const shouldSelect = options?.select !== false;

          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: nextPersons,
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: shouldSelect ? person.id : null,
            },
          };
        }),

      addPersonsBatch: (projectId, chartId, personsToAdd, chartName, surname, options) =>
        set((state) => {
          if (personsToAdd.length === 0) return state;
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);

          const nextPersons = [...currentPersons, ...personsToAdd];
          const resolvedSelectId =
            options && 'selectId' in options
              ? options.selectId ?? null
              : personsToAdd[personsToAdd.length - 1]?.id ?? null;

          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: nextPersons,
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: resolvedSelectId,
            },
          };
        }),

      updatePerson: (projectId, chartId, personId, updates, chartName, surname) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);

          let updatedList = currentPersons.map((p) =>
            p.id === personId ? { ...p, ...updates } : p
          );
          const target = updatedList.find((p) => p.id === personId);

          // When updating a spouse's sequence order, normalize all spouses of the same partner into 1..N
          if (target?.spouseOfId && updates.siblingOrder !== undefined) {
            const partnerId = target.spouseOfId;
            const otherSpouses = updatedList
              .filter((p) => p.spouseOfId === partnerId && p.id !== target.id)
              .sort((a, b) => {
                const orderA = a.siblingOrder ?? a.biographyOrder ?? 50;
                const orderB = b.siblingOrder ?? b.biographyOrder ?? 50;
                return orderA - orderB;
              });
            const desiredIdx = Math.max(
              0,
              Math.min(
                otherSpouses.length,
                Math.round(Number(updates.siblingOrder) || 1) - 1
              )
            );
            const orderedSpouses = [...otherSpouses];
            orderedSpouses.splice(desiredIdx, 0, target);
            const spouseOrderMap = new Map<string, number>();
            orderedSpouses.forEach((sp, idx) => {
              spouseOrderMap.set(sp.id, idx + 1);
            });
            updatedList = updatedList.map((p) => {
              const newOrder = spouseOrderMap.get(p.id);
              return newOrder !== undefined ? { ...p, siblingOrder: newOrder } : p;
            });
          }

          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: updatedList,
            },
          };
        }),

      deletePerson: (projectId, chartId, personId, chartName, surname) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);
          const toDelete = collectDescendantIds(currentPersons, personId);
          const remaining = currentPersons
            .filter((p) => !toDelete.has(p.id))
            .map((p) => {
              if (!p.motherId || !toDelete.has(p.motherId)) {
                return p;
              }
              return {
                ...p,
                motherId: undefined,
              };
            });
          const currentSel = state.selectedPersonIdByChart[key];
          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: remaining,
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: currentSel && toDelete.has(currentSel) ? null : currentSel,
            },
          };
        }),

      reorderSibling: (
        projectId,
        chartId,
        parentId,
        childId,
        direction,
        chartName,
        surname
      ) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);

          const siblings = currentPersons
            .filter((p) => p.fatherId === parentId && !p.spouseOfId)
            .sort((a, b) => {
              const orderA = a.siblingOrder ?? a.biographyOrder ?? 50;
              const orderB = b.siblingOrder ?? b.biographyOrder ?? 50;
              return orderA - orderB;
            });

          const idx = siblings.findIndex((s) => s.id === childId);
          if (idx < 0) return state;
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= siblings.length) return state;

          const reordered = [...siblings];
          const [moved] = reordered.splice(idx, 1);
          reordered.splice(targetIdx, 0, moved);

          const orderMap = new Map<string, number>();
          reordered.forEach((sib, index) => {
            orderMap.set(sib.id, index + 1);
          });

          const nextPersons = currentPersons.map((p) => {
            const newOrder = orderMap.get(p.id);
            if (newOrder === undefined) return p;
            return {
              ...p,
              siblingOrder: newOrder,
              biographyOrder: newOrder,
            };
          });

          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: nextPersons,
            },
          };
        }),

      addParentForPerson: (
        projectId,
        chartId,
        childId,
        parentPerson,
        chartName,
        surname,
        options
      ) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);

          const child = currentPersons.find((p) => p.id === childId);
          if (!child || child.spouseOfId) return state;

          const needShiftDown = (child.generation || 1) <= 1;
          const subtreeIds = needShiftDown
            ? collectDescendantIds(currentPersons, childId)
            : new Set<string>();

          const resolvedParent: PersonRecord = {
            ...parentPerson,
            generation: needShiftDown ? 1 : Math.max(1, (child.generation || 2) - 1),
            fatherId: null,
          };

          const updatedPersons = currentPersons.map((p) => {
            const genBump = needShiftDown && subtreeIds.has(p.id) ? 1 : 0;
            if (p.id === childId) {
              return {
                ...p,
                generation: (p.generation || 1) + genBump,
                fatherId: resolvedParent.id,
                relationTitle:
                  p.relationTitle === '始迁祖' ? undefined : p.relationTitle,
              };
            }
            if (genBump > 0) {
              return {
                ...p,
                generation: (p.generation || 1) + genBump,
              };
            }
            return p;
          });

          const nextPersons = [resolvedParent, ...updatedPersons];
          const shouldSelect = options?.select !== false;

          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: nextPersons,
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: shouldSelect ? resolvedParent.id : null,
            },
          };
        }),

      removePersonOnly: (projectId, chartId, personId, chartName, surname) =>
        set((state) => {
          const key = makeChartStorageKey(projectId, chartId);
          const currentPersons =
            state.personsByChart[key] ||
            createSeedPersonsForChart(chartId, chartName, surname);

          const target = currentPersons.find((p) => p.id === personId);
          if (!target) return state;

          const directChildren = currentPersons.filter(
            (p) => p.fatherId === personId && !p.spouseOfId
          );
          const remaining = currentPersons.filter((p) => p.id !== personId);
          const hasOtherGen1 = remaining.some(
            (p) => (p.generation || 1) <= 1 && !p.spouseOfId
          );
          const shouldShiftBack =
            (target.generation || 1) === 1 &&
            directChildren.length > 0 &&
            !hasOtherGen1;

          const shiftIds = new Set<string>();
          if (shouldShiftBack) {
            directChildren.forEach((c) => {
              collectDescendantIds(remaining, c.id).forEach((id) =>
                shiftIds.add(id)
              );
            });
          }

          const cleaned = remaining.map((p) => {
            const isChild = p.fatherId === personId;
            const shiftUp = shouldShiftBack && shiftIds.has(p.id) ? -1 : 0;
            const hasDeletedMother = p.motherId === personId;
            if (!isChild && shiftUp === 0 && !hasDeletedMother) {
              return p;
            }
            return {
              ...p,
              ...(isChild ? { fatherId: null } : {}),
              ...(shiftUp !== 0
                ? { generation: Math.max(1, (p.generation || 2) + shiftUp) }
                : {}),
              ...(hasDeletedMother ? { motherId: undefined } : {}),
            };
          });

          const currentSel = state.selectedPersonIdByChart[key];
          return {
            personsByChart: {
              ...state.personsByChart,
              [key]: cleaned,
            },
            selectedPersonIdByChart: {
              ...state.selectedPersonIdByChart,
              [key]: currentSel === personId ? null : currentSel,
            },
          };
        }),
    }),
    {
      name: 'nocoapp:lineage',
      version: 5,
      storage: createAppStorage(),
      partialize: (state) => ({
        treesByProject: state.treesByProject,
        selectedNodeIdByProject: state.selectedNodeIdByProject,
        personsByChart: state.personsByChart,
        viewModeByProject: state.viewModeByProject,
      }),
      migrate: (persistedState: unknown, version: number) =>
        migrateLineagePersistedState(persistedState, version),
    }
  )
);
