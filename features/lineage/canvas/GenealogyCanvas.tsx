import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  useReactFlow,
  useViewport,
  Panel,
  BackgroundVariant,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonRecord } from '../types';
import { PersonNode } from './nodes/PersonNode';
import { BookPersonNode } from './nodes/BookPersonNode';
import { GenHeaderNode } from './nodes/GenHeaderNode';
import { UnionNode } from './nodes/UnionNode';
import { QuickAddNode } from './nodes/QuickAddNode';
import { GenealogyEdge } from './edges/GenealogyEdge';
import { BookGenealogyEdge } from './edges/BookGenealogyEdge';
import { buildGenealogyGraph } from './utils/layoutBuilder';
import { buildBookLtrGenealogyGraph } from './utils/bookLtrLayout';
import { layoutWithElk } from './utils/elkLayout';
import { GenealogyFlowNode, GenealogyFlowEdge } from './types';
import { IndentedTreeCanvas } from './IndentedTreeCanvas';
import { CanvasZoomBar } from './components/CanvasZoomBar';
import {
  Sparkles,
  Plus,
  RotateCcw,
  Map as MapIcon,
  Filter,
  BookOpen,
  Printer,
  Search,
  GripHorizontal,
  LayoutGrid,
  User,
  Crown,
  GitFork,
  ChevronDown,
  X,
} from 'lucide-react';
import { usePreferencesStore } from '../../../store/usePreferencesStore';

type CanvasLayoutMode = 'indented_tree' | 'book_ltr' | 'card_vertical';

const nodeTypes = {
  person: PersonNode,
  bookPerson: BookPersonNode,
  genHeader: GenHeaderNode,
  union: UnionNode,
  quickAdd: QuickAddNode,
};

const edgeTypes = {
  genealogy: GenealogyEdge,
  bookGenealogy: BookGenealogyEdge,
};

interface GenealogyCanvasProps {
  persons: PersonRecord[];
  selectedPersonId?: string | null;
  editingPersonId?: string | null;
  branchTitle?: string;
  clanSurname?: string;
  onSelectPerson?: (id: string | null) => void;
  onAddChild?: (fatherId: string, gender?: 'male' | 'female') => void;
  onAddSibling?: (refPersonId: string, gender?: 'male' | 'female') => void;
  onAddSpouse?: (personId: string) => void;
  onDeletePerson?: (id: string) => void;
  onAddPersonDirectly?: (
    person: Partial<PersonRecord>,
    position?: { x: number; y: number }
  ) => void;
  onUpdatePersonFather?: (childId: string, fatherId: string | null) => void;
  onCommitInlineName?: (
    personId: string,
    name: string,
    openDrawer: boolean
  ) => void;
  onCancelInlineName?: (personId: string) => void;
  maxGenerationFilter?: number;
}

interface ReactFlowCanvasViewProps {
  layoutMode: 'book_ltr' | 'card_vertical';
  filteredPersons: PersonRecord[];
  selectedPersonId?: string | null;
  editingPersonId?: string | null;
  clanSurname?: string;
  showMiniMap: boolean;
  locateNonce: number;
  resetNonce: number;
  elkNonce: number;
  onIsLayoutingChange: (layouting: boolean) => void;
  onSelectPerson?: (id: string | null) => void;
  onAddChild?: (fatherId: string, gender?: 'male' | 'female') => void;
  onAddSibling?: (refPersonId: string, gender?: 'male' | 'female') => void;
  onAddSpouse?: (personId: string) => void;
  onDeletePerson?: (id: string) => void;
  onAddPersonDirectly?: (
    person: Partial<PersonRecord>,
    position?: { x: number; y: number }
  ) => void;
  onUpdatePersonFather?: (childId: string, fatherId: string | null) => void;
  onCommitInlineName?: (
    personId: string,
    name: string,
    openDrawer: boolean
  ) => void;
  onCancelInlineName?: (personId: string) => void;
  toolbar?: React.ReactNode;
}

const ReactFlowCanvasView: React.FC<ReactFlowCanvasViewProps> = ({
  layoutMode,
  filteredPersons,
  selectedPersonId,
  editingPersonId = null,
  clanSurname = '',
  showMiniMap,
  locateNonce,
  resetNonce,
  elkNonce,
  onIsLayoutingChange,
  onSelectPerson,
  onAddChild,
  onAddSibling,
  onAddSpouse,
  onDeletePerson,
  onAddPersonDirectly,
  onUpdatePersonFather,
  onCommitInlineName,
  onCancelInlineName,
  toolbar,
}) => {
  const reactFlow = useReactFlow();
  const { zoom } = useViewport();
  const isDarkMode = usePreferencesStore((state) => state.isDarkMode);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    new Set()
  );

  // Auto-expand collapsed ancestors if an inline-edited node is placed beneath them
  useEffect(() => {
    if (!editingPersonId) return;
    const pMap = new Map<string, PersonRecord>();
    filteredPersons.forEach((p) => pMap.set(p.id, p));
    const toExpand: string[] = [];
    let curr = pMap.get(editingPersonId);
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
      setCollapsedNodeIds((prev) => {
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
  }, [editingPersonId, filteredPersons]);

  const handleToggleCollapse = useCallback((personId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }, []);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (layoutMode === 'book_ltr') {
      const res = buildBookLtrGenealogyGraph(filteredPersons, {
        selectedPersonId,
        editingPersonId,
        clanSurname,
        collapsedNodeIds,
        onToggleCollapse: handleToggleCollapse,
        onSelectPerson,
        onAddChild,
        onAddSpouse,
        onDeletePerson,
        onCommitInlineName,
        onCancelInlineName,
        colWidth: 196,
        rowHeight: 64,
        startX: 60,
        startY: 110,
      });
      return {
        initialNodes: res.nodes,
        initialEdges: res.edges,
      };
    } else {
      const res = buildGenealogyGraph(filteredPersons, {
        selectedPersonId,
        editingPersonId,
        clanSurname,
        collapsedNodeIds,
        onToggleCollapse: handleToggleCollapse,
        onSelectPerson,
        onAddChild,
        onAddSibling,
        onAddSpouse,
        onDeletePerson,
        onCommitInlineName,
        onCancelInlineName,
      });
      return {
        initialNodes: res.nodes,
        initialEdges: res.edges,
      };
    }
  }, [
    filteredPersons,
    layoutMode,
    selectedPersonId,
    editingPersonId,
    clanSurname,
    collapsedNodeIds,
    handleToggleCollapse,
    onSelectPerson,
    onAddChild,
    onAddSibling,
    onAddSpouse,
    onDeletePerson,
    onCommitInlineName,
    onCancelInlineName,
  ]);

  const [nodes, setNodes, onNodesChange] =
    useNodesState<GenealogyFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<GenealogyFlowEdge>(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    let rafId = 0;
    const timer = setTimeout(() => {
      rafId = requestAnimationFrame(() => {
        reactFlow.fitView({ padding: 0.15, duration: 400 });
      });
    }, 150);
    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [filteredPersons.length, layoutMode, resetNonce, reactFlow]);

  useEffect(() => {
    if (locateNonce === 0 || !selectedPersonId) return;
    const match = nodes.find((n) => n.id === selectedPersonId);
    if (match) {
      reactFlow.setCenter(match.position.x, match.position.y, {
        duration: 600,
        zoom: 1.1,
      });
    }
  }, [locateNonce, selectedPersonId, nodes, reactFlow]);

  useEffect(() => {
    if (elkNonce === 0) return;
    let cancelled = false;
    const run = async () => {
      onIsLayoutingChange(true);
      try {
        const layoutedNodes = await layoutWithElk(nodes, edges);
        if (!cancelled) {
          setNodes(layoutedNodes);
          setTimeout(() => {
            reactFlow.fitView({ padding: 0.15, duration: 500 });
          }, 50);
        }
      } catch (e) {
        console.error('Auto-layout error:', e);
      } finally {
        if (!cancelled) onIsLayoutingChange(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elkNonce]);

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (connection.source === connection.target) return false;
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      const sourceGen =
        (sourceNode.data as { person?: { generation?: number }; generation?: number })
          ?.person?.generation ||
        (sourceNode.data as { generation?: number })?.generation;
      const targetGen =
        (targetNode.data as { person?: { generation?: number }; generation?: number })
          ?.person?.generation ||
        (targetNode.data as { generation?: number })?.generation;
      if (sourceGen && targetGen) {
        return sourceGen < targetGen;
      }
      return true;
    },
    [nodes]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const edgeType = layoutMode === 'book_ltr' ? 'bookGenealogy' : 'genealogy';
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: edgeType,
            data: { relationship: 'bloodline' },
          },
          eds
        )
      );
      if (connection.source && connection.target && onUpdatePersonFather) {
        onUpdatePersonFather(connection.target, connection.source);
      }
    },
    [setEdges, layoutMode, onUpdatePersonFather]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const rawData = event.dataTransfer.getData(
        'application/genealogy-template'
      );
      const templateData = rawData ? JSON.parse(rawData) : null;
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let calculatedGeneration = 1;
      if (layoutMode === 'book_ltr') {
        calculatedGeneration = templateData?.isRoot
          ? 1
          : Math.max(1, Math.floor((position.x - 60) / 140) + 1);
      } else {
        calculatedGeneration = templateData?.isRoot
          ? 1
          : Math.max(1, Math.floor(position.y / 240) + 1);
      }

      if (onAddPersonDirectly) {
        onAddPersonDirectly(
          {
            name: templateData?.name || '新录族人',
            gender: templateData?.gender || 'male',
            generation: calculatedGeneration,
            rank: templateData?.rank,
          },
          position
        );
      }
    },
    [reactFlow, layoutMode, onAddPersonDirectly]
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={() => onSelectPerson?.(null)}
        minZoom={0.2}
        maxZoom={2.8}
        defaultViewport={{ x: 60, y: 60, zoom: 0.9 }}
        className="touch-none bg-background"
      >
        <Background
          variant={
            layoutMode === 'book_ltr'
              ? BackgroundVariant.Lines
              : BackgroundVariant.Dots
          }
          gap={layoutMode === 'book_ltr' ? 140 : 24}
          size={1}
          color="hsl(var(--border))"
          className="opacity-70 dark:opacity-35"
        />

        {showMiniMap && (
          <MiniMap
            position="top-right"
            nodeColor={(node: Node) => {
              if (node.type === 'union') return 'hsl(var(--border-strong))';
              if (node.type === 'quickAdd') return 'hsl(var(--primary) / 0.45)';
              if (node.id === selectedPersonId) return 'hsl(var(--primary))';
              const gen =
                (node.data as { person?: { generation?: number } })?.person
                  ?.generation || 1;
              if (gen === 1) return 'hsl(var(--primary))';
              return isDarkMode ? '#52525b' : '#a1a1aa';
            }}
            nodeStrokeWidth={2}
            className="!bg-card/90 !backdrop-blur !border-border !rounded-lg !shadow-md !w-44 !h-32"
          />
        )}

        {/* BOTTOM-RIGHT: DRAG & DROP QUICK CREATION PALETTE */}
        <Panel
          position="bottom-right"
          className="m-3 flex flex-col gap-1 z-20"
        >
          <div
            data-no-print="true"
            className="bg-card/92 backdrop-blur-md border border-border rounded-xl p-2 shadow-[var(--shadow-popover)]"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-foreground pb-1.5 border-b border-border/60 mb-1.5">
              <span className="flex items-center gap-1">
                <GripHorizontal size={11} className="text-primary" />
                拖拽录入族人
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Male Template */}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/genealogy-template',
                    JSON.stringify({
                      name: '新男丁',
                      gender: 'male',
                      rank: '长子',
                    })
                  );
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 hover:bg-muted border border-border/70 cursor-grab active:cursor-grabbing text-xs text-foreground transition-all hover:border-primary/50 whitespace-nowrap"
              >
                <User size={11} className="text-primary" />
                <span>男丁</span>
                <Plus size={10} className="text-muted-foreground" />
              </div>

              {/* Female Template */}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/genealogy-template',
                    JSON.stringify({
                      name: '新女眷',
                      gender: 'female',
                      rank: '长女',
                    })
                  );
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 hover:bg-muted border border-border/70 cursor-grab active:cursor-grabbing text-xs text-foreground transition-all hover:border-pink-500/50 whitespace-nowrap"
              >
                <User size={11} className="text-pink-500" />
                <span>女眷</span>
                <Plus size={10} className="text-muted-foreground" />
              </div>

              {/* Root Ancestor */}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/genealogy-template',
                    JSON.stringify({
                      name: '新立始祖',
                      gender: 'male',
                      isRoot: true,
                      generation: 1,
                    })
                  );
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-accent hover:bg-accent/80 border border-border cursor-grab active:cursor-grabbing text-xs text-foreground transition-all whitespace-nowrap"
              >
                <Crown size={11} className="text-primary" />
                <span>始祖</span>
                <Plus size={10} className="text-primary" />
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Bottom-Left Compact Zoom Controls + Floating Toolbar */}
      <div
        data-no-print="true"
        className="absolute bottom-3 left-3 right-3 sm:right-[244px] z-30 flex flex-wrap items-end gap-2 pointer-events-none"
      >
        <div className="pointer-events-auto shrink-0">
          <CanvasZoomBar
            zoom={zoom}
            minZoom={0.2}
            maxZoom={2.8}
            onZoomOut={() => reactFlow.zoomOut({ duration: 150 })}
            onZoomIn={() => reactFlow.zoomIn({ duration: 150 })}
            onResetZoom={() => reactFlow.zoomTo(1, { duration: 200 })}
          />
        </div>
        {toolbar && <div className="pointer-events-auto max-w-full">{toolbar}</div>}
      </div>
    </div>
  );
};

export const GenealogyCanvas: React.FC<GenealogyCanvasProps> = ({
  persons,
  selectedPersonId,
  editingPersonId = null,
  clanSurname = '',
  onSelectPerson,
  onAddChild,
  onAddSibling,
  onAddSpouse,
  onDeletePerson,
  onAddPersonDirectly,
  onUpdatePersonFather,
  onCommitInlineName,
  onCancelInlineName,
  maxGenerationFilter = 99,
}) => {
  const [layoutMode, setLayoutMode] =
    useState<CanvasLayoutMode>('indented_tree');
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [activeGenFilter, setActiveGenFilter] =
    useState<number>(maxGenerationFilter);
  const [isLayouting, setIsLayouting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locateNonce, setLocateNonce] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);
  const [elkNonce, setElkNonce] = useState(0);

  const filteredPersons = useMemo(() => {
    return persons.filter((p) => (p.generation || 1) <= activeGenFilter);
  }, [persons, activeGenFilter]);

  const handleSearchLocate = (query: string) => {
    setSearchQuery(query);
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = filteredPersons.find((p) => {
      const surname = p.surname?.trim() || (p.spouseOfId ? '' : clanSurname);
      const fullName =
        surname && !p.name.startsWith(surname) ? `${surname}${p.name}` : p.name;
      return (
        p.name.toLowerCase().includes(q) ||
        fullName.toLowerCase().includes(q) ||
        (p.courtesyName || '').toLowerCase().includes(q)
      );
    });
    if (match) {
      onSelectPerson?.(match.id);
      setLocateNonce((n) => n + 1);
    }
  };

  const maxGen = Math.max(...persons.map((p) => p.generation || 1), 1);

  const floatingToolbar = (
    <div
      data-no-print="true"
      className="flex flex-wrap items-center gap-1 bg-card/92 backdrop-blur-md border border-border rounded-xl p-1 shadow-[var(--shadow-popover)]"
    >
      {/* Quick Search */}
      <div className="relative w-36 md:w-44">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/80"
          size={12}
        />
        <input
          type="text"
          placeholder="搜姓名或字号定位..."
          value={searchQuery}
          onChange={(e) => handleSearchLocate(e.target.value)}
          className="w-full h-7 pl-7 pr-6 py-1 bg-[hsl(var(--surface-subtle))]/70 border border-transparent rounded-lg text-xs text-foreground placeholder:text-placeholder placeholder:font-normal outline-none focus:bg-card focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="清空搜索"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] cursor-pointer"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <span
        aria-hidden="true"
        className="hidden sm:block h-4 w-px bg-border/80 mx-0.5 shrink-0"
      />

      {/* 3-Way Layout Mode Switcher */}
      <div
        role="tablist"
        aria-label="画布视图切换"
        className="flex items-center bg-[hsl(var(--surface-subtle))] rounded-lg p-0.5 gap-0.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={layoutMode === 'indented_tree'}
          onClick={() => setLayoutMode('indented_tree')}
          className={`h-6 px-2.5 rounded-md text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            layoutMode === 'indented_tree'
              ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/60'
              : 'text-muted-foreground font-medium hover:text-foreground'
          }`}
          title="默认树形视图：按世系缩进展开，支持折叠枝干与行内快捷添丁"
        >
          <GitFork
            size={12}
            className={
              layoutMode === 'indented_tree' ? 'text-primary' : undefined
            }
          />
          <span>树形视图</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={layoutMode === 'book_ltr'}
          onClick={() => setLayoutMode('book_ltr')}
          className={`h-6 px-2.5 rounded-md text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            layoutMode === 'book_ltr'
              ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/60'
              : 'text-muted-foreground font-medium hover:text-foreground'
          }`}
          title="现代书籍阅读习惯：欧式世系图（从左至右 横向排版）"
        >
          <BookOpen
            size={12}
            className={layoutMode === 'book_ltr' ? 'text-primary' : undefined}
          />
          <span>欧式图谱</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={layoutMode === 'card_vertical'}
          onClick={() => setLayoutMode('card_vertical')}
          className={`h-6 px-2.5 rounded-md text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            layoutMode === 'card_vertical'
              ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/60'
              : 'text-muted-foreground font-medium hover:text-foreground'
          }`}
          title="现代卡片式（纵向层级树）"
        >
          <LayoutGrid
            size={12}
            className={
              layoutMode === 'card_vertical' ? 'text-primary' : undefined
            }
          />
          <span>卡片树</span>
        </button>
      </div>

      <span
        aria-hidden="true"
        className="hidden sm:block h-4 w-px bg-border/80 mx-0.5 shrink-0"
      />

      {/* Contextual Tools & Generation Filter */}
      <div className="flex items-center gap-1">
        {layoutMode === 'card_vertical' && (
          <button
            type="button"
            onClick={() => setElkNonce((n) => n + 1)}
            disabled={isLayouting}
            className="h-7 px-2.5 rounded-lg text-xs bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 flex items-center gap-1 font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles
              size={12}
              className={isLayouting ? 'animate-spin' : ''}
            />
            <span>{isLayouting ? '排版中' : 'ELK排版'}</span>
          </button>
        )}

        {/* Generation Range Filter */}
        <div className="relative flex items-center h-7 rounded-lg px-2 hover:bg-[hsl(var(--surface-hover))]/65 transition-colors">
          <Filter size={12} className="text-primary shrink-0 mr-1.5" />
          <select
            aria-label="世代范围筛选"
            value={activeGenFilter}
            onChange={(e) => setActiveGenFilter(Number(e.target.value))}
            className="appearance-none bg-transparent border-none text-foreground font-medium outline-none text-xs cursor-pointer tabular-nums pr-4"
          >
            <option value={99} className="bg-card text-foreground">
              全部世代 ({maxGen}世)
            </option>
            {Array.from({ length: maxGen }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g} className="bg-card text-foreground">
                前 {g} 世
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            aria-hidden="true"
            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
        </div>

        <span
          aria-hidden="true"
          className="h-4 w-px bg-border/70 mx-0.5 shrink-0"
        />

        {/* Fit / Reset View */}
        <button
          type="button"
          onClick={() => setResetNonce((n) => n + 1)}
          className="h-7 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
          title="居中重置视图"
        >
          <RotateCcw size={12} />
          <span>居中</span>
        </button>

        {/* Print / Export */}
        <button
          type="button"
          onClick={() => window.print()}
          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors flex items-center justify-center cursor-pointer shrink-0"
          title="打印世系图"
          aria-label="打印世系图"
        >
          <Printer size={13} />
        </button>

        {/* Toggle MiniMap (ReactFlow modes only) */}
        {layoutMode !== 'indented_tree' && (
          <button
            type="button"
            onClick={() => setShowMiniMap(!showMiniMap)}
            className={`h-7 w-7 rounded-lg transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
              showMiniMap
                ? 'bg-[hsl(var(--surface-active))] text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))]'
            }`}
            title="切换小地图"
            aria-label="切换小地图"
          >
            <MapIcon size={13} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full relative overflow-hidden bg-background text-foreground select-none">
      {/* Active Canvas Surface */}
      {layoutMode === 'indented_tree' ? (
        <IndentedTreeCanvas
          persons={filteredPersons}
          allPersons={persons}
          selectedPersonId={selectedPersonId}
          editingPersonId={editingPersonId}
          clanSurname={clanSurname}
          searchQuery={searchQuery}
          locateNonce={locateNonce}
          resetNonce={resetNonce}
          onSelectPerson={onSelectPerson}
          onAddChild={onAddChild}
          onAddSibling={onAddSibling}
          onAddSpouse={onAddSpouse}
          onCommitInlineName={onCommitInlineName}
          onCancelInlineName={onCancelInlineName}
          toolbar={floatingToolbar}
        />
      ) : (
        <ReactFlowProvider>
          <ReactFlowCanvasView
            layoutMode={layoutMode}
            filteredPersons={filteredPersons}
            selectedPersonId={selectedPersonId}
            editingPersonId={editingPersonId}
            clanSurname={clanSurname}
            showMiniMap={showMiniMap}
            locateNonce={locateNonce}
            resetNonce={resetNonce}
            elkNonce={elkNonce}
            onIsLayoutingChange={setIsLayouting}
            onSelectPerson={onSelectPerson}
            onAddChild={onAddChild}
            onAddSibling={onAddSibling}
            onAddSpouse={onAddSpouse}
            onDeletePerson={onDeletePerson}
            onAddPersonDirectly={onAddPersonDirectly}
            onUpdatePersonFather={onUpdatePersonFather}
            onCommitInlineName={onCommitInlineName}
            onCancelInlineName={onCancelInlineName}
            toolbar={floatingToolbar}
          />
        </ReactFlowProvider>
      )}
    </div>
  );
};

export default GenealogyCanvas;
