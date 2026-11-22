export interface GenealogyPlace {
  schemaVersion: 1;
  kind: 'structured' | 'phrase';
  country?: string;
  province?: string;
  city?: string;
  district?: string;
  originalText?: string | null;
}

export interface ClanPlaceStat {
  label: string;
  count: number;
  structuredPlace?: GenealogyPlace | null;
}

export interface PlaceSuggestionItem {
  id: string;
  kind: 'clan' | 'region' | 'phrase';
  primaryLabel: string;
  metaLabel: string;
  value: GenealogyPlace;
}
