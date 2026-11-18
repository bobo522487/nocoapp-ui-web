import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PersonRecord } from '../types';
import { formatGivenName } from '../utils/nameUtils';
import {
  computeAutoRankLabel,
  getDerivedChildren,
  getSpouseSortScore,
} from '../utils/personHelpers';
import { InlineNodeNameInput } from './components/InlineNodeNameInput';
import { CanvasZoomBar } from './components/CanvasZoomBar';

interface IndentedTreeCanvasProps {
  persons: PersonRecord[];
  allPersons: PersonRecord[];
  selectedPersonId?: string | null;
  editingPersonId?: string | null;
  clanSurname?: string;
  searchQuery?: string;
  locateNonce?: number;
  resetNonce?: number;
  onSelectPerson?: (id: string | null) => void;
  onAddChild?: (fatherId: string, gender?: 'male' | 'female') => void;
  onAddSibling?: (refPersonId: string, gender?: 'male' | 'female') => void;
  onAddSpouse?: (personId: string) => void;
  onCommitInlineName?: (
    personId: string,
    name: string,
    openDrawer: boolean
  ) => void;
  onCancelInlineName?: (personId: string) => void;
  toolbar?: React.ReactNode;
}

const CHINESE_NUMS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function formatChineseGen(gen: number): string {
  if (gen <= 0) return '[一世]';
  if (gen <= 10) return `[${CHINESE_NUMS[gen]}世]`;
  if (gen < 20) return `[十${CHINESE_NUMS[gen - 10]}世]`;
  if (gen < 100) {
    const tens = Math.floor(gen / 10);
    const ones = gen % 10;
    return `[${CHINESE_NUMS[tens]}十${ones ? CHINESE_NUMS[ones] : ''}世]`;
  }
  return `[${gen}世]`;
}

function getFullDisplayName(person: PersonRecord, clanSurname: string): string {
  const isSpouse = Boolean(person.spouseOfId);
  const surname = isSpouse
    ? person.surname?.trim() || ''
    : person.surname?.trim() || clanSurname.trim();
  const given = isSpouse
    ? person.name.trim()
    : formatGivenName(person.name, surname);
  if (surname && given && !given.startsWith(surname)) {
    return `${surname}${given}`;
  }
  return given || surname || '未命名';
}

const GenderFigureIcon: React.FC<{
  gender?: 'male' | 'female';
  deceased?: boolean;
  muted?: boolean;
  className?: string;
}> = ({ gender = 'male', deceased = false, muted = false, className = '' }) => {
  const isFemale = gender === 'female';
  const colorClass = muted
    ? 'text-sky-500/65 dark:text-sky-400/65'
    : isFemale
      ? 'text-rose-500 dark:text-rose-400'
      : 'text-sky-500 dark:text-sky-400';

  return (
    <svg
      viewBox="0 0 16 16"
      className={`w-4 h-4 shrink-0 ${colorClass} ${deceased ? 'opacity-75' : ''} ${className}`}
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="8" cy="4.2" r="2.7" />
      {isFemale ? (
        <path d="M8 7.6c-2.6 0-4.4 2.1-4.8 6.4-.05.55.35 1 .9 1h7.8c.55 0 .95-.45.9-1C12.4 9.7 10.6 7.6 8 7.6z" />
      ) : (
        <path d="M8 7.6c-2.9 0-4.6 1.7-4.6 4.4V14c0 .55.45 1 1 1h7.2c.55 0 1-.45 1-1v-2c0-2.7-1.7-4.4-4.6-4.4z" />
      )}
    </svg>
  );
};

export const IndentedTreeCanvas: React.FC<IndentedTreeCanvasProps> = ({
  persons,
  allPersons,
  selectedPersonId,
  editingPersonId = null,
  clanSurname = '',
  searchQuery = '',
  locateNonce = 0,
  resetNonce = 0,
  onSelectPerson,
  onAddChild,
  onAddSibling,
  onAddSpouse,
  onCommitInlineName,
  onCancelInlineName,
  toolbar,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [resetNonce]);

  useEffect(() => {
    const focusTargetId = editingPersonId || selectedPersonId;
    if (!focusTargetId) return;
    // Expand any collapsed ancestors if locating/selecting/editing a hidden node
    const pMap = new Map<string, PersonRecord>();
    persons.forEach((p) => pMap.set(p.id, p));
    const toExpand: string[] = [];
    let curr = pMap.get(focusTargetId);
    if (curr?.spouseOfId) {
      curr = pMap.get(curr.spouseOfId);
    }
    const visited = new Set<string>();
    while (curr?.fatherId && !visited.has(curr.fatherId)) {
      visited.add(curr.fatherId);
      toExpand.push(curr.fatherId);
      curr = pMap.get(curr.fatherId);
    }
    if (toExpand.length > 0) {
      setCollapsedIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const id of toExpand) {
          if (next.has(id)) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
    requestAnimationFrame(() => {
      const el = rowRefs.current[focusTargetId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    });
  }, [selectedPersonId, editingPersonId, locateNonce, persons]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { roots, childrenMap, spousesByPartnerId, personMap } = useMemo(() => {
    const pMap = new Map<string, PersonRecord>();
    persons.forEach((p) => pMap.set(p.id, p));

    const spouseMap = new Map<string, PersonRecord[]>();
    persons.forEach((p) => {
      if (p.spouseOfId && pMap.has(p.spouseOfId)) {
        const list = spouseMap.get(p.spouseOfId) || [];
        list.push(p);
        spouseMap.set(p.spouseOfId, list);
      }
    });
    spouseMap.forEach((list, partnerId) => {
      list.sort((a, b) => {
        const diff = getSpouseSortScore(a) - getSpouseSortScore(b);
        if (diff !== 0) return diff;
        const orderA = a.siblingOrder ?? a.biographyOrder ?? 50;
        const orderB = b.siblingOrder ?? b.biographyOrder ?? 50;
        return orderA - orderB;
      });
      spouseMap.set(partnerId, list);
    });

    const cMap = new Map<string, PersonRecord[]>();
    persons.forEach((p) => {
      if (p.spouseOfId && pMap.has(p.spouseOfId)) return;
      if (p.fatherId && pMap.has(p.fatherId)) {
        const list = cMap.get(p.fatherId) || [];
        list.push(p);
        cMap.set(p.fatherId, list);
      }
    });

    // Sort children consistently using siblingOrder / biographyOrder / rank
    cMap.forEach((list, parentId) => {
      const sorted = getDerivedChildren(list, parentId);
      cMap.set(parentId, sorted);
    });

    const rootList = persons
      .filter(
        (p) =>
          !(p.spouseOfId && pMap.has(p.spouseOfId)) &&
          (!p.fatherId || !pMap.has(p.fatherId))
      )
      .sort((a, b) => (a.generation || 1) - (b.generation || 1));

    return {
      roots: rootList,
      childrenMap: cMap,
      spousesByPartnerId: spouseMap,
      personMap: pMap,
    };
  }, [persons]);

  const renderPersonCard = (
    person: PersonRecord,
    options?: { isSpouseCard?: boolean }
  ) => {
    const isSpouseCard = Boolean(options?.isSpouseCard);
    const isEditing =
      editingPersonId === person.id &&
      Boolean(onCommitInlineName) &&
      Boolean(onCancelInlineName);
    const isSelected = selectedPersonId === person.id;
    const isDeceased = person.status === 'deceased';
    const displayName = getFullDisplayName(person, clanSurname);
    const matchesSearch =
      searchQuery.trim().length > 0 &&
      displayName.toLowerCase().includes(searchQuery.trim().toLowerCase());

    const relationTag = isSpouseCard
      ? person.spouseRelationLabel && person.spouseRelationLabel !== '配偶'
        ? `[${person.spouseRelationLabel}]`
        : ''
      : `[${person.rank?.trim() || computeAutoRankLabel(person, allPersons)}]`;

    return (
      <div
        key={person.id}
        ref={(el) => {
          rowRefs.current[person.id] = el;
        }}
        data-id={person.id}
        role={isEditing ? undefined : 'button'}
        tabIndex={isEditing ? undefined : 0}
        onClick={(e) => {
          e.stopPropagation();
          if (!isEditing) {
            onSelectPerson?.(person.id);
          }
        }}
        onKeyDown={(e) => {
          if (isEditing) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onSelectPerson?.(person.id);
          }
        }}
        className={`person-node group relative inline-flex items-center gap-1.5 select-none ${
          isEditing ? '' : 'cursor-pointer'
        } ${isSelected ? 'active' : ''}`}
      >
        {/* Single-line height Gender Icon */}
        <GenderFigureIcon gender={person.gender} deceased={isDeceased} />

        {/* Inline Name Input (new node) OR Compact Single-line Name Box */}
        {isEditing && onCommitInlineName && onCancelInlineName ? (
          <InlineNodeNameInput
            personId={person.id}
            onCommit={onCommitInlineName}
            onCancel={onCancelInlineName}
            placeholder="输入姓名，回车确认"
            className="px-2.5 py-1 text-[13px] leading-snug w-36"
          />
        ) : (
          <span
            className={`px-3 py-1 rounded text-[13px] font-semibold leading-snug whitespace-nowrap transition-colors ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-xs'
                : matchesSearch
                  ? 'bg-[hsl(var(--surface-active))] text-primary border border-primary/60'
                  : 'border border-border/80 bg-background/70 text-foreground hover:bg-[hsl(var(--surface-subtle)/0.65)] hover:border-[hsl(var(--border-strong))]'
            }`}
          >
            {displayName}
            {isDeceased && (
              <span
                className={`ml-1 text-[10px] font-normal ${
                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}
              >
                (殁)
              </span>
            )}
          </span>
        )}

        {/* Trailing Rank / Relation Label behind Node */}
        {relationTag && (
          <span className="tree-relation-label text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {relationTag}
          </span>
        )}
      </div>
    );
  };

  const renderBranchNode = (
    person: PersonRecord,
    isRootRow: boolean,
    isLastSibling: boolean
  ): React.ReactNode => {
    const children = childrenMap.get(person.id) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsedIds.has(person.id);
    const attachedSpouses = spousesByPartnerId.get(person.id) || [];

    // Also collect legacy inline spouses that don't have a standalone node yet
    const legacySpouses = (person.spouses || []).filter(
      (s) => s.name?.trim() && (!s.id || !personMap.has(s.id))
    );

    const isSelectedSelf = selectedPersonId === person.id;
    const isSelectedAttachedSpouse = attachedSpouses.some(
      (s) => selectedPersonId === s.id
    );
    const showRowActions = isSelectedSelf || isSelectedAttachedSpouse;

    const showChildrenBranch = hasChildren && !isCollapsed;

    return (
      <div
        key={person.id}
        data-id={person.id}
        className={`relative ${
          isRootRow ? 'tree-row tree-row-progenitor' : 'tree-row'
        }`}
      >
        {/* Orthogonal Tree Trunk / Branch Connectors for non-root rows */}
        {!isRootRow && (
          <>
            {/* Vertical trunk segment along left edge */}
            <span
              aria-hidden="true"
              className="absolute -left-6 w-[1.5px]"
              style={{
                top: 0,
                height: isLastSibling ? '20px' : '100%',
                backgroundColor: 'hsl(var(--border-strong))',
              }}
            />
            {/* Horizontal connector arm to this row's content */}
            <span
              aria-hidden="true"
              className="absolute -left-6 top-[20px] w-5 h-[1.5px]"
              style={{ backgroundColor: 'hsl(var(--border-strong))' }}
            />
          </>
        )}

        {/* Row Header Content */}
        <div className="content-label flex items-center gap-2.5 py-1.5 min-h-[40px]">
          {/* Expand/Collapse Toggle (when has children) */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse(person.id);
              }}
              title={
                isCollapsed
                  ? `展开分支 (${children.length})`
                  : '折叠分支'
              }
              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                isCollapsed
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-background/80 border-border text-muted-foreground hover:text-foreground hover:border-[hsl(var(--border-strong))]'
              }`}
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          ) : (
            <span className="w-5 shrink-0" aria-hidden="true" />
          )}

          {/* Generation Label [一世] / [二世] / [三世] */}
          <span className="gen-label text-[12px] font-medium text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
            {formatChineseGen(person.generation || 1)}
          </span>

          {/* Node Group: Person + Spouses + Contextual Add Spouse */}
          <div className="node-group flex items-center flex-wrap gap-3">
            {renderPersonCard(person)}

            {/* Standalone Spouse Nodes */}
            {attachedSpouses.map((spouse) => (
              <React.Fragment key={spouse.id}>
                <span
                  aria-hidden="true"
                  className="w-3 h-[1.5px] shrink-0"
                  style={{ backgroundColor: 'hsl(var(--border-strong))' }}
                />
                {renderPersonCard(spouse, {
                  isSpouseCard: true,
                })}
              </React.Fragment>
            ))}

            {/* Legacy Inline Spouses (from seed data) */}
            {legacySpouses.map((sp, idx) => (
              <React.Fragment key={sp.id || `${person.id}-legacy-${idx}`}>
                <span
                  aria-hidden="true"
                  className="w-3 h-[1.5px] shrink-0"
                  style={{ backgroundColor: 'hsl(var(--border-strong))' }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPerson?.(person.id);
                  }}
                  title="点击查看关联族人档案"
                  className="person-node inline-flex items-center gap-1.5 cursor-pointer text-left"
                >
                  <GenderFigureIcon
                    gender={person.gender === 'male' ? 'female' : 'male'}
                  />
                  <span className="px-3 py-1 rounded border border-border/80 bg-background/70 hover:bg-[hsl(var(--surface-subtle)/0.65)] hover:border-[hsl(var(--border-strong))] font-semibold text-[13px] text-foreground whitespace-nowrap transition-colors">
                    {sp.name}
                  </span>
                  {sp.relationLabel && (
                    <span className="tree-relation-label text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      [{sp.relationLabel}]
                    </span>
                  )}
                </button>
              </React.Fragment>
            ))}

            {/* Contextual Inline +添加配偶 Button (shown when row or its spouse is selected) */}
            {showRowActions && (
              <button
                type="button"
                data-action="add-spouse"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSpouse?.(person.id);
                }}
                className="tree-add-btn inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 group"
              >
                <GenderFigureIcon
                  gender={person.gender === 'male' ? 'female' : 'male'}
                />
                <span className="px-3 py-1 rounded border border-dashed border-primary/65 bg-background/80 group-hover:bg-[hsl(var(--surface-active))] text-primary text-xs font-medium transition-colors">
                  +添加配偶
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Contextual Inline +儿子/+女儿 (Child Branch) & +兄弟/+姐妹 (Peer Level) */}
        {showRowActions && (
          <div className="relative flex items-stretch gap-2.5">
            {/* Continuous vertical trunk for existing children when branch is expanded */}
            {showChildrenBranch && (
              <span
                aria-hidden="true"
                className="absolute left-9 top-0 bottom-0 w-[1.5px]"
                style={{ backgroundColor: 'hsl(var(--border-strong))' }}
              />
            )}

            {/* Left Prefix Spacers matching content-label so node-group columns align pixel-exact */}
            <span className="w-5 shrink-0" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="gen-label text-[12px] font-medium invisible select-none whitespace-nowrap shrink-0 tabular-nums"
            >
              {formatChineseGen(person.generation || 1)}
            </span>

            {/* Dashed Branch & Peer Connector Group aligned to 16px gender icon center (left-[8px]) */}
            <div className="click-tree-sub relative flex flex-col pb-2">
              {/* Sub-row 1: Child Level (+儿子 / +女儿) indented right */}
              <div className="relative pl-10 flex items-center pt-1 pb-1.5">
                {/* Vertical dashed line dropping straight from active person's gender icon */}
                <span
                  aria-hidden="true"
                  className="absolute left-[8px] -top-2.5 bottom-0 w-[1.5px] border-l border-dashed border-sky-500/70 dark:border-sky-400/70"
                />
                {/* Horizontal dashed arm branching right to +儿子/+女儿 */}
                <span
                  aria-hidden="true"
                  className="absolute left-[8px] top-1/2 w-7 h-[1.5px] border-t border-dashed border-sky-500/70 dark:border-sky-400/70"
                />

                <div className="tree-child-add-btn inline-flex items-center gap-1.5">
                  <GenderFigureIcon gender="male" muted />
                  <div className="inline-flex items-center rounded border border-dashed border-sky-500/60 dark:border-sky-400/60 bg-background/80 divide-x divide-dashed divide-sky-500/40 text-xs font-medium">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild?.(person.id, 'male');
                      }}
                      className="px-2.5 py-1 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      +儿子
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddChild?.(person.id, 'female');
                      }}
                      className="px-2.5 py-1 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      +女儿
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-row 2: Peer / Sibling Level (+兄弟 / +姐妹) aligned directly below active node */}
              <div className="relative flex items-center pt-2.5">
                {/* Vertical dashed continuation straight into sibling card icon */}
                <span
                  aria-hidden="true"
                  className="absolute left-[8px] top-0 h-2.5 w-[1.5px] border-l border-dashed border-sky-500/70 dark:border-sky-400/70"
                />

                <div className="tree-siblings-add-btn inline-flex items-center gap-1.5">
                  <GenderFigureIcon gender="male" muted />
                  <div className="inline-flex items-center rounded border border-dashed border-sky-500/60 dark:border-sky-400/60 bg-background/80 divide-x divide-dashed divide-sky-500/40 text-xs font-medium">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSibling?.(person.id, 'male');
                      }}
                      className="px-2.5 py-1 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      +兄弟
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSibling?.(person.id, 'female');
                      }}
                      className="px-2.5 py-1 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      +姐妹
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Children Subtree */}
        {showChildrenBranch && (
          <div className="tree-children relative ml-9 pl-6">
            {children.map((child, idx) =>
              renderBranchNode(child, false, idx === children.length - 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-background">
      {/* Scrollable Archival Tree Canvas */}
      <div
        ref={scrollContainerRef}
        onClick={() => onSelectPerson?.(null)}
        className="w-full h-full overflow-auto nc-dot-grid"
      >
        <div
          className="tree-container min-w-max p-8 sm:p-10 pb-20 origin-top-left transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        >
          {roots.length === 0 ? (
            <div className="py-16 px-8 text-center text-sm text-muted-foreground">
              暂无可展示的世系节点
            </div>
          ) : (
            <div className="space-y-4">
              {roots.map((root) => renderBranchNode(root, true, true))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom-Left Compact Zoom Controls + Floating Toolbar */}
      <div
        data-no-print="true"
        className="absolute bottom-3 left-3 right-3 z-30 flex flex-wrap items-end gap-2 pointer-events-none"
      >
        <div className="pointer-events-auto shrink-0">
          <CanvasZoomBar
            zoom={zoom}
            minZoom={0.65}
            maxZoom={1.5}
            onZoomOut={() =>
              setZoom((z) => Math.max(0.65, +(z - 0.1).toFixed(2)))
            }
            onZoomIn={() =>
              setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))
            }
            onResetZoom={() => setZoom(1)}
          />
        </div>
        {toolbar && <div className="pointer-events-auto max-w-full">{toolbar}</div>}
      </div>
    </div>
  );
};

export default IndentedTreeCanvas;
