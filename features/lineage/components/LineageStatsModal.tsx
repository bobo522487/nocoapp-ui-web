import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { findItemDeep } from '../../../components/common/Tree/utilities';
import {
  DEFAULT_LINEAGE_TREE,
  findFirstChartId,
  makeChartStorageKey,
  useLineageStore,
} from '../../../store/useLineageStore';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import { createSeedPersonsForChart } from '../lineageData';
import {
  computeLineageStats,
  flattenChartsInTree,
  formatStatPct,
} from '../utils/lineageStats';

export type StatsScope = 'chart' | 'project';

interface LineageStatsModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
}

export const LineageStatsModal: React.FC<LineageStatsModalProps> = ({
  open,
  projectId,
  onClose,
}) => {
  const [scope, setScope] = useState<StatsScope>('chart');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const projects = useWorkspaceStore((s) => s.projects);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const treesByProject = useLineageStore((s) => s.treesByProject);
  const selectedNodeIdByProject = useLineageStore(
    (s) => s.selectedNodeIdByProject
  );
  const personsByChart = useLineageStore((s) => s.personsByChart);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const activeProject =
    projects.find((p) => p.id === projectId) ||
    projects.find((p) => p.workspaceId === activeWorkspaceId) ||
    projects[0];

  const lineageTree = useMemo(
    () => treesByProject[projectId] || DEFAULT_LINEAGE_TREE,
    [treesByProject, projectId]
  );

  const allCharts = useMemo(
    () => flattenChartsInTree(lineageTree),
    [lineageTree]
  );

  const defaultChartId = useMemo(
    () =>
      findFirstChartId(lineageTree) ||
      String(allCharts[0]?.chartId || 'lineage-royal-1'),
    [lineageTree, allCharts]
  );

  const selectedNodeId = selectedNodeIdByProject[projectId] ?? defaultChartId;
  const selectedNode = useMemo(
    () => findItemDeep(lineageTree, selectedNodeId),
    [lineageTree, selectedNodeId]
  );

  const activeChart = useMemo(() => {
    if (selectedNode?.type === 'chart') {
      return (
        allCharts.find((c) => c.chartId === String(selectedNode.id)) || {
          chartId: String(selectedNode.id),
          chartName: selectedNode.data?.name || '世系图谱',
          index: 1,
        }
      );
    }
    return (
      allCharts.find((c) => c.chartId === defaultChartId) ||
      allCharts[0] || {
        chartId: defaultChartId,
        chartName: '世系图谱',
        index: 1,
      }
    );
  }, [selectedNode, allCharts, defaultChartId]);

  const resolveChartSurname = (chartId: string) => {
    if (chartId.startsWith('lineage-royal-')) return '刘';
    if (
      chartId.startsWith('lineage-other-') ||
      chartId.startsWith('lineage-ancestor-')
    ) {
      return '';
    }
    return activeProject?.primarySurname || '';
  };

  const stats = useMemo(() => {
    if (scope === 'chart') {
      const key = makeChartStorageKey(projectId, activeChart.chartId);
      const persons =
        personsByChart[key] ||
        createSeedPersonsForChart(
          activeChart.chartId,
          activeChart.chartName,
          resolveChartSurname(activeChart.chartId)
        );
      return computeLineageStats(persons, 1);
    }

    const allPersons = allCharts.flatMap((chart) => {
      const key = makeChartStorageKey(projectId, chart.chartId);
      return (
        personsByChart[key] ||
        createSeedPersonsForChart(
          chart.chartId,
          chart.chartName,
          resolveChartSurname(chart.chartId)
        )
      );
    });
    return computeLineageStats(allPersons, allCharts.length);
  }, [scope, projectId, activeChart, allCharts, personsByChart, activeProject?.primarySurname]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-3 sm:p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="深度统计图表"
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col bg-background text-foreground border border-border shadow-2xl overflow-hidden transition-all duration-150 ${
          isFullscreen
            ? 'w-full h-full rounded-lg'
            : 'w-full max-w-[1160px] max-h-[92vh] rounded-xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-sky-500/12 text-sky-600 dark:text-sky-400 text-[12px] font-semibold border border-sky-500/25 whitespace-nowrap shrink-0">
              {scope === 'chart' ? '世系' : '宗谱'}
            </span>
            <span className="text-[14px] font-bold text-foreground tabular-nums whitespace-nowrap shrink-0">
              {scope === 'chart' ? activeChart.index : `${stats.chartCount} 卷`}
            </span>
            <span className="text-border select-none">|</span>
            <h2 className="text-[13px] sm:text-[14px] font-medium text-muted-foreground truncate">
              深度统计图表 · 男丁女丁与婚嫁分析
              {scope === 'chart' && activeChart.chartName
                ? `（${activeChart.chartName}）`
                : activeProject?.name
                  ? `（${activeProject.name}）`
                  : ''}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Scope Toggle: Current Chart vs Whole Project */}
            <div
              role="tablist"
              aria-label="统计范围"
              className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[hsl(var(--surface-subtle))] border border-border"
            >
              <button
                type="button"
                role="tab"
                aria-selected={scope === 'chart'}
                onClick={() => setScope('chart')}
                className={`h-7 px-2.5 rounded-md text-[12px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  scope === 'chart'
                    ? 'bg-card text-foreground font-semibold shadow-xs border border-border/60'
                    : 'text-muted-foreground font-medium hover:text-foreground'
                }`}
              >
                当前世系图
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scope === 'project'}
                onClick={() => setScope('project')}
                className={`h-7 px-2.5 rounded-md text-[12px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  scope === 'project'
                    ? 'bg-card text-foreground font-semibold shadow-xs border border-border/60'
                    : 'text-muted-foreground font-medium hover:text-foreground'
                }`}
              >
                整本宗谱
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen((v) => !v)}
              title={isFullscreen ? '还原窗口' : '全屏查看'}
              aria-label={isFullscreen ? '还原窗口' : '全屏查看'}
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              title="关闭"
              aria-label="关闭统计弹窗"
              className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[hsl(var(--surface-subtle))]/50">
          {/* Row 1: 5 KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Card 1: Total Entered Persons */}
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-primary/25 bg-primary/[0.08] p-4 flex flex-col justify-between min-h-[126px]">
              <div className="text-[13px] font-semibold text-primary">
                录入总人数
              </div>
              <div className="text-[34px] leading-none font-bold text-primary tabular-nums mt-3">
                {stats.totalPersons}
              </div>
            </div>

            {/* Card 2: Male Count */}
            <div className="rounded-xl border border-border border-t-2 border-t-sky-500 bg-card p-3.5 flex flex-col justify-between min-h-[126px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-foreground truncate">
                  男性人数（人）
                </span>
                <span className="px-1.5 py-0.5 rounded bg-sky-500/12 text-sky-600 dark:text-sky-400 text-[11px] font-semibold tabular-nums shrink-0">
                  {formatStatPct(stats.allMaleCount, stats.totalPersons, 2)}
                </span>
              </div>
              <div className="text-[26px] leading-tight font-bold text-foreground tabular-nums my-2">
                {stats.allMaleCount}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-[12px] text-muted-foreground tabular-nums">
                <span>
                  健在 <strong className="text-foreground">{stats.allMaleLiving}</strong>
                </span>
                <span>
                  已故 <strong className="text-foreground">{stats.allMaleDeceased}</strong>
                </span>
              </div>
            </div>

            {/* Card 3: Female Count */}
            <div className="rounded-xl border border-border border-t-2 border-t-rose-400 bg-card p-3.5 flex flex-col justify-between min-h-[126px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-foreground truncate">
                  女性人数（人）
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/12 text-rose-600 dark:text-rose-400 text-[11px] font-semibold tabular-nums shrink-0">
                  {formatStatPct(stats.allFemaleCount, stats.totalPersons, 2)}
                </span>
              </div>
              <div className="text-[26px] leading-tight font-bold text-foreground tabular-nums my-2">
                {stats.allFemaleCount}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-[12px] text-muted-foreground tabular-nums">
                <span>
                  健在 <strong className="text-foreground">{stats.allFemaleLiving}</strong>
                </span>
                <span>
                  已故 <strong className="text-foreground">{stats.allFemaleDeceased}</strong>
                </span>
              </div>
            </div>

            {/* Card 4: Living Count */}
            <div className="rounded-xl border border-border border-t-2 border-t-emerald-500 bg-card p-3.5 flex flex-col justify-between min-h-[126px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-foreground truncate">
                  健在人数（人）
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold tabular-nums shrink-0">
                  {formatStatPct(stats.livingCount, stats.totalPersons, 2)}
                </span>
              </div>
              <div className="text-[26px] leading-tight font-bold text-foreground tabular-nums my-2">
                {stats.livingCount}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-[12px] text-muted-foreground tabular-nums">
                <span>
                  男性 <strong className="text-foreground">{stats.allMaleLiving}</strong>
                </span>
                <span>
                  女性 <strong className="text-foreground">{stats.allFemaleLiving}</strong>
                </span>
              </div>
            </div>

            {/* Card 5: Deceased Count */}
            <div className="rounded-xl border border-border border-t-2 border-t-slate-400 bg-card p-3.5 flex flex-col justify-between min-h-[126px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-foreground truncate">
                  已故人数（个）
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-500/12 text-slate-600 dark:text-slate-300 text-[11px] font-semibold tabular-nums shrink-0">
                  {formatStatPct(stats.deceasedCount, stats.totalPersons, 2)}
                </span>
              </div>
              <div className="text-[26px] leading-tight font-bold text-foreground tabular-nums my-2">
                {stats.deceasedCount}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-[12px] text-muted-foreground tabular-nums">
                <span>
                  男性 <strong className="text-foreground">{stats.allMaleDeceased}</strong>
                </span>
                <span>
                  女性 <strong className="text-foreground">{stats.allFemaleDeceased}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Male & Female Lineage Member Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Male Lineage Analysis */}
            <section className="rounded-xl border border-border bg-card p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full bg-sky-500/80 shrink-0" />
                <h3 className="text-[14px] font-semibold text-foreground">
                  男丁分析（非配偶节点男性）
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
                <div className="rounded-lg bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/35 p-4 flex flex-col justify-between min-h-[136px]">
                  <div className="text-[12px] font-semibold text-sky-900 dark:text-sky-200">
                    男丁总数（人）
                  </div>
                  <div className="text-[28px] font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                    {stats.maleCount}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <SubMetricTile
                    label="健在男丁"
                    value={stats.maleLiving}
                    pct={formatStatPct(stats.maleLiving, stats.maleCount, 2)}
                  />
                  <SubMetricTile
                    label="已故男丁"
                    value={stats.maleDeceased}
                    pct={formatStatPct(stats.maleDeceased, stats.maleCount, 2)}
                  />
                  <SubMetricTile
                    label="健在已婚"
                    value={stats.maleLivingMarried}
                    pct={formatStatPct(stats.maleLivingMarried, stats.maleCount, 2)}
                  />
                  <SubMetricTile
                    label="健在未婚"
                    value={stats.maleLivingUnmarried}
                    pct={formatStatPct(stats.maleLivingUnmarried, stats.maleCount, 2)}
                  />
                </div>
              </div>
            </section>

            {/* Female Lineage Analysis */}
            <section className="rounded-xl border border-border bg-card p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full bg-rose-400/85 shrink-0" />
                <h3 className="text-[14px] font-semibold text-foreground">
                  女丁分析（非配偶节点女性）
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
                <div className="rounded-lg bg-rose-50/75 dark:bg-rose-950/25 border border-rose-200/50 dark:border-rose-800/35 p-4 flex flex-col justify-between min-h-[136px]">
                  <div className="text-[12px] font-semibold text-rose-900 dark:text-rose-200">
                    女丁总数（人）
                  </div>
                  <div className="text-[28px] font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                    {stats.femaleCount}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <SubMetricTile
                    label="健在女丁"
                    value={stats.femaleLiving}
                    pct={formatStatPct(stats.femaleLiving, stats.femaleCount, 0)}
                  />
                  <SubMetricTile
                    label="已故女丁"
                    value={stats.femaleDeceased}
                    pct={formatStatPct(stats.femaleDeceased, stats.femaleCount, 0)}
                  />
                  <SubMetricTile
                    label="健在已出嫁"
                    value={stats.femaleLivingMarried}
                    pct={formatStatPct(stats.femaleLivingMarried, stats.femaleCount, 0)}
                  />
                  <SubMetricTile
                    label="健在未出嫁"
                    value={stats.femaleLivingUnmarried}
                    pct={formatStatPct(stats.femaleLivingUnmarried, stats.femaleCount, 0)}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Row 3: Daughter-in-law & Son-in-law Spouse Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daughter-in-law Analysis */}
            <section className="rounded-xl border border-border bg-card p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full bg-rose-400/85 shrink-0" />
                <h3 className="text-[14px] font-semibold text-foreground">
                  儿媳分析（男丁配偶）
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
                <div className="rounded-lg bg-rose-50/75 dark:bg-rose-950/25 border border-rose-200/50 dark:border-rose-800/35 p-4 flex flex-col justify-between min-h-[136px]">
                  <div className="text-[12px] font-semibold text-rose-900 dark:text-rose-200">
                    儿媳总数（人）
                  </div>
                  <div className="text-[28px] font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                    {stats.daughterInLawCount}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 justify-between">
                  <SubMetricTile
                    label="健在儿媳"
                    value={stats.daughterInLawLiving}
                    pct={formatStatPct(
                      stats.daughterInLawLiving,
                      stats.daughterInLawCount,
                      0
                    )}
                  />
                  <SubMetricTile
                    label="已故儿媳"
                    value={stats.daughterInLawDeceased}
                    pct={formatStatPct(
                      stats.daughterInLawDeceased,
                      stats.daughterInLawCount,
                      0
                    )}
                  />
                </div>
              </div>
            </section>

            {/* Son-in-law Analysis */}
            <section className="rounded-xl border border-border bg-card p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full bg-sky-500/80 shrink-0" />
                <h3 className="text-[14px] font-semibold text-foreground">
                  女婿分析（女丁配偶）
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
                <div className="rounded-lg bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/50 dark:border-sky-800/35 p-4 flex flex-col justify-between min-h-[136px]">
                  <div className="text-[12px] font-semibold text-sky-900 dark:text-sky-200">
                    女婿总数（人）
                  </div>
                  <div className="text-[28px] font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                    {stats.sonInLawCount}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 justify-between">
                  <SubMetricTile
                    label="健在女婿"
                    value={stats.sonInLawLiving}
                    pct={formatStatPct(stats.sonInLawLiving, stats.sonInLawCount, 0)}
                  />
                  <SubMetricTile
                    label="已故女婿"
                    value={stats.sonInLawDeceased}
                    pct={formatStatPct(stats.sonInLawDeceased, stats.sonInLawCount, 0)}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface SubMetricTileProps {
  label: string;
  value: number;
  pct: string;
}

const SubMetricTile: React.FC<SubMetricTileProps> = ({ label, value, pct }) => (
  <div className="rounded-lg bg-[hsl(var(--surface-subtle))] border border-border/60 px-3.5 py-2.5 flex flex-col justify-between min-h-[64px]">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-muted-foreground truncate">{label}</span>
      <span className="px-1.5 py-0.5 rounded bg-background/80 border border-border/60 text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
        {pct}
      </span>
    </div>
    <div className="text-[20px] font-bold text-foreground tabular-nums leading-tight mt-1">
      {value}
    </div>
  </div>
);
