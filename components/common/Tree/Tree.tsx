
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverlay,
  DragMoveEvent,
  DragEndEvent,
  DragOverEvent,
  MeasuringStrategy,
  DropAnimation,
  Modifier,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  buildTree,
  flattenTree,
  getProjection,
  getChildCount,
  removeItem,
  setProperty,
} from './utilities';
import { FlattenedItem, SensorContext, TreeItem as TreeItemType } from './types';
import { SortableTreeItem } from './components/SortableTreeItem';
import { TreeItem } from './components/TreeItem';

const indentationWidth = 24;

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

interface TreeProps {
  items: TreeItemType[];
  onItemsChange: (items: TreeItemType[]) => void;
  renderIcon?: (item: FlattenedItem) => React.ReactNode;
  collapsible?: boolean;
  removable?: boolean;
  indicator?: boolean;
}

export function Tree({
  items: initialItems,
  onItemsChange,
  renderIcon,
  collapsible,
  removable,
  indicator = true,
}: TreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<{
    parentId: string | null;
    overId: string;
  } | null>(null);

  const flattenedItems = useMemo(() => {
    return flattenTree(initialItems);
  }, [initialItems]);

  const activeItem = activeId
    ? flattenedItems.find(({ id }) => id === activeId)
    : null;

  const sensorContext: SensorContext = useRef({
    items: flattenedItems,
    offset: offsetLeft,
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: { distance: 5 } // Require movement to start drag
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { context: { active, droppableContainers, collisionRect } }) => {
          // Custom keyboard logic could go here, simplified for now
          return { x: 0, y: 0 }; 
      }
    })
  );

  useEffect(() => {
    sensorContext.current = {
      items: flattenedItems,
      offset: offsetLeft,
    };
  }, [flattenedItems, offsetLeft]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
    setOverId(active.id as string);
    document.body.style.cursor = 'grabbing';
  };

  const handleDragMove = ({ delta }: DragMoveEvent) => {
    setOffsetLeft(delta.x);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverId(over ? (over.id as string) : null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    resetState();

    if (projected && over) {
      const { depth, parentId } = projected;
      const clonedItems: FlattenedItem[] = JSON.parse(
        JSON.stringify(flattenTree(initialItems))
      );
      const overIndex = clonedItems.findIndex(({ id }) => id === over.id);
      const activeIndex = clonedItems.findIndex(({ id }) => id === active.id);
      const activeTreeItem = clonedItems[activeIndex];

      // Update the active item with new depth and parentId
      clonedItems[activeIndex] = { ...activeTreeItem, depth, parentId };

      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);
      const newItems = buildTree(sortedItems);

      onItemsChange(newItems);
    }
  };

  const handleDragCancel = () => {
    resetState();
  };

  const resetState = () => {
    setOverId(null);
    setActiveId(null);
    setOffsetLeft(0);
    setCurrentPosition(null);
    document.body.style.cursor = '';
  };

  const handleCollapse = (id: string) => {
    if (!collapsible) return;
    const newItems = setProperty(initialItems, id, 'collapsed', (value) => !value);
    onItemsChange(newItems);
  };

  const handleRemove = (id: string) => {
    if (!removable) return;
    const newItems = removeItem(initialItems, id);
    onItemsChange(newItems);
  };

  const handleRename = (id: string, name: string) => {
      const newItems = setProperty(initialItems, id, 'name', () => name);
      onItemsChange(newItems);
  };

  // Logic to calculate projected position
  const projected =
    activeId && overId && activeId !== overId
      ? getProjection(
          flattenedItems,
          activeId,
          overId,
          offsetLeft,
          indentationWidth
        )
      : null;

  const sortedIds = useMemo(
    () => flattenedItems.map(({ id }) => id),
    [flattenedItems]
  );

  const adjustTranslate: Modifier = ({ transform }) => {
    return {
      ...transform,
      y: transform.y - 25,
    };
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        <ul className="p-0 m-0">
          {flattenedItems.map((item) => {
            return (
              <SortableTreeItem
                key={item.id}
                id={item.id as string}
                item={item}
                depth={item.id === activeId && projected ? projected.depth : item.depth}
                indentationWidth={indentationWidth}
                indicator={indicator}
                collapsed={Boolean(item.collapsed && item.children.length)}
                onCollapse={handleCollapse}
                onRemove={removable ? handleRemove : undefined}
                onRename={handleRename}
                renderIcon={renderIcon}
              />
            );
          })}
        </ul>
      </SortableContext>

      {createPortal(
        <DragOverlay
          dropAnimation={dropAnimationConfig}
          modifiers={indicator ? [adjustTranslate] : undefined}
        >
          {activeId && activeItem ? (
            <TreeItem
              item={activeItem}
              depth={activeItem.depth}
              clone
              childCount={getChildCount(initialItems, activeId)}
              indentationWidth={indentationWidth}
              renderIcon={renderIcon}
            />
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
