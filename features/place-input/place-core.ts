import { regionData } from 'element-china-area-data';
import type { PersonRecord } from '../lineage/types';
import type {
  ClanPlaceStat,
  GenealogyPlace,
  PlaceSuggestionItem,
} from './place.types';

export const MAX_PLACE_TEXT_LENGTH = 150;

export interface PlaceRegionDistrict {
  code: string;
  name: string;
}

export interface PlaceRegionCity {
  code: string;
  name: string;
  isInternalHolder?: boolean;
  districts: PlaceRegionDistrict[];
}

export interface PlaceRegionProvince {
  code: string;
  name: string;
  cities: PlaceRegionCity[];
}

export interface PlaceRegionCountry {
  code: string;
  name: string;
  provinces: PlaceRegionProvince[];
}

const INTERNAL_CITY_HOLDERS = new Set([
  '市辖区',
  '省直辖县级行政区划',
  '自治区直辖县级行政区划',
  '县',
]);

export function isPlaceholderCityName(name?: string | null): boolean {
  if (!name) return false;
  return INTERNAL_CITY_HOLDERS.has(name.trim());
}

const SPECIAL_CHINA_PROVINCES: PlaceRegionProvince[] = [
  {
    code: '710000',
    name: '台湾省',
    cities: [
      { code: 'tw-tpe', name: '台北市', districts: [] },
      { code: 'tw-ntp', name: '新北市', districts: [] },
      { code: 'tw-tyn', name: '桃园市', districts: [] },
      { code: 'tw-txg', name: '台中市', districts: [] },
      { code: 'tw-tnn', name: '台南市', districts: [] },
      { code: 'tw-khh', name: '高雄市', districts: [] },
      { code: 'tw-kin', name: '金门县', districts: [] },
    ],
  },
  {
    code: '810000',
    name: '香港特别行政区',
    cities: [
      {
        code: 'hk-sar',
        name: '市辖区',
        isInternalHolder: true,
        districts: [
          { code: 'hk-1', name: '中西区' },
          { code: 'hk-2', name: '湾仔区' },
          { code: 'hk-3', name: '东区' },
          { code: 'hk-4', name: '南区' },
          { code: 'hk-5', name: '油尖旺区' },
          { code: 'hk-6', name: '深水埗区' },
          { code: 'hk-7', name: '九龙城区' },
          { code: 'hk-8', name: '黄大仙区' },
          { code: 'hk-9', name: '观塘区' },
          { code: 'hk-10', name: '沙田区' },
          { code: 'hk-11', name: '元朗区' },
        ],
      },
    ],
  },
  {
    code: '820000',
    name: '澳门特别行政区',
    cities: [
      {
        code: 'mo-sar',
        name: '市辖区',
        isInternalHolder: true,
        districts: [
          { code: 'mo-1', name: '花地玛堂区' },
          { code: 'mo-2', name: '圣安多尼堂区' },
          { code: 'mo-3', name: '大堂区' },
          { code: 'mo-4', name: '望德堂区' },
          { code: 'mo-5', name: '风顺堂区' },
          { code: 'mo-6', name: '嘉模堂区' },
          { code: 'mo-7', name: '圣方济各堂区' },
        ],
      },
    ],
  },
];

let cachedCountries: PlaceRegionCountry[] | null = null;

export function getAllPlaceCountries(): PlaceRegionCountry[] {
  if (cachedCountries) return cachedCountries;

  const mainlandProvinces: PlaceRegionProvince[] = regionData.map((prov) => ({
    code: prov.value,
    name: prov.label,
    cities: (prov.children ?? []).map((city) => ({
      code: city.value,
      name: city.label,
      isInternalHolder: INTERNAL_CITY_HOLDERS.has(city.label),
      districts: (city.children ?? []).map((dist) => ({
        code: dist.value,
        name: dist.label,
      })),
    })),
  }));

  const china: PlaceRegionCountry = {
    code: 'CN',
    name: '中国',
    provinces: [...mainlandProvinces, ...SPECIAL_CHINA_PROVINCES],
  };

  cachedCountries = [china];
  return cachedCountries;
}

export function getChinaProvinces(): PlaceRegionProvince[] {
  return getAllPlaceCountries()[0]?.provinces ?? [];
}

const TRADITIONAL_TO_SIMPLIFIED_MAP: Record<string, string> = {
  國: '国',
  貴: '贵',
  陽: '阳',
  陰: '阴',
  觀: '观',
  區: '区',
  縣: '县',
  廣: '广',
  東: '东',
  漢: '汉',
  蘇: '苏',
  陝: '陕',
  蘭: '兰',
  瀋: '沈',
  龍: '龙',
  慶: '庆',
  寧: '宁',
  灣: '湾',
  門: '门',
  臺: '台',
  華: '华',
  豐: '丰',
  興: '兴',
  順: '顺',
  義: '义',
  樂: '乐',
  長: '长',
  馬: '马',
  鳳: '凤',
  嶺: '岭',
  崗: '岗',
  鎮: '镇',
  鄉: '乡',
  萬: '万',
  雲: '云',
  溫: '温',
  寶: '宝',
  開: '开',
  關: '关',
  廬: '庐',
  贛: '赣',
  閩: '闽',
  粵: '粤',
  魯: '鲁',
  晉: '晋',
  瓊: '琼',
  蒙: '蒙',
  滬: '沪',
  遼: '辽',
  齊: '齐',
  爾: '尔',
  濱: '滨',
  烏: '乌',
  澳: '澳',
  鄭: '郑',
  許: '许',
  荊: '荆',
  黃: '黄',
  嶽: '岳',
  懷: '怀',
  無: '无',
  錫: '锡',
  鹽: '盐',
  揚: '扬',
  蕪: '芜',
  銅: '铜',
  廈: '厦',
  撫: '抚',
  饒: '饶',
  青: '青',
  煙: '烟',
  濰: '潍',
  濟: '济',
  臨: '临',
  莊: '庄',
  運: '运',
  呂: '吕',
  內: '内',
  頭: '头',
  連: '连',
  營: '营',
  盤: '盘',
  雞: '鸡',
  鶴: '鹤',
  雙: '双',
  鴨: '鸭',
  達: '达',
  綿: '绵',
  瀘: '泸',
  資: '资',
  涼: '凉',
  壩: '坝',
  舊: '旧',
  磯: '矶',
  紐: '纽',
  約: '约',
  倫: '伦',
  亞: '亚',
  羅: '罗',
  來: '来',
  檳: '槟',
  法: '法',
  德: '德',
  韓: '韩',
  賓: '宾',
  畢: '毕',
  節: '节',
  麗: '丽',
  薩: '萨',
  銀: '银',
  張: '张',
  紹: '绍',
  鄧: '邓',
  鞏: '巩',
  鄒: '邹',
  榮: '荣',
  壽: '寿',
  膠: '胶',
  棗: '枣',
  瀏: '浏',
  欽: '钦',
  靈: '灵',
  蒼: '苍',
  紅: '红',
  則: '则',
  歸: '归',
  彥: '彦',
  衛: '卫',
  吳: '吴',
  諸: '诸',
  萊: '莱',
};

export function toSimplifiedPlaceText(raw: string): string {
  let out = '';
  for (const ch of raw) {
    out += TRADITIONAL_TO_SIMPLIFIED_MAP[ch] ?? ch;
  }
  return out;
}

export function normalizePlaceSearchText(raw: string): string {
  return toSimplifiedPlaceText(raw)
    .toLowerCase()
    .replace(/[，,、/·\s\-()（）]/g, '')
    .trim();
}

export function stripAdminSuffix(name: string): string {
  return name
    .replace(
      /(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|布依族苗族自治州|苗族侗族自治州|藏族羌族自治州|彝族自治州|土家族苗族自治州|林区|地区|省|市|县|区|盟|旗)$/g,
      ''
    )
    .trim();
}

export interface FlattenedRegionEntry {
  country: string;
  province?: string;
  city?: string;
  district?: string;
  level: 1 | 2 | 3 | 4;
  fullLabel: string;
  hierarchyMeta: string;
  leafName: string;
  leafShort: string;
  normalizedFull: string;
  normalizedLeaf: string;
  normalizedLeafShort: string;
  normalizedSegments: string[];
}

let cachedRegionIndex: FlattenedRegionEntry[] | null = null;

export function getFlattenedRegionIndex(): FlattenedRegionEntry[] {
  if (cachedRegionIndex) return cachedRegionIndex;
  const provinces = getChinaProvinces();
  const entries: FlattenedRegionEntry[] = [];

  for (const prov of provinces) {
    const pFull = prov.name;
    const pShort = stripAdminSuffix(prov.name) || prov.name;
    entries.push({
      country: '中国',
      province: prov.name,
      level: 2,
      fullLabel: pFull,
      hierarchyMeta: '省级',
      leafName: prov.name,
      leafShort: pShort,
      normalizedFull: normalizePlaceSearchText(pFull),
      normalizedLeaf: normalizePlaceSearchText(prov.name),
      normalizedLeafShort: normalizePlaceSearchText(pShort),
      normalizedSegments: [
        normalizePlaceSearchText(prov.name),
        normalizePlaceSearchText(pShort),
      ],
    });

    for (const city of prov.cities) {
      const isHolder = Boolean(
        city.isInternalHolder || isPlaceholderCityName(city.name)
      );
      const storedCity = isHolder ? undefined : city.name;
      if (!isHolder) {
        const cityFull = `${prov.name}${city.name}`;
        const cityShort = stripAdminSuffix(city.name) || city.name;
        entries.push({
          country: '中国',
          province: prov.name,
          city: storedCity,
          level: 3,
          fullLabel: cityFull,
          hierarchyMeta: `${prov.name}`,
          leafName: city.name,
          leafShort: cityShort,
          normalizedFull: normalizePlaceSearchText(cityFull),
          normalizedLeaf: normalizePlaceSearchText(city.name),
          normalizedLeafShort: normalizePlaceSearchText(cityShort),
          normalizedSegments: [
            normalizePlaceSearchText(prov.name),
            normalizePlaceSearchText(pShort),
            normalizePlaceSearchText(city.name),
            normalizePlaceSearchText(cityShort),
          ],
        });
      }

      for (const dist of city.districts) {
        const distFull = storedCity
          ? `${prov.name}${storedCity}${dist.name}`
          : `${prov.name}${dist.name}`;
        const distShort = stripAdminSuffix(dist.name) || dist.name;
        entries.push({
          country: '中国',
          province: prov.name,
          city: storedCity,
          district: dist.name,
          level: 4,
          fullLabel: distFull,
          hierarchyMeta: storedCity ? `${prov.name} · ${storedCity}` : prov.name,
          leafName: dist.name,
          leafShort: distShort,
          normalizedFull: normalizePlaceSearchText(distFull),
          normalizedLeaf: normalizePlaceSearchText(dist.name),
          normalizedLeafShort: normalizePlaceSearchText(distShort),
          normalizedSegments: [
            normalizePlaceSearchText(prov.name),
            normalizePlaceSearchText(pShort),
            ...(storedCity
              ? [
                  normalizePlaceSearchText(storedCity),
                  normalizePlaceSearchText(
                    stripAdminSuffix(storedCity) || storedCity
                  ),
                ]
              : []),
            normalizePlaceSearchText(dist.name),
            normalizePlaceSearchText(distShort),
          ],
        });
      }
    }
  }

  cachedRegionIndex = entries;
  return entries;
}

export function formatGenealogyPlace(
  place: GenealogyPlace | null | undefined
): string {
  if (!place) return '';
  if (place.kind === 'phrase') {
    return place.originalText?.trim() || '';
  }

  const cityClean = isPlaceholderCityName(place.city) ? '' : place.city?.trim() || '';
  const countryClean =
    place.country?.trim() && place.country.trim() !== '中国'
      ? place.country.trim()
      : '';
  const adminParts = [
    countryClean,
    place.province?.trim() || '',
    cityClean,
    place.district?.trim() || '',
  ].filter(Boolean);

  const base = adminParts.join('');
  return base || place.originalText?.trim() || '';
}

export function cloneGenealogyPlace(place: GenealogyPlace): GenealogyPlace {
  return { ...place };
}

export function createEmptyStructuredPlace(): GenealogyPlace {
  return {
    schemaVersion: 1,
    kind: 'structured',
    province: '',
    city: '',
    district: '',
    originalText: null,
  };
}

export function finalizeGenealogyPlace(
  draft: GenealogyPlace
): GenealogyPlace | null {
  if (draft.kind === 'phrase') {
    const text = draft.originalText?.trim() || '';
    if (!text) return null;
    return {
      schemaVersion: 1,
      kind: 'phrase',
      originalText: text,
    };
  }

  const province = draft.province?.trim() || '';
  const city = isPlaceholderCityName(draft.city) ? '' : draft.city?.trim() || '';
  const district = draft.district?.trim() || '';
  const originalText = draft.originalText?.trim() || null;

  const hasMeaningfulRegion = Boolean(province || city || district);

  if (!hasMeaningfulRegion) {
    if (!originalText) return null;
    return {
      schemaVersion: 1,
      kind: 'phrase',
      originalText,
    };
  }

  return {
    schemaVersion: 1,
    kind: 'structured',
    province: province || undefined,
    city: city || undefined,
    district: district || undefined,
    originalText,
  };
}

export function extractClanPlaceStats(
  persons: PersonRecord[] = []
): ClanPlaceStat[] {
  const counts = new Map<
    string,
    { count: number; structuredPlace?: GenealogyPlace | null }
  >();

  const recordPlace = (
    label?: string,
    structured?: GenealogyPlace | null
  ) => {
    const clean = label?.trim();
    if (!clean) return;
    const prev = counts.get(clean);
    if (prev) {
      prev.count += 1;
      if (!prev.structuredPlace && structured) {
        prev.structuredPlace = structured;
      }
    } else {
      counts.set(clean, { count: 1, structuredPlace: structured });
    }
  };

  for (const p of persons) {
    recordPlace(p.birth?.place, p.birth?.structuredPlace);
    recordPlace(p.death?.place, p.death?.structuredPlace);
    recordPlace(
      p.death?.burialPlace || p.burialPlace,
      p.death?.structuredBurialPlace
    );
  }

  return Array.from(counts.entries())
    .map(([label, meta]) => ({
      label,
      count: meta.count,
      structuredPlace: meta.structuredPlace,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-Hans-CN'));
}

function scoreRegionMatch(
  entry: FlattenedRegionEntry,
  tokens: string[],
  joinedNorm: string
): number {
  if (!joinedNorm) return 0;

  if (entry.normalizedFull === joinedNorm) {
    return 1000 + entry.level * 10;
  }
  if (entry.normalizedLeaf === joinedNorm) {
    return 900 + entry.level * 10;
  }
  if (entry.normalizedLeafShort === joinedNorm) {
    return 860 + entry.level * 10;
  }

  if (tokens.length > 1) {
    const allTokensMatch = tokens.every((t) => entry.normalizedFull.includes(t));
    if (!allTokensMatch) return 0;
    const lastToken = tokens[tokens.length - 1];
    if (
      entry.normalizedLeaf === lastToken ||
      entry.normalizedLeafShort === lastToken
    ) {
      return 780 + entry.level * 10;
    }
    return 620 + entry.level * 5;
  }

  if (
    entry.normalizedLeaf.startsWith(joinedNorm) ||
    entry.normalizedLeafShort.startsWith(joinedNorm)
  ) {
    return 720 + entry.level * 10;
  }

  if (entry.normalizedFull.includes(joinedNorm)) {
    // Prefer direct province/city/district containment over incidental deep matches
    return 480 + entry.level * 5 - Math.abs(entry.normalizedFull.length - joinedNorm.length);
  }

  // Fuzzy ordered segment match like "江西泰和" -> "中国江西省吉安市泰和县"
  let cursor = 0;
  for (const ch of joinedNorm) {
    const foundAt = entry.normalizedFull.indexOf(ch, cursor);
    if (foundAt < 0) return 0;
    cursor = foundAt + 1;
  }
  // Require all characters to be compactly matched across segments (prevent loose gibberish)
  const matchedSegments = entry.normalizedSegments.filter((seg) =>
    seg.length >= 2 && joinedNorm.includes(seg)
  );
  if (matchedSegments.length >= 2) {
    return 680 + matchedSegments.length * 30 + entry.level * 5;
  }
  return 0;
}

export function matchRegionFromText(raw: string): GenealogyPlace | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Support slash-delimited or simplified/traditional full administrative paths
  const normJoined = normalizePlaceSearchText(trimmed);
  if (!normJoined) return null;
  const cleanNorm = normJoined.startsWith('中国')
    ? normJoined.slice(2)
    : normJoined;
  if (!cleanNorm) return null;

  const entries = getFlattenedRegionIndex();
  const exact = entries.find((e) => e.normalizedFull === cleanNorm);
  if (exact) {
    return {
      schemaVersion: 1,
      kind: 'structured',
      province: exact.province,
      city: exact.city,
      district: exact.district,
      originalText: null,
    };
  }

  return null;
}

export interface GeneratePlaceSuggestionsOptions {
  clanPlaces?: ClanPlaceStat[];
  maxResults?: number;
}

export function generatePlaceSuggestions(
  raw: string,
  options: GeneratePlaceSuggestionsOptions = {}
): PlaceSuggestionItem[] {
  const { clanPlaces = [], maxResults = 7 } = options;
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const rawTokens = trimmed
    .split(/[\s/,，、]+/)
    .map((t) => normalizePlaceSearchText(t))
    .filter(Boolean);
  const joinedNorm = normalizePlaceSearchText(trimmed);

  const suggestions: PlaceSuggestionItem[] = [];
  const seenLabels = new Set<string>();

  const pushItem = (item: Omit<PlaceSuggestionItem, 'id'>) => {
    if (seenLabels.has(item.primaryLabel)) return;
    seenLabels.add(item.primaryLabel);
    suggestions.push({
      id: `place-opt-${suggestions.length}`,
      ...item,
    });
  };

  // 1. Clan frequent places matching query
  if (clanPlaces.length > 0 && joinedNorm) {
    const matchedClan = clanPlaces
      .map((cp) => {
        const cpNorm = normalizePlaceSearchText(cp.label);
        const hit =
          rawTokens.length > 1
            ? rawTokens.every((t) => cpNorm.includes(t))
            : cpNorm.includes(joinedNorm);
        return { cp, cpNorm, hit };
      })
      .filter((x) => x.hit)
      .sort((a, b) => {
        const aExact = a.cpNorm === joinedNorm ? 1 : 0;
        const bExact = b.cpNorm === joinedNorm ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return b.cp.count - a.cp.count;
      })
      .slice(0, 3);

    for (const { cp } of matchedClan) {
      const value: GenealogyPlace = cp.structuredPlace
        ? cloneGenealogyPlace(cp.structuredPlace)
        : matchRegionFromText(cp.label) ?? {
            schemaVersion: 1,
            kind: 'phrase',
            originalText: cp.label,
          };
      pushItem({
        kind: 'clan',
        primaryLabel: cp.label,
        metaLabel: cp.count > 1 ? `本族常用 · 已用${cp.count}次` : '本族已录地点',
        value,
      });
    }
  }

  // 2. Multi-level administrative region search
  const entries = getFlattenedRegionIndex();
  const regionJoinedNorm =
    joinedNorm.startsWith('中国') && joinedNorm.length > 2
      ? joinedNorm.slice(2)
      : joinedNorm;
  const regionTokens =
    rawTokens[0] === '中国'
      ? rawTokens.slice(1)
      : rawTokens.length > 0 &&
          rawTokens[0].startsWith('中国') &&
          rawTokens[0].length > 2
        ? [rawTokens[0].slice(2), ...rawTokens.slice(1)]
        : rawTokens;

  if (regionJoinedNorm) {
    const scoredRegions: Array<{ entry: FlattenedRegionEntry; score: number }> = [];
    for (const entry of entries) {
      const score = scoreRegionMatch(entry, regionTokens, regionJoinedNorm);
      if (score > 0) {
        scoredRegions.push({ entry, score });
      }
    }
    scoredRegions.sort(
      (a, b) => b.score - a.score || a.entry.fullLabel.length - b.entry.fullLabel.length
    );

    for (const { entry } of scoredRegions) {
      if (suggestions.length >= maxResults) break;
      const value: GenealogyPlace = {
        schemaVersion: 1,
        kind: 'structured',
        province: entry.province,
        city: entry.city,
        district: entry.district,
        originalText: null,
      };
      pushItem({
        kind: 'region',
        primaryLabel: entry.fullLabel,
        metaLabel: `标准区划 · ${entry.hierarchyMeta}`,
        value,
      });
    }
  }

  // 4. Original phrase fallback (always available at bottom)
  if (trimmed.length <= MAX_PLACE_TEXT_LENGTH) {
    const phrasePlace: GenealogyPlace = {
      schemaVersion: 1,
      kind: 'phrase',
      originalText: trimmed,
    };
    pushItem({
      kind: 'phrase',
      primaryLabel: trimmed,
      metaLabel:
        suggestions.length === 0 ? '原始记载 · 仅原文保存' : '按原始文本保存 · 不作标准化',
      value: phrasePlace,
    });
  }

  return suggestions;
}

export function isLosslessPlaceCarry(
  rawQuery: string,
  candidate: PlaceSuggestionItem
): boolean {
  const rawNorm = normalizePlaceSearchText(rawQuery);
  const qNorm =
    rawNorm.startsWith('中国') && rawNorm.length > 2 ? rawNorm.slice(2) : rawNorm;
  if (!qNorm) return true;
  const candNorm = normalizePlaceSearchText(candidate.primaryLabel);
  if (candNorm.includes(qNorm)) return true;

  const rawTokens = rawQuery
    .split(/[\s/,，、]+/)
    .map((t) => normalizePlaceSearchText(t))
    .filter(Boolean);
  const tokens =
    rawTokens[0] === '中国'
      ? rawTokens.slice(1)
      : rawTokens.length > 0 &&
          rawTokens[0].startsWith('中国') &&
          rawTokens[0].length > 2
        ? [rawTokens[0].slice(2), ...rawTokens.slice(1)]
        : rawTokens;
  return tokens.length > 0 && tokens.every((t) => candNorm.includes(t));
}
