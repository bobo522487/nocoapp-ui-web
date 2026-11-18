import type { PersonRecord } from '../lineage/types';
import { formatGenealogyPlace, matchRegionFromText } from './place-core';
import type { GenealogyPlace } from './place.types';

export type PersonPlaceField = 'birth' | 'death';

export function readGenealogyPlace(
  person: PersonRecord | null | undefined,
  field: PersonPlaceField
): GenealogyPlace | null {
  if (!person) return null;

  const structured =
    field === 'birth'
      ? person.birth?.structuredPlace
      : person.death?.structuredPlace;
  if (structured) {
    return structured;
  }

  const rawText =
    field === 'birth'
      ? person.birth?.place
      : person.death?.burialPlace ?? person.burialPlace;

  const trimmed = rawText?.trim();
  if (!trimmed) return null;

  const matched = matchRegionFromText(trimmed);
  if (matched) {
    return matched;
  }

  return {
    schemaVersion: 1,
    kind: 'phrase',
    originalText: trimmed,
  };
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

  return {
    ...person,
    burialPlace: display,
    death: {
      ...(person.death || {}),
      burialPlace: display ?? '',
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
      : person.death?.structuredPlace;
  if (structured) {
    return formatGenealogyPlace(structured);
  }
  return field === 'birth'
    ? person.birth?.place?.trim() || ''
    : person.death?.burialPlace?.trim() || person.burialPlace?.trim() || '';
}
