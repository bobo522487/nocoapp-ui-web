import React, { useMemo, useState } from 'react';
import { Folder, FolderOpen, FolderPlus, GitFork, Plus } from 'lucide-react';
import { Tree } from '../../../components/common/Tree/Tree';
import { FlattenedItem } from '../../../components/common/Tree/types';
import { findItemDeep } from '../../../components/common/Tree/utilities';
import { useProjectId } from '../../../hooks/useProjectId';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import {
  DEFAULT_LINEAGE_TREE,
  findFirstChartId,
  LineageChartMeta,
  makeChartStorageKey,
  useLineageStore,
} from '../../../store/useLineageStore';
import { createSeedPersonsForChart } from '../../lineage/lineageData';
import { parsePlaceText } from '../../place-input';
import { LineageEditorModal } from './LineageEditorModal';

interface LineageModalState {
  open: boolean;
  mode: 'create' | 'edit';
  parentId?: string;
  chartId?: string;
  initialValue?: Partial<LineageChartMeta>;
}

export const LineageTreePanel: React.FC = () => {
  const activeProjectId = useProjectId();

  const projects = useWorkspaceStore((s) => s.projects);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeProject =
    projects.find((p) => p.id === activeProjectId) ||
    projects.find((p) => p.workspaceId === activeWorkspaceId) ||
    projects[0];

  const treesByProject = useLineageStore((s) => s.treesByProject);
  const selectedNodeIdByProject = useLineageStore(
    (s) => s.selectedNodeIdByProject
  );
  const personsByChart = useLineageStore((s) => s.personsByChart);
  const setTree = useLineageStore((s) => s.setTree);
  const selectNode = useLineageStore((s) => s.selectNode);
  const addGroup = useLineageStore((s) => s.addGroup);
  const addChart = useLineageStore((s) => s.addChart);
  const updateChartMeta = useLineageStore((s) => s.updateChartMeta);
  const renameNode = useLineageStore((s) => s.renameNode);
  const duplicateNode = useLineageStore((s) => s.duplicateNode);
  const removeNode = useLineageStore((s) => s.removeNode);

  const [modalState, setModalState] = useState<LineageModalState>({
    open: false,
    mode: 'create',
  });

  const treeItems = useMemo(
    () => treesByProject[activeProjectId] || DEFAULT_LINEAGE_TREE,
    [treesByProject, activeProjectId]
  );

  const activeNodeId =
    selectedNodeIdByProject[activeProjectId] ??
    (findFirstChartId(treeItems) || String(treeItems[0]?.id || 'lineage-group-royal'));

  const handleSelect = (item: FlattenedItem) => {
    selectNode(activeProjectId, String(item.id));
  };

  const openCreateModal = (parentId?: string) => {
    setModalState({
      open: true,
      mode: 'create',
      parentId,
      initialValue: {
        name: '',
        surname: activeProject?.primarySurname || '',
        hallName: activeProject?.primaryName || '',
        progenitor: '',
        region: null,
      },
    });
  };

  const openEditModal = (chartId: string) => {
    const node = findItemDeep(treeItems, chartId);
    if (!node) return;
    const key = makeChartStorageKey(activeProjectId, chartId);
    const fallbackSurname =
      node.data?.surname !== undefined
        ? node.data.surname
        : chartId.startsWith('lineage-royal-')
          ? '刘'
          : chartId.startsWith('lineage-other-') ||
              chartId.startsWith('lineage-ancestor-')
            ? ''
            : activeProject?.primarySurname || '';
    const persons =
      personsByChart[key] ||
      createSeedPersonsForChart(chartId, node.data?.name, fallbackSurname);
    const rootPerson =
      persons.find((p) => p.generation === 1 && !p.fatherId && !p.motherId) ||
      persons[0];

    setModalState({
      open: true,
      mode: 'edit',
      chartId,
      initialValue: {
        name: node.data?.name || '',
        surname: fallbackSurname,
        hallName: node.data?.hallName || '',
        progenitor: node.data?.progenitor || rootPerson?.name || '',
        region: parsePlaceText(node.data?.region) ?? null,
      },
    });
  };

  const handleModalSubmit = (values: LineageChartMeta) => {
    if (modalState.mode === 'create') {
      addChart(activeProjectId, modalState.parentId, values);
    } else if (modalState.chartId) {
      updateChartMeta(activeProjectId, modalState.chartId, values);
    }
    setModalState((prev) => ({ ...prev, open: false }));
  };

  const renderIcon = (item: FlattenedItem) => {
    if (item.type === 'folder') {
      return item.collapsed ? (
        <Folder size={15} className="text-primary/85" />
      ) : (
        <FolderOpen size={15} className="text-primary/85" />
      );
    }
    return <GitFork size={14} className="text-primary/80" />;
  };

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden select-none">
        {/* Tree Section Header */}
        <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[12px] font-semibold text-muted-foreground">
            世系目录
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => addGroup(activeProjectId)}
              title="新建分组"
              aria-label="新建分组"
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer"
            >
              <FolderPlus size={13} />
            </button>
            <button
              type="button"
              onClick={() => openCreateModal()}
              title="新建世系"
              aria-label="新建世系"
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors cursor-pointer"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Draggable Tree */}
        <div className="flex-1 overflow-y-auto px-1.5 pb-3">
          <Tree
            items={treeItems}
            onItemsChange={(next) => setTree(activeProjectId, next)}
            activeId={activeNodeId}
            onSelect={handleSelect}
            onEdit={openEditModal}
            canEdit={(item) => item.type === 'chart'}
            onRename={(id, name) => renameNode(activeProjectId, id, name)}
            onRemove={(id) => removeNode(activeProjectId, id)}
            onAdd={(id) => openCreateModal(id)}
            onDuplicate={(id) => duplicateNode(activeProjectId, id)}
            renderIcon={renderIcon}
            collapsible
            removable
            indicator
            canHaveChildren={(item) => item.type === 'folder'}
          />
        </div>
      </div>

      <LineageEditorModal
        open={modalState.open}
        mode={modalState.mode}
        initialValue={modalState.initialValue}
        onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
        onSubmit={handleModalSubmit}
      />
    </>
  );
};
