import { PersonRecord } from '../../types';
import {
  getDerivedChildren,
  getSpouseSortScore,
} from '../../utils/personHelpers';
import {
  GenealogyFlowNode,
  GenealogyFlowEdge,
  PersonFlowNode,
  UnionFlowNode,
  QuickAddFlowNode,
} from '../types';

export interface LayoutOptions {
  onSelectPerson?: (id: string) => void;
  onAddChild?: (fatherId: string, gender?: 'male' | 'female') => void;
  onAddSibling?: (refPersonId: string, gender?: 'male' | 'female') => void;
  onAddSpouse?: (personId: string) => void;
  onDeletePerson?: (id: string) => void;
  onToggleCollapse?: (personId: string) => void;
  collapsedNodeIds?: Set<string>;
  selectedPersonId?: string | null;
  editingPersonId?: string | null;
  clanSurname?: string;
  onCommitInlineName?: (personId: string, name: string, openDrawer: boolean) => void;
  onCancelInlineName?: (personId: string) => void;
}

const CARD_W = 100;
const CARD_H = 114;
const X_STEP = 126; // 100px card + 26px gap
const Y_STEP = 160; // 114px card + 46px bus gap

const GHOST_SPOUSE_ID = '__ghost-spouse__';
const GHOST_SIBLING_ID = '__ghost-sibling__';
const GHOST_CHILD_ID = '__ghost-child__';

export function buildGenealogyGraph(
  persons: PersonRecord[],
  options: LayoutOptions = {}
): { nodes: GenealogyFlowNode[]; edges: GenealogyFlowEdge[] } {
  if (!persons || persons.length === 0) {
    return { nodes: [], edges: [] };
  }

  const {
    collapsedNodeIds = new Set<string>(),
    onToggleCollapse,
    onSelectPerson,
    onAddChild,
    onAddSibling,
    onAddSpouse,
    onDeletePerson,
    selectedPersonId,
    editingPersonId = null,
    clanSurname = '',
    onCommitInlineName,
    onCancelInlineName,
  } = options;

  const personMap = new Map<string, PersonRecord>();
  persons.forEach((p) => personMap.set(p.id, p));

  const rawChildrenMap = new Map<string, PersonRecord[]>();
  persons.forEach((person) => {
    if (person.fatherId && !person.spouseOfId && personMap.has(person.fatherId)) {
      const list = rawChildrenMap.get(person.fatherId) || [];
      list.push(person);
      rawChildrenMap.set(person.fatherId, list);
    }
  });
  rawChildrenMap.forEach((_, fatherId) => {
    rawChildrenMap.set(fatherId, getDerivedChildren(persons, fatherId));
  });

  function countDescendants(personId: string): number {
    const children = rawChildrenMap.get(personId) || [];
    let count = children.length;
    children.forEach((c) => {
      count += countDescendants(c.id);
    });
    return count;
  }

  const hiddenPersonIds = new Set<string>();
  function markDescendantsHidden(personId: string) {
    const children = rawChildrenMap.get(personId) || [];
    children.forEach((c) => {
      hiddenPersonIds.add(c.id);
      markDescendantsHidden(c.id);
    });
  }
  collapsedNodeIds.forEach((collapsedId) => {
    markDescendantsHidden(collapsedId);
  });

  const visiblePersons = persons.filter((p) => !hiddenPersonIds.has(p.id));
  const allVisibleIds = new Set(visiblePersons.map((p) => p.id));

  const spousesByPartnerId = new Map<string, PersonRecord[]>();
  visiblePersons.forEach((p) => {
    if (p.spouseOfId && allVisibleIds.has(p.spouseOfId)) {
      const list = spousesByPartnerId.get(p.spouseOfId) || [];
      list.push(p);
      spousesByPartnerId.set(p.spouseOfId, list);
    }
  });
  spousesByPartnerId.forEach((list, partnerId) => {
    list.sort((a, b) => {
      const diff = getSpouseSortScore(a) - getSpouseSortScore(b);
      if (diff !== 0) return diff;
      const orderA = a.siblingOrder ?? a.biographyOrder ?? 50;
      const orderB = b.siblingOrder ?? b.biographyOrder ?? 50;
      return orderA - orderB;
    });
    spousesByPartnerId.set(partnerId, list);
  });

  const rootPersons = visiblePersons.filter(
    (p) =>
      (!p.fatherId || !allVisibleIds.has(p.fatherId)) &&
      !(p.spouseOfId && allVisibleIds.has(p.spouseOfId))
  );
  const roots =
    rootPersons.length > 0
      ? rootPersons
      : visiblePersons.filter(
          (p) =>
            p.generation === 1 &&
            !(p.spouseOfId && allVisibleIds.has(p.spouseOfId))
        );

  // Determine selection-driven ghost add cards (配偶 / 兄妹 / 子女)
  const selectedRaw =
    selectedPersonId && allVisibleIds.has(selectedPersonId)
      ? personMap.get(selectedPersonId) || null
      : null;
  const selectedIsSpouse = Boolean(
    selectedRaw?.spouseOfId && allVisibleIds.has(selectedRaw.spouseOfId)
  );
  const activeMainPersonId = selectedRaw
    ? selectedIsSpouse
      ? selectedRaw.spouseOfId!
      : selectedRaw.id
    : null;
  const activeMainPerson = activeMainPersonId
    ? personMap.get(activeMainPersonId) || null
    : null;

  const showGhostSpouse = Boolean(activeMainPerson);
  const showGhostChild = Boolean(
    activeMainPerson &&
      (!collapsedNodeIds.has(activeMainPerson.id) ||
        (rawChildrenMap.get(activeMainPerson.id) || []).length === 0)
  );
  const showGhostSibling = Boolean(activeMainPerson && !selectedIsSpouse);

  // Track virtual tree children (real child IDs + optional virtual ghost IDs) for layout
  type LayoutChildRef =
    | { kind: 'person'; id: string; person: PersonRecord }
    | { kind: 'ghost'; id: string; ghostKind: 'sibling' | 'child'; label: string; generation: number; parentId?: string };

  const getLayoutChildren = (person: PersonRecord): LayoutChildRef[] => {
    const isCollapsed = collapsedNodeIds.has(person.id);
    const realChildren = isCollapsed
      ? []
      : (rawChildrenMap.get(person.id) || []).filter(
          (c) => !hiddenPersonIds.has(c.id) && !(c.spouseOfId && allVisibleIds.has(c.spouseOfId))
        );

    const list: LayoutChildRef[] = [];
    realChildren.forEach((c) => {
      list.push({ kind: 'person', id: c.id, person: c });
      // Inject sibling ghost right after selected activeMainPerson
      if (
        showGhostSibling &&
        activeMainPerson &&
        c.id === activeMainPerson.id
      ) {
        list.push({
          kind: 'ghost',
          id: GHOST_SIBLING_ID,
          ghostKind: 'sibling',
          label: '兄妹',
          generation: activeMainPerson.generation || 1,
          parentId: person.id,
        });
      }
    });

    if (showGhostChild && activeMainPerson && person.id === activeMainPerson.id) {
      list.push({
        kind: 'ghost',
        id: GHOST_CHILD_ID,
        ghostKind: 'child',
        label: '子女',
        generation: (person.generation || 1) + 1,
        parentId: person.id,
      });
    }

    return list;
  };

  // Build top-level root sequence (including sibling ghost if root is selected)
  const rootRefs: LayoutChildRef[] = [];
  roots.forEach((r) => {
    rootRefs.push({ kind: 'person', id: r.id, person: r });
    if (
      showGhostSibling &&
      activeMainPerson &&
      r.id === activeMainPerson.id &&
      (!activeMainPerson.fatherId || !allVisibleIds.has(activeMainPerson.fatherId))
    ) {
      rootRefs.push({
        kind: 'ghost',
        id: GHOST_SIBLING_ID,
        ghostKind: 'sibling',
        label: '兄妹',
        generation: activeMainPerson.generation || 1,
      });
    }
  });

  const positions = new Map<string, { x: number; y: number }>();
  const subtreePlacedIds = new Map<string, string[]>();
  let currentLeafX = 0;

  function shiftSubtree(nodeId: string, deltaX: number) {
    if (Math.abs(deltaX) < 0.1) return;
    const pos = positions.get(nodeId);
    if (pos) {
      positions.set(nodeId, { x: pos.x + deltaX, y: pos.y });
    }
    const attached = spousesByPartnerId.get(nodeId) || [];
    attached.forEach((sp) => {
      const spPos = positions.get(sp.id);
      if (spPos) positions.set(sp.id, { x: spPos.x + deltaX, y: spPos.y });
    });
    if (showGhostSpouse && activeMainPersonId === nodeId) {
      const gSpPos = positions.get(GHOST_SPOUSE_ID);
      if (gSpPos) {
        positions.set(GHOST_SPOUSE_ID, { x: gSpPos.x + deltaX, y: gSpPos.y });
      }
    }
    const descendants = subtreePlacedIds.get(nodeId) || [];
    descendants.forEach((dId) => shiftSubtree(dId, deltaX));
  }

  function layoutNodeRef(ref: LayoutChildRef): number {
    if (ref.kind === 'ghost') {
      const y = (ref.generation - 1) * Y_STEP;
      const x = currentLeafX;
      positions.set(ref.id, { x, y });
      currentLeafX += X_STEP;
      return x;
    }

    const person = ref.person;
    const y = ((person.generation || 1) - 1) * Y_STEP;
    const attachedSpouses = spousesByPartnerId.get(person.id) || [];
    const hasOwnGhostSpouse = Boolean(
      showGhostSpouse && activeMainPersonId === person.id
    );
    const totalRowCards =
      1 + attachedSpouses.length + (hasOwnGhostSpouse ? 1 : 0);
    const hasCouple = totalRowCards >= 2;
    const childrenRefs = getLayoutChildren(person);

    const placeRowCards = (personX: number) => {
      positions.set(person.id, { x: personX, y });
      attachedSpouses.forEach((spouse, sIdx) => {
        positions.set(spouse.id, {
          x: personX + (sIdx + 1) * X_STEP,
          y,
        });
      });
      if (hasOwnGhostSpouse) {
        positions.set(GHOST_SPOUSE_ID, {
          x: personX + (attachedSpouses.length + 1) * X_STEP,
          y,
        });
      }
    };

    if (childrenRefs.length === 0) {
      const x = currentLeafX;
      placeRowCards(x);
      currentLeafX += totalRowCards * X_STEP;
      return x;
    }

    const subtreeStartX = currentLeafX;
    const childXs: number[] = [];
    const childIds: string[] = [];
    childrenRefs.forEach((cRef) => {
      childXs.push(layoutNodeRef(cRef));
      childIds.push(cRef.id);
    });
    subtreePlacedIds.set(person.id, childIds);

    const minChildX = Math.min(...childXs);
    const maxChildX = Math.max(...childXs);
    const childrenCenterX = (minChildX + maxChildX) / 2;

    let personX = hasCouple ? childrenCenterX - X_STEP / 2 : childrenCenterX;
    if (personX < subtreeStartX) {
      const shift = subtreeStartX - personX;
      childIds.forEach((cId) => shiftSubtree(cId, shift));
      currentLeafX += shift;
      personX = subtreeStartX;
    }

    placeRowCards(personX);
    currentLeafX = Math.max(currentLeafX, personX + totalRowCards * X_STEP);
    return personX;
  }

  rootRefs.forEach((ref) => {
    layoutNodeRef(ref);
    currentLeafX += 48;
  });

  // Fallback for any disconnected non-spouse visible nodes
  visiblePersons.forEach((person) => {
    if (!positions.has(person.id)) {
      const y = ((person.generation || 1) - 1) * Y_STEP;
      positions.set(person.id, { x: currentLeafX, y });
      currentLeafX += X_STEP;
    }
  });

  const nodes: GenealogyFlowNode[] = [];
  const edges: GenealogyFlowEdge[] = [];

  visiblePersons.forEach((person) => {
    const pos = positions.get(person.id) || { x: 0, y: 0 };
    const allChildren = rawChildrenMap.get(person.id) || [];
    const isCollapsed = collapsedNodeIds.has(person.id);
    const descendantsCount = countDescendants(person.id);

    const personNode: PersonFlowNode = {
      id: person.id,
      type: 'person',
      position: pos,
      data: {
        person,
        generation: person.generation,
        clanSurname,
        isSelected: person.id === selectedPersonId,
        isEditingName: person.id === editingPersonId,
        hasChildren: allChildren.length > 0,
        isCollapsed,
        childrenCount: descendantsCount,
        onSelect: onSelectPerson,
        onAddChild,
        onAddSpouse,
        onDelete: onDeletePerson,
        onToggleCollapse,
        onCommitName: onCommitInlineName,
        onCancelEditing: onCancelInlineName,
      },
    };
    nodes.push(personNode);

    if (person.spouseOfId && allVisibleIds.has(person.spouseOfId)) {
      return;
    }

    const attachedSpouses = spousesByPartnerId.get(person.id) || [];
    const hasOwnGhostSpouse = Boolean(
      showGhostSpouse && activeMainPersonId === person.id
    );

    // Horizontal marriage connectors
    attachedSpouses.forEach((spouse, sIdx) => {
      const prevNodeId = sIdx === 0 ? person.id : attachedSpouses[sIdx - 1].id;
      edges.push({
        id: `e-marriage-${prevNodeId}-${spouse.id}`,
        source: prevNodeId,
        sourceHandle: 'spouse-out',
        target: spouse.id,
        targetHandle: 'spouse-in',
        type: 'genealogy',
        data: { relationship: 'marriage' },
      });
    });

    if (hasOwnGhostSpouse) {
      const lastPartnerId =
        attachedSpouses.length > 0
          ? attachedSpouses[attachedSpouses.length - 1].id
          : person.id;
      const gSpPos = positions.get(GHOST_SPOUSE_ID);
      if (gSpPos) {
        const ghostSpouseNode: QuickAddFlowNode = {
          id: GHOST_SPOUSE_ID,
          type: 'quickAdd',
          position: gSpPos,
          draggable: false,
          selectable: false,
          data: {
            kind: 'spouse',
            label: '配偶',
            targetPersonId: person.id,
            onAction: () => onAddSpouse?.(person.id),
          },
        };
        nodes.push(ghostSpouseNode);
        edges.push({
          id: `e-ghost-marriage-${lastPartnerId}`,
          source: lastPartnerId,
          sourceHandle: 'spouse-out',
          target: GHOST_SPOUSE_ID,
          targetHandle: 'spouse-in',
          type: 'genealogy',
          data: { relationship: 'ghost_marriage' },
        });
      }
    }

    // Children edges (real children + optional ghost child + optional ghost sibling)
    const layoutChildren = getLayoutChildren(person);
    if (layoutChildren.length > 0) {
      const hasCoupleOnRow = attachedSpouses.length > 0 || hasOwnGhostSpouse;
      let parentSourceId = person.id;
      let parentSourceHandle = 'child-out';

      if (hasCoupleOnRow) {
        const unionId = `union-${person.id}`;
        const unionX = pos.x + CARD_W / 2 + X_STEP / 2 - 4;
        const unionY = pos.y + CARD_H / 2 - 4;
        const spouseNames = attachedSpouses.map((s) => s.name).join(' / ');

        const unionNode: UnionFlowNode = {
          id: unionId,
          type: 'union',
          position: { x: unionX, y: unionY },
          draggable: false,
          selectable: false,
          data: {
            unionId,
            fatherId: person.id,
            spouseName: spouseNames || undefined,
            generation: person.generation,
          },
        };
        nodes.push(unionNode);
        parentSourceId = unionId;
        parentSourceHandle = 'union-children-out';
      }

      layoutChildren.forEach((childRef) => {
        if (childRef.kind === 'person') {
          edges.push({
            id: `e-bloodline-${person.id}-${childRef.id}`,
            source: parentSourceId,
            sourceHandle: parentSourceHandle,
            target: childRef.id,
            targetHandle: 'parent-in',
            type: 'genealogy',
            data: { relationship: 'bloodline' },
          });
        } else {
          const ghostPos = positions.get(childRef.id);
          if (ghostPos) {
            const ghostNode: QuickAddFlowNode = {
              id: childRef.id,
              type: 'quickAdd',
              position: ghostPos,
              draggable: false,
              selectable: false,
              data: {
                kind: childRef.ghostKind,
                label: childRef.label,
                targetPersonId: activeMainPersonId || person.id,
                onAction:
                  childRef.ghostKind === 'sibling'
                    ? () => onAddSibling?.(activeMainPersonId || person.id, 'male')
                    : () => onAddChild?.(person.id, 'male'),
              },
            };
            nodes.push(ghostNode);
            edges.push({
              id: `e-ghost-bloodline-${person.id}-${childRef.id}`,
              source: parentSourceId,
              sourceHandle: parentSourceHandle,
              target: childRef.id,
              targetHandle: 'parent-in',
              type: 'genealogy',
              data: { relationship: 'ghost_bloodline' },
            });
          }
        }
      });
    }
  });

  // Root-level sibling ghost card when selected person has no parent
  if (
    showGhostSibling &&
    activeMainPerson &&
    (!activeMainPerson.fatherId || !allVisibleIds.has(activeMainPerson.fatherId))
  ) {
    const gSibPos = positions.get(GHOST_SIBLING_ID);
    if (gSibPos) {
      const ghostSiblingNode: QuickAddFlowNode = {
        id: GHOST_SIBLING_ID,
        type: 'quickAdd',
        position: gSibPos,
        draggable: false,
        selectable: false,
        data: {
          kind: 'sibling',
          label: '兄妹',
          targetPersonId: activeMainPerson.id,
          onAction: () => onAddSibling?.(activeMainPerson.id, 'male'),
        },
      };
      nodes.push(ghostSiblingNode);
    }
  }

  return { nodes, edges };
}
