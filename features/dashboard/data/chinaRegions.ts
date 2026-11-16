import { regionData } from 'element-china-area-data';

export interface ChinaDistrictOption {
  code: string;
  name: string;
}

export interface ChinaCityOption {
  code: string;
  name: string;
  districts: ChinaDistrictOption[];
}

export interface ChinaProvinceOption {
  code: string;
  name: string;
  cities: ChinaCityOption[];
}

export const CHINA_PROVINCE_LIST: ChinaProvinceOption[] = regionData.map(
  (prov) => ({
    code: prov.value,
    name: prov.label,
    cities: (prov.children ?? []).map((city) => ({
      code: city.value,
      name: city.label,
      districts: (city.children ?? []).map((dist) => ({
        code: dist.value,
        name: dist.label,
      })),
    })),
  })
);

function normalizeMatch(a: string, b: string): boolean {
  const clean = (s: string) =>
    s.replace(/(省|市|自治区|维吾尔自治区|壮族自治区|回族自治区|特别行政区|地区|盟|州|县|区)$/g, '');
  return a === b || clean(a) === clean(b);
}

export function parseChinaRegion(value?: string | null): {
  province: string;
  city: string;
  district: string;
} {
  if (!value || !value.trim()) {
    return { province: '', city: '', district: '' };
  }
  const rawParts = value
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  // Strip optional leading "中国" from legacy paths
  const parts = rawParts[0] === '中国' ? rawParts.slice(1) : rawParts;
  if (parts.length === 0) {
    return { province: '', city: '', district: '' };
  }

  const provMatch = CHINA_PROVINCE_LIST.find((p) =>
    normalizeMatch(p.name, parts[0])
  );
  if (!provMatch) {
    return { province: '', city: '', district: '' };
  }

  let cityName = '';
  let districtName = '';

  if (parts.length >= 2) {
    const directCity = provMatch.cities.find((c) =>
      normalizeMatch(c.name, parts[1])
    );
    if (directCity) {
      cityName = directCity.name;
      if (parts.length >= 3) {
        const distMatch = directCity.districts.find((d) =>
          normalizeMatch(d.name, parts[2])
        );
        districtName = distMatch?.name ?? '';
      }
    } else if (provMatch.cities.length === 1) {
      // Handle 2-segment municipality path like "北京市/东城区"
      const soleCity = provMatch.cities[0];
      const distMatch = soleCity.districts.find((d) =>
        normalizeMatch(d.name, parts[1])
      );
      if (distMatch) {
        cityName = soleCity.name;
        districtName = distMatch.name;
      }
    }
  }

  return {
    province: provMatch.name,
    city: cityName,
    district: districtName,
  };
}

export function formatChinaRegion(
  province: string,
  city: string,
  district: string
): string {
  return [province, city, district]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('/');
}
