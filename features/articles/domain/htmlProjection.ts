import { generateHTML, generateJSON, type JSONContent } from '@tiptap/core';
import { createArticleExtensions } from '../extensions/createArticleExtensions';

export function htmlToContentJson(html: string): JSONContent {
  return generateJSON(html || '<p></p>', createArticleExtensions());
}

export function contentJsonToHtml(json: JSONContent): string {
  return generateHTML(json, createArticleExtensions());
}