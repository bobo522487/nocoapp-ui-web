export interface ArticleDocument {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  contentHtml: string;
  wordCount: number;
  updatedAt: string;
}

export interface ArticleMetaInput {
  title: string;
  subtitle?: string;
  author?: string;
}

import type { GenealogyPlace } from '../place-input/place.types';

export interface ProjectArticleSeedContext {
  familyName?: string;
  surname?: string;
  hallName?: string;
  ancestor?: string;
  region?: GenealogyPlace | null;
}
