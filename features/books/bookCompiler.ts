import type { TreeItem } from '../../components/common/Tree/types';
import type { ArticleDocument } from '../articles/types';
import {
  computeWordCount,
  extractPlainTextFromHtml,
  makeArticleStorageKey,
} from '../articles/articleData';
import { createSeedPersonsForChart } from '../lineage/lineageData';
import type { PersonRecord } from '../lineage/types';
import { getPersonDateDisplay } from '../date-input';
import type {
  BookEdition,
  BookLayoutConfig,
  BookPaperSize,
  BookRecord,
  CatalogLeafNode,
  CatalogLineageNode,
  CatalogNode,
  CatalogSectionCode,
  CompiledLineageEntry,
  CompiledPage,
  CompiledTocEntry,
} from './types';

export const PAPER_SIZE_LABELS: Record<BookPaperSize, string> = {
  thread_185x290: '标准线装 (18.5cm x 29.0cm)',
  a4_210x297: '大十六开 A4 (21.0cm x 29.7cm)',
  k16_185x260: '传统十六开 (18.5cm x 26.0cm)',
};

export const BINDING_LABELS: Record<'thread' | 'hardcover', string> = {
  thread: '古籍线装',
  hardcover: '现代精装',
};

export const LINEAGE_STYLE_LABELS: Record<
  'euler' | 'su' | 'modern_double',
  string
> = {
  euler: '欧式',
  su: '苏式',
  modern_double: '现代双栏',
};

export function toChineseNumeral(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return String(num);
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (num < 10) return digits[num];
  if (num === 10) return '十';
  if (num < 20) return `十${digits[num % 10]}`;
  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${digits[tens]}十${ones > 0 ? digits[ones] : ''}`;
  }
  return String(num);
}

export function formatPageNumberLabel(
  pageNo: number,
  style: 'chinese' | 'arabic'
): string {
  if (style === 'arabic') return `第 ${pageNo} 页`;
  return `第${toChineseNumeral(pageNo)}页`;
}

export function sanitizeVolumeNo(raw: string): string {
  // 限5个汉字或字符，保留常见中文数字与卷标识
  const trimmed = raw.trim();
  const chars = Array.from(trimmed);
  return chars.slice(0, 5).join('');
}

export function resolveChartPersons(
  projectId: string,
  chartId: string,
  lineageTree: TreeItem[],
  personsByChart: Record<string, PersonRecord[]>,
  projectSurname?: string
): { chartName: string; persons: PersonRecord[] } {
  const findNode = (items: TreeItem[]): TreeItem | null => {
    for (const item of items) {
      if (String(item.id) === String(chartId)) return item;
      if (item.children?.length) {
        const hit = findNode(item.children);
        if (hit) return hit;
      }
    }
    return null;
  };

  const node = findNode(lineageTree);
  const chartName = node?.data?.name || '世系图谱';
  const key = `${projectId}::${chartId}`;
  const stored = personsByChart[key];
  if (stored && stored.length > 0) {
    return { chartName, persons: stored };
  }

  const fallbackSurname =
    node?.data?.surname !== undefined
      ? node.data.surname
      : chartId.startsWith('lineage-royal-')
        ? '刘'
        : chartId.startsWith('lineage-other-') ||
            chartId.startsWith('lineage-ancestor-')
          ? ''
          : projectSurname || '';

  return {
    chartName,
    persons: createSeedPersonsForChart(chartId, chartName, fallbackSurname),
  };
}

export function sliceLineagePersons(
  allPersons: PersonRecord[],
  node: CatalogLineageNode
): PersonRecord[] {
  if (!allPersons.length) return [];

  const startPerson =
    allPersons.find((p) => p.id === node.startMemberId) || allPersons[0];
  if (!startPerson) return [];

  const startGen = startPerson.generation || 1;
  const childrenByParent = new Map<string, PersonRecord[]>();
  for (const p of allPersons) {
    if (p.fatherId) {
      const list = childrenByParent.get(p.fatherId) || [];
      list.push(p);
      childrenByParent.set(p.fatherId, list);
    }
  }

  for (const [, list] of childrenByParent) {
    list.sort((a, b) => {
      const oa = a.siblingOrder ?? a.biographyOrder ?? 50;
      const ob = b.siblingOrder ?? b.biographyOrder ?? 50;
      return oa - ob;
    });
  }

  const result: PersonRecord[] = [];
  const visited = new Set<string>();

  const traverse = (person: PersonRecord) => {
    if (visited.has(person.id)) return;

    if (
      node.descendantScope === 'generations' &&
      node.maxGenerations &&
      person.generation - startGen + 1 > node.maxGenerations
    ) {
      return;
    }

    if (
      node.descendantScope === 'member' &&
      node.endMemberId &&
      person.id === node.endMemberId
    ) {
      return;
    }

    visited.add(person.id);
    result.push(person);

    if (
      node.descendantScope === 'member_inclusive' &&
      node.endMemberId &&
      person.id === node.endMemberId
    ) {
      return;
    }

    const kids = childrenByParent.get(person.id) || [];
    for (const child of kids) {
      traverse(child);
    }
  };

  traverse(startPerson);
  return result;
}

function buildPersonSummary(
  p: PersonRecord,
  childrenNames: string[]
): string {
  const parts: string[] = [];
  if (p.courtesyName) parts.push(`字${p.courtesyName}`);
  if (p.rank) parts.push(p.rank);
  const birthDisplay = getPersonDateDisplay(p, 'birth');
  if (birthDisplay) {
    parts.push(`生于${birthDisplay}`);
  }
  if (p.officialTitle || p.career?.title) {
    parts.push(p.officialTitle || p.career?.title || '');
  }
  if (p.spouses?.length) {
    const spText = p.spouses
      .map((s) => `${s.relationLabel || '配'}${s.name}${s.clanOrigin ? `（${s.clanOrigin}）` : ''}`)
      .join('；');
    parts.push(spText);
  }
  const deathDisplay = getPersonDateDisplay(p, 'death');
  if (deathDisplay) {
    parts.push(`卒于${deathDisplay}`);
  }
  if (p.burialPlace || p.death?.burialPlace) {
    parts.push(`葬${p.burialPlace || p.death?.burialPlace}`);
  }
  if (p.biography) {
    parts.push(p.biography);
  }
  if (childrenNames.length > 0) {
    parts.push(`子：${childrenNames.join('、')}`);
  }
  return parts.filter(Boolean).join('。') || '世系谱名录存录，待补行传。';
}

function splitHtmlIntoPages(html: string, maxCharsPerPage: number): string[] {
  const plain = extractPlainTextFromHtml(html);
  if (!plain || plain.length <= maxCharsPerPage) {
    return [html || '<p>暂无正文内容。</p>'];
  }

  // Split by paragraph / heading boundaries when available
  const blocks = html
    .split(/(?=<(?:p|h[1-6]|blockquote|table|ul|ol)[\s>])/i)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length <= 1) {
    return [html];
  }

  const pages: string[] = [];
  let currentBlocks: string[] = [];
  let currentChars = 0;

  for (const block of blocks) {
    const blockLen = extractPlainTextFromHtml(block).length || 20;
    if (currentChars > 0 && currentChars + blockLen > maxCharsPerPage) {
      pages.push(currentBlocks.join('\n'));
      currentBlocks = [block];
      currentChars = blockLen;
    } else {
      currentBlocks.push(block);
      currentChars += blockLen;
    }
  }

  if (currentBlocks.length > 0) {
    pages.push(currentBlocks.join('\n'));
  }

  return pages.length > 0 ? pages : [html];
}

function flattenSectionLeaves(
  nodes: CatalogNode[],
  chapterTitle?: string
): Array<{ leaf: CatalogLeafNode; chapterTitle?: string }> {
  const items: Array<{ leaf: CatalogLeafNode; chapterTitle?: string }> = [];
  for (const node of nodes) {
    if (node.nodeType === 'chapter') {
      items.push(...flattenSectionLeaves(node.children, node.title));
    } else {
      items.push({ leaf: node, chapterTitle });
    }
  }
  return items;
}

export interface CompileBookParams {
  projectId: string;
  book: BookRecord;
  articlesByKey: Record<string, ArticleDocument>;
  lineageTree: TreeItem[];
  personsByChart: Record<string, PersonRecord[]>;
  projectSurname?: string;
}

export function compileBookEdition(params: CompileBookParams): BookEdition {
  const { projectId, book, articlesByKey, lineageTree, personsByChart, projectSurname } =
    params;
  const layout: BookLayoutConfig = { ...book.layoutConfig };

  const charsPerPage =
    layout.density === 'loose' ? 420 : layout.density === 'compact' ? 760 : 580;

  const pages: CompiledPage[] = [];
  const tocEntries: CompiledTocEntry[] = [];
  const uniqueMemberIds = new Set<string>();
  let totalWords = 0;

  // Page 1: Cover page
  pages.push({
    pageNo: 1,
    type: 'cover',
    sectionCode: 'cover',
    headerTitle: book.headerName || book.bookName,
    eyebrowTitle: book.volumeNo || '卷一',
    hallName: book.hallName || '宗亲堂',
    title: book.bookName,
    author: book.editor || '家族编委会',
  });

  // Compile preface items BEFORE TOC (卷首：显示在目录之前的内容)
  const prefaceLeaves = flattenSectionLeaves(book.sections.preface.items);
  const preTocPages: CompiledPage[] = [];

  const appendArticlePages = (
    targetList: CompiledPage[],
    sectionCode: CatalogSectionCode,
    sectionLabel: string,
    leaf: Extract<CatalogLeafNode, { nodeType: 'article' }>,
    chapterTitle?: string,
    recordToc = true
  ) => {
    const key = makeArticleStorageKey(projectId, leaf.sourceArticleId);
    const doc = articlesByKey[key];
    const html =
      doc?.contentHtml ||
      `<p>「${leaf.displayTitle}」引用自谱文《${leaf.sourceTitle}》，当前暂无正文或原谱文已被移除。</p>`;
    const wc = doc ? doc.wordCount : computeWordCount(html);
    totalWords += wc;

    const chunks = splitHtmlIntoPages(html, charsPerPage);
    chunks.forEach((chunkHtml, idx) => {
      const pageNo = targetList === preTocPages ? 2 + preTocPages.length : 0;
      if (idx === 0 && recordToc) {
        tocEntries.push({
          title: leaf.displayTitle,
          sectionLabel: chapterTitle || sectionLabel,
          pageNo,
          level: chapterTitle ? 2 : 1,
        });
      }
      targetList.push({
        pageNo,
        type: 'article',
        sectionCode,
        headerTitle: book.headerName || book.bookName,
        eyebrowTitle: chapterTitle || sectionLabel,
        hallName: book.hallName || '',
        chapterTitle,
        title: idx === 0 ? leaf.displayTitle : `${leaf.displayTitle}（续）`,
        author: doc?.author || book.editor,
        contentHtml: chunkHtml,
      });
    });
  };

  for (const item of prefaceLeaves) {
    if (item.leaf.nodeType === 'article') {
      appendArticlePages(
        preTocPages,
        'preface',
        '卷首',
        item.leaf,
        item.chapterTitle,
        false
      );
    }
  }

  pages.push(...preTocPages);

  // Reserve TOC page right after preface
  const tocPageIndex = pages.length;
  const tocPageNo = tocPageIndex + 1;
  pages.push({
    pageNo: tocPageNo,
    type: 'toc',
    sectionCode: 'toc',
    headerTitle: book.headerName || book.bookName,
    eyebrowTitle: '目录',
    hallName: book.hallName || '',
    title: '谱书总目',
    tocEntries: [],
  });

  // Helper to append post-TOC content
  const appendPostTocArticle = (
    sectionCode: CatalogSectionCode,
    sectionLabel: string,
    leaf: Extract<CatalogLeafNode, { nodeType: 'article' }>,
    chapterTitle?: string
  ) => {
    const key = makeArticleStorageKey(projectId, leaf.sourceArticleId);
    const doc = articlesByKey[key];
    const html =
      doc?.contentHtml ||
      `<p>「${leaf.displayTitle}」引用自谱文《${leaf.sourceTitle}》，暂无正文内容。</p>`;
    const wc = doc ? doc.wordCount : computeWordCount(html);
    totalWords += wc;

    const chunks = splitHtmlIntoPages(html, charsPerPage);
    chunks.forEach((chunkHtml, idx) => {
      const pageNo = pages.length + 1;
      if (idx === 0) {
        tocEntries.push({
          title: leaf.displayTitle,
          sectionLabel: chapterTitle || sectionLabel,
          pageNo,
          level: chapterTitle ? 2 : 1,
        });
      }
      pages.push({
        pageNo,
        type: 'article',
        sectionCode,
        headerTitle: book.headerName || book.bookName,
        eyebrowTitle: chapterTitle || sectionLabel,
        hallName: book.hallName || '',
        chapterTitle,
        title: idx === 0 ? leaf.displayTitle : `${leaf.displayTitle}（续）`,
        author: doc?.author || book.editor,
        contentHtml: chunkHtml,
      });
    });
  };

  const appendLineagePages = (
    leaf: CatalogLineageNode,
    chapterTitle?: string
  ) => {
    const { persons: chartPersons } = resolveChartPersons(
      projectId,
      leaf.chartId,
      lineageTree,
      personsByChart,
      projectSurname
    );
    const sliced = sliceLineagePersons(chartPersons, leaf);
    sliced.forEach((p) => uniqueMemberIds.add(p.id));

    const childrenMap = new Map<string, string[]>();
    const personById = new Map<string, PersonRecord>();
    for (const p of sliced) {
      personById.set(p.id, p);
      if (p.fatherId) {
        const arr = childrenMap.get(p.fatherId) || [];
        arr.push(p.name);
        childrenMap.set(p.fatherId, arr);
      }
    }

    const eyebrow = leaf.eyebrowTitle || '世系';
    const totalTitle = leaf.totalTitle || book.bookName;

    // 1. 世系表 (allocate page numbers first or collect entries)
    const entries: CompiledLineageEntry[] = sliced.map((p) => {
      const father = p.fatherId ? personById.get(p.fatherId) : undefined;
      const kids = childrenMap.get(p.id) || [];
      const summary = buildPersonSummary(p, kids);
      totalWords += p.name.length + summary.length;
      return {
        id: p.id,
        name: p.name,
        surname: p.surname,
        courtesyName: p.courtesyName,
        generation: p.generation,
        rank: p.rank,
        fatherName: father?.name || p.fatherName,
        spousesText: p.spouses?.map((s) => s.name).join('、'),
        summaryText: summary,
        childrenNames: kids,
      };
    });

    // Calculate approximate page start for shixi entries
    const indexPagesCount =
      leaf.indexConfig.enabled && sliced.length > 0
        ? Math.max(1, Math.ceil(sliced.length / 18))
        : 0;
    const diaoxianPagesCount =
      leaf.diaoxianConfig.enabled && sliced.length > 0 ? 1 : 0;

    const firstShixiPageNo =
      pages.length + 1 + indexPagesCount + diaoxianPagesCount;

    // 1. 族丁检索表
    if (leaf.indexConfig.enabled) {
      const rowsPerPage = 18;
      const totalIdxPages = Math.max(1, Math.ceil(sliced.length / rowsPerPage));
      for (let i = 0; i < totalIdxPages; i++) {
        const pageNo = pages.length + 1;
        if (i === 0 && leaf.indexConfig.inToc) {
          tocEntries.push({
            title: `${leaf.eyebrowTitle} · ${leaf.indexConfig.tocTitle || '族丁检索表'}`,
            sectionLabel: chapterTitle || '世系',
            pageNo,
            level: 2,
          });
        }
        const sliceRows = sliced
          .slice(i * rowsPerPage, (i + 1) * rowsPerPage)
          .map((p, idx) => ({
            name: p.name,
            generation: p.generation,
            fatherName:
              (p.fatherId ? personById.get(p.fatherId)?.name : undefined) ||
              p.fatherName ||
              '—',
            pageRef:
              firstShixiPageNo + Math.floor((i * rowsPerPage + idx) / 6),
          }));

        pages.push({
          pageNo,
          type: 'lineage_index',
          sectionCode: 'lineage',
          headerTitle: book.headerName || book.bookName,
          eyebrowTitle: eyebrow,
          hallName: book.hallName || '',
          chapterTitle,
          title: leaf.indexConfig.tocTitle || '族丁检索表',
          indexRows: sliceRows,
        });
      }
    }

    // 2. 吊线图
    if (leaf.diaoxianConfig.enabled) {
      const pageNo = pages.length + 1;
      if (leaf.diaoxianConfig.inToc) {
        tocEntries.push({
          title: `${leaf.eyebrowTitle} · ${leaf.diaoxianConfig.tocTitle || '吊线图'}`,
          sectionLabel: chapterTitle || '世系',
          pageNo,
          level: 2,
        });
      }
      pages.push({
        pageNo,
        type: 'lineage_tree',
        sectionCode: 'lineage',
        headerTitle: book.headerName || book.bookName,
        eyebrowTitle: eyebrow,
        hallName: book.hallName || '',
        chapterTitle,
        title: `${totalTitle} · ${leaf.diaoxianConfig.tocTitle || '吊线图'}`,
        treePersons: sliced.slice(0, 32).map((p) => ({
          id: p.id,
          name: p.name,
          generation: p.generation,
          fatherId: p.fatherId,
          rank: p.rank,
        })),
      });
    }

    // 3. 世系表
    if (leaf.shixiConfig.enabled) {
      const entriesPerPage =
        layout.density === 'loose' ? 4 : layout.density === 'compact' ? 8 : 6;
      const totalShixiPages = Math.max(
        1,
        Math.ceil(entries.length / entriesPerPage)
      );
      for (let i = 0; i < totalShixiPages; i++) {
        const pageNo = pages.length + 1;
        if (i === 0 && leaf.shixiConfig.inToc) {
          tocEntries.push({
            title: `${leaf.eyebrowTitle} · ${leaf.shixiConfig.tocTitle || '世系表'}`,
            sectionLabel: chapterTitle || '世系',
            pageNo,
            level: 2,
          });
        }
        pages.push({
          pageNo,
          type: 'lineage_table',
          sectionCode: 'lineage',
          headerTitle: book.headerName || book.bookName,
          eyebrowTitle: eyebrow,
          hallName: book.hallName || '',
          chapterTitle,
          title: `${totalTitle} · ${leaf.shixiConfig.tocTitle || '世系表'}`,
          lineageEntries: entries.slice(
            i * entriesPerPage,
            (i + 1) * entriesPerPage
          ),
          lineageStyle: layout.lineageStyle,
        });
      }
    }
  };

  const postSections: Array<{ code: CatalogSectionCode; label: string }> = [
    { code: 'body', label: '正文' },
    { code: 'lineage', label: '世系' },
    { code: 'appendix', label: '附录' },
  ];

  for (const sec of postSections) {
    const nodes = book.sections[sec.code].items;
    for (const node of nodes) {
      if (node.nodeType === 'chapter') {
        const chapterStartPage = pages.length + 1;
        if (node.children.length > 0) {
          tocEntries.push({
            title: node.title,
            sectionLabel: sec.label,
            pageNo: chapterStartPage,
            level: 1,
          });
        }
        for (const child of node.children) {
          if (child.nodeType === 'article') {
            appendPostTocArticle(sec.code, sec.label, child, node.title);
          } else {
            appendLineagePages(child, node.title);
          }
        }
      } else if (node.nodeType === 'article') {
        appendPostTocArticle(sec.code, sec.label, node);
      } else {
        appendLineagePages(node);
      }
    }
  }

  // Update TOC entries
  pages[tocPageIndex] = {
    ...pages[tocPageIndex],
    tocEntries,
  };

  return {
    id: `ed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: formatTimestampNow(),
    bindingStyle: layout.bindingStyle,
    lineageStyle: layout.lineageStyle,
    paperSize: layout.paperSize,
    pageCount: pages.length,
    memberCount: uniqueMemberIds.size,
    wordCount: totalWords,
    printStatus: 'none',
    layoutSnapshot: layout,
    pages,
  };
}

export function formatTimestampNow(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export function generateProofHtmlDocument(
  book: BookRecord,
  edition: BookEdition,
  mode: 'proof' | 'print'
): string {
  const fontCss =
    edition.layoutSnapshot.fontFamily === 'kai'
      ? '"Kaiti SC", "STKaiti", "KaiTi", serif'
      : edition.layoutSnapshot.fontFamily === 'fangsong'
        ? '"FangSong", "STFangsong", serif'
        : edition.layoutSnapshot.fontFamily === 'hei'
          ? '"PingFang SC", "Microsoft YaHei", sans-serif'
          : '"Noto Serif SC", "Songti SC", "SimSun", serif';

  const pagesHtml = edition.pages
    .map((p) => {
      let body = '';
      if (p.type === 'cover') {
        body = `<div style="text-align:center; padding:80px 32px; border:2px double #2b2118; height:100%; box-sizing:border-box;">
          <div style="font-size:14px; letter-spacing:4px; color:#6b5c4d; margin-bottom:24px;">${p.hallName} · ${book.volumeNo || '卷一'}</div>
          <h1 style="font-size:34px; letter-spacing:6px; margin:24px 0;">${book.bookName}</h1>
          <div style="margin-top:48px; font-size:14px; color:#4b3f35;">${book.editor || '家族编委会'} 编修 · ${book.compilationDate || ''}</div>
        </div>`;
      } else if (p.type === 'toc') {
        const rows = (p.tocEntries || [])
          .map(
            (t) =>
              `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #d6cfc4; padding-left:${t.level === 2 ? '20px' : '0'};">
                <span>${t.title}</span><span>${formatPageNumberLabel(t.pageNo, edition.layoutSnapshot.pageNumberStyle)}</span>
              </div>`
          )
          .join('');
        body = `<h2 style="font-size:20px; border-bottom:1px solid #2b2118; padding-bottom:8px; margin-bottom:16px;">谱书总目</h2>${rows || '<p>暂无目录条目</p>'}`;
      } else if (p.type === 'article') {
        body = `<h2 style="font-size:19px; margin-bottom:6px;">${p.title || ''}</h2>
          <div style="font-size:12px; color:#6b5c4d; margin-bottom:16px;">${p.author || ''}</div>
          <div style="line-height:1.9; font-size:14px;">${p.contentHtml || ''}</div>`;
      } else if (p.type === 'lineage_index') {
        const rows = (p.indexRows || [])
          .map(
            (r) =>
              `<tr><td style="padding:6px;border-bottom:1px solid #e5e0d5;">第${toChineseNumeral(r.generation)}世</td><td style="padding:6px;border-bottom:1px solid #e5e0d5;font-weight:bold;">${r.name}</td><td style="padding:6px;border-bottom:1px solid #e5e0d5;">${r.fatherName}</td><td style="padding:6px;border-bottom:1px solid #e5e0d5;text-align:right;">P.${r.pageRef}</td></tr>`
          )
          .join('');
        body = `<h2 style="font-size:18px; margin-bottom:12px;">${p.title || '族丁检索表'}</h2>
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead><tr style="border-bottom:1.5px solid #2b2118;"><th style="text-align:left;padding:6px;">世次</th><th style="text-align:left;padding:6px;">谱名</th><th style="text-align:left;padding:6px;">父讳</th><th style="text-align:right;padding:6px;">页码</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
      } else if (p.type === 'lineage_tree') {
        const items = (p.treePersons || [])
          .map(
            (tp) =>
              `<div style="margin-left:${Math.max(0, (tp.generation - 1) * 18)}px; padding:4px 0; font-size:13px;">
                <span style="color:#8c2d25;">[${toChineseNumeral(tp.generation)}世]</span> <strong>${tp.name}</strong> ${tp.rank ? `(${tp.rank})` : ''}
              </div>`
          )
          .join('');
        body = `<h2 style="font-size:18px; margin-bottom:12px;">${p.title || '吊线图'}</h2><div>${items}</div>`;
      } else if (p.type === 'lineage_table') {
        const items = (p.lineageEntries || [])
          .map(
            (e) =>
              `<div style="padding:10px 0; border-bottom:1px dashed #d6cfc4;">
                <div style="font-weight:bold; font-size:15px;">[第${toChineseNumeral(e.generation)}世] ${e.name} ${e.fatherName ? `（${e.fatherName}之子）` : ''}</div>
                <div style="font-size:13px; color:#3d332a; margin-top:4px; line-height:1.7;">${e.summaryText}</div>
              </div>`
          )
          .join('');
        body = `<h2 style="font-size:18px; margin-bottom:12px;">${p.title || '世系表'}</h2>${items}`;
      }

      return `<section class="book-page">
        <div class="page-head">
          <span>${edition.layoutSnapshot.showHeaderName ? p.headerTitle : ''}</span>
          <span>${p.eyebrowTitle}</span>
          <span>${edition.layoutSnapshot.showHallName ? p.hallName : ''}</span>
        </div>
        <div class="page-body">${body}</div>
        <div class="page-foot">${formatPageNumberLabel(p.pageNo, edition.layoutSnapshot.pageNumberStyle)}</div>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${book.bookName} - ${mode === 'print' ? '高清印刷版' : '校对稿'}</title>
  <style>
    body { margin: 0; padding: 24px; background: #f3f1ec; font-family: ${fontCss}; color: #1f1a14; }
    .book-page { width: 720px; min-height: 980px; margin: 0 auto 24px; background: #fffdf8; border: 1px solid #cfc8ba; padding: 36px 42px; box-sizing: border-box; display: flex; flex-direction: column; page-break-after: always; }
    .page-head { display: flex; justify-content: space-between; font-size: 12px; color: #6b5c4d; border-bottom: 1px solid #2b2118; padding-bottom: 8px; margin-bottom: 20px; }
    .page-body { flex: 1; }
    .page-foot { text-align: center; font-size: 12px; color: #6b5c4d; border-top: 1px solid #e5e0d5; padding-top: 8px; margin-top: 20px; }
    @media print { body { background: #fff; padding: 0; } .book-page { border: none; margin: 0; box-shadow: none; } }
  </style>
</head>
<body>${pagesHtml}</body>
</html>`;
}
