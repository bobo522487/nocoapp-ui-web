import { TreeItem } from '../../../components/common/Tree/types';
import { PersonRecord, SpouseInfo } from '../types';

export interface ChartEntry {
  chartId: string;
  chartName: string;
  index: number;
}

export interface LineageStatsSummary {
  chartCount: number;
  totalPersons: number;
  maleCount: number;
  femaleCount: number;
  livingCount: number;
  deceasedCount: number;

  maleLiving: number;
  maleDeceased: number;
  maleLivingMarried: number;
  maleLivingUnmarried: number;

  femaleLiving: number;
  femaleDeceased: number;
  femaleLivingMarried: number;
  femaleLivingUnmarried: number;

  daughterInLawCount: number;
  daughterInLawLiving: number;
  daughterInLawDeceased: number;

  sonInLawCount: number;
  sonInLawLiving: number;
  sonInLawDeceased: number;
}

export function flattenChartsInTree(items: TreeItem[]): ChartEntry[] {
  const result: ChartEntry[] = [];
  const walk = (nodes: TreeItem[]) => {
    for (const node of nodes) {
      if (node.type === 'chart') {
        result.push({
          chartId: String(node.id),
          chartName: node.data?.name || String(node.id),
          index: result.length + 1,
        });
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(items);
  return result;
}

function isSpouseDeceased(spouse: SpouseInfo): boolean {
  if (spouse.deathDate && spouse.deathDate.trim().length > 0) return true;
  if (spouse.burialPlace && spouse.burialPlace.trim().length > 0) return true;
  return false;
}

export function computeLineageStats(
  persons: PersonRecord[],
  chartCount = 1
): LineageStatsSummary {
  let maleCount = 0;
  let femaleCount = 0;
  let livingCount = 0;
  let deceasedCount = 0;

  let maleLiving = 0;
  let maleDeceased = 0;
  let maleLivingMarried = 0;
  let maleLivingUnmarried = 0;

  let femaleLiving = 0;
  let femaleDeceased = 0;
  let femaleLivingMarried = 0;
  let femaleLivingUnmarried = 0;

  let daughterInLawCount = 0;
  let daughterInLawLiving = 0;
  let daughterInLawDeceased = 0;

  let sonInLawCount = 0;
  let sonInLawLiving = 0;
  let sonInLawDeceased = 0;

  for (const person of persons) {
    const isLiving = person.status === 'living';
    const spouses = Array.isArray(person.spouses) ? person.spouses : [];
    const hasSpouse = spouses.some((s) => s.name && s.name.trim().length > 0) || spouses.length > 0;

    if (isLiving) {
      livingCount += 1;
    } else {
      deceasedCount += 1;
    }

    if (person.gender === 'female') {
      femaleCount += 1;
      if (isLiving) {
        femaleLiving += 1;
        if (hasSpouse) femaleLivingMarried += 1;
        else femaleLivingUnmarried += 1;
      } else {
        femaleDeceased += 1;
      }

      for (const spouse of spouses) {
        sonInLawCount += 1;
        if (isSpouseDeceased(spouse)) {
          sonInLawDeceased += 1;
        } else {
          sonInLawLiving += 1;
        }
      }
    } else {
      maleCount += 1;
      if (isLiving) {
        maleLiving += 1;
        if (hasSpouse) maleLivingMarried += 1;
        else maleLivingUnmarried += 1;
      } else {
        maleDeceased += 1;
      }

      for (const spouse of spouses) {
        daughterInLawCount += 1;
        if (isSpouseDeceased(spouse)) {
          daughterInLawDeceased += 1;
        } else {
          daughterInLawLiving += 1;
        }
      }
    }
  }

  return {
    chartCount,
    totalPersons: persons.length,
    maleCount,
    femaleCount,
    livingCount,
    deceasedCount,
    maleLiving,
    maleDeceased,
    maleLivingMarried,
    maleLivingUnmarried,
    femaleLiving,
    femaleDeceased,
    femaleLivingMarried,
    femaleLivingUnmarried,
    daughterInLawCount,
    daughterInLawLiving,
    daughterInLawDeceased,
    sonInLawCount,
    sonInLawLiving,
    sonInLawDeceased,
  };
}

export function formatStatPct(part: number, total: number, digits: 0 | 2 = 2): string {
  if (!total || total <= 0) {
    return digits === 0 ? '0%' : '0.00%';
  }
  const pct = (part / total) * 100;
  if (digits === 0) {
    return `${Math.round(pct)}%`;
  }
  return `${pct.toFixed(2)}%`;
}
