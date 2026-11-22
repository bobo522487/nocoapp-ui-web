import type { PersonRecord } from '../lineage/types';
import {
  formatGenealogyPlace,
  getAllPlaceCountries,
  isPlaceholderCityName,
  matchRegionFromText,
  normalizePlaceSearchText,
  stripAdminSuffix,
} from './place-core';
import type { GenealogyPlace } from './place.types';

export type PersonPlaceField = 'birth' | 'death' | 'burial';

function matchAdminSegment(candidateName: string, inputSeg: string): boolean {
  const normCand = normalizePlaceSearchText(candidateName);
  const normInput = normalizePlaceSearchText(inputSeg);
  if (!normCand || !normInput) return false;
  if (normCand === normInput) return true;
  const candShort = normalizePlaceSearchText(stripAdminSuffix(candidateName));
  const inputShort = normalizePlaceSearchText(stripAdminSuffix(inputSeg));
  return Boolean(candShort && inputShort && candShort === inputShort);
}

export function parsePlaceText(
  raw: string | null | undefined
): GenealogyPlace | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const directMatch = matchRegionFromText(trimmed);
  if (directMatch) {
    return directMatch;
  }

  if (trimmed.includes('/')) {
    const segments = trimmed
      .split('/')
      .map((s) => s.trim())
      .filter((s) => Boolean(s) && !isPlaceholderCityName(s));

    if (segments.length > 0) {
      const countries = getAllPlaceCountries();
      let idx = 0;
      let country = countries.find((c) => matchAdminSegment(c.name, segments[0]));
      if (country) {
        idx = 1;
      } else {
        country = countries.find((c) => c.name === '中国') || countries[0];
      }

      if (idx === segments.length && country) {
        return {
          schemaVersion: 1,
          kind: 'structured',
          country: country.name,
          originalText: null,
        };
      }

      const provSeg = segments[idx];
      const prov = provSeg
        ? country?.provinces.find((p) => matchAdminSegment(p.name, provSeg))
        : undefined;

      if (prov) {
        idx += 1;
        if (idx === segments.length) {
          return {
            schemaVersion: 1,
            kind: 'structured',
            country: country.name,
            province: prov.name,
            originalText: null,
          };
        }

        const nextSeg = segments[idx];
        const selectableCities = prov.cities.filter(
          (c) => !c.isInternalHolder && !isPlaceholderCityName(c.name)
        );
        const cityMatch = selectableCities.find((c) =>
          matchAdminSegment(c.name, nextSeg)
        );

        if (cityMatch) {
          idx += 1;
          if (idx === segments.length) {
            return {
              schemaVersion: 1,
              kind: 'structured',
              country: country.name,
              province: prov.name,
              city: cityMatch.name,
              originalText: null,
            };
          }
          if (idx === segments.length - 1) {
            const distMatch = cityMatch.districts.find((d) =>
              matchAdminSegment(d.name, segments[idx])
            );
            if (distMatch) {
              return {
                schemaVersion: 1,
                kind: 'structured',
                country: country.name,
                province: prov.name,
                city: cityMatch.name,
                district: distMatch.name,
                originalText: null,
              };
            }
          }
        } else if (idx === segments.length - 1) {
          const placeholderDistricts = prov.cities
            .filter((c) => c.isInternalHolder || isPlaceholderCityName(c.name))
            .flatMap((c) => c.districts);
          const distMatch = placeholderDistricts.find((d) =>
            matchAdminSegment(d.name, nextSeg)
          );
          if (distMatch) {
            return {
              schemaVersion: 1,
              kind: 'structured',
              country: country.name,
              province: prov.name,
              district: distMatch.name,
              originalText: null,
            };
          }
        }
      }
    }
  }

  return {
    schemaVersion: 1,
    kind: 'phrase',
    originalText: trimmed,
  };
}

export function readGenealogyPlace(
  person: PersonRecord | null | undefined,
  field: PersonPlaceField
): GenealogyPlace | null {
  if (!person) return null;

  const structured =
    field === 'birth'
      ? person.birth?.structuredPlace
      : field === 'burial'
        ? person.death?.structuredBurialPlace
        : person.death?.structuredPlace;
  if (structured) {
    return structured;
  }

  const rawText =
    field === 'birth'
      ? person.birth?.place
      : field === 'burial'
        ? person.death?.burialPlace ?? person.burialPlace
        : person.death?.place;

  return parsePlaceText(rawText);
}

export function writeGenealogyPlace(
  person: PersonRecord,
  field: PersonPlaceField,
  nextPlace: GenealogyPlace | null
): PersonRecord {
  const display = formatGenealogyPlace(nextPlace).trim() || undefined;

  if (field === 'birth') {
    return {
      ...person,
      birth: {
        ...(person.birth || {}),
        place: display ?? '',
        structuredPlace: nextPlace ?? undefined,
      },
    };
  }

  if (field === 'burial') {
    return {
      ...person,
      burialPlace: display,
      death: {
        ...(person.death || {}),
        burialPlace: display ?? '',
        structuredBurialPlace: nextPlace ?? undefined,
      },
    };
  }

  return {
    ...person,
    death: {
      ...(person.death || {}),
      place: display ?? '',
      structuredPlace: nextPlace ?? undefined,
    },
  };
}

export function getPersonPlaceDisplay(
  person: PersonRecord | null | undefined,
  field: PersonPlaceField
): string {
  if (!person) return '';
  const structured =
    field === 'birth'
      ? person.birth?.structuredPlace
      : field === 'burial'
        ? person.death?.structuredBurialPlace
        : person.death?.structuredPlace;
  if (structured) {
    return formatGenealogyPlace(structured);
  }
  return field === 'birth'
    ? person.birth?.place?.trim() || ''
    : field === 'burial'
      ? person.death?.burialPlace?.trim() || person.burialPlace?.trim() || ''
      : person.death?.place?.trim() || '';
}
