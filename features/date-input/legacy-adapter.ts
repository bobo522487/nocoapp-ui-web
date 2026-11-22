import type { PersonRecord } from '../lineage/types';
import { formatGenealogyDate } from './date-format';
import type { GenealogyDate } from './date.types';

export type PersonDateField = 'birth' | 'death' | 'burial';

/**
 * Single Source of Truth adapter between structuredDate and legacy string projections
 * (birthDate, deathDate, birth.date, death.date, death.burialDate).
 *
 * Rule:
 * - structuredDate is the ONLY authoritative source when present.
 * - Legacy string fields are read-only projections generated exclusively by formatGenealogyDate().
 * - Legacy string-only records automatically hydrate as `kind: "phrase"` preserving 100% of original text.
 */
export function readGenealogyDate(
  person: Pick<PersonRecord, 'birth' | 'death' | 'birthDate' | 'deathDate'>,
  field: PersonDateField
): GenealogyDate | null {
  const structured =
    field === 'birth'
      ? person.birth?.structuredDate
      : field === 'burial'
        ? person.death?.structuredBurialDate
        : person.death?.structuredDate;
  if (structured) {
    return structured;
  }

  const legacyText =
    field === 'birth'
      ? (person.birth?.date ?? person.birthDate)?.trim()
      : field === 'burial'
        ? person.death?.burialDate?.trim()
        : (person.death?.date ?? person.deathDate)?.trim();

  if (legacyText) {
    return {
      schemaVersion: 1,
      kind: 'phrase',
      originalText: legacyText,
    };
  }

  return null;
}

export function writeGenealogyDate(
  person: PersonRecord,
  field: PersonDateField,
  value: GenealogyDate | null
): PersonRecord {
  const formatted = value ? formatGenealogyDate(value).trim() : '';
  const projected = formatted || undefined;

  if (field === 'birth') {
    return {
      ...person,
      birthDate: projected,
      birth: {
        ...(person.birth || {}),
        date: projected || '',
        structuredDate: value ?? undefined,
      },
    };
  }

  if (field === 'burial') {
    return {
      ...person,
      death: {
        ...(person.death || {}),
        burialDate: projected || '',
        structuredBurialDate: value ?? undefined,
      },
    };
  }

  return {
    ...person,
    deathDate: projected,
    death: {
      ...(person.death || {}),
      date: projected || '',
      structuredDate: value ?? undefined,
    },
  };
}

export function getPersonDateDisplay(
  person: Pick<PersonRecord, 'birth' | 'death' | 'birthDate' | 'deathDate'>,
  field: PersonDateField
): string {
  const structured =
    field === 'birth'
      ? person.birth?.structuredDate
      : field === 'burial'
        ? person.death?.structuredBurialDate
        : person.death?.structuredDate;
  if (structured) {
    return formatGenealogyDate(structured);
  }
  const legacyText =
    field === 'birth'
      ? person.birth?.date || person.birthDate || ''
      : field === 'burial'
        ? person.death?.burialDate || ''
        : person.death?.date || person.deathDate || '';
  return legacyText.trim();
}
