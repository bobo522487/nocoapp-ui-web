import type { NodeViewProps, ReactNodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import type { ComponentType } from 'react';
import { resolvePersonMentionLabel } from '../domain/personMention';

export interface PersonMentionViewProps extends NodeViewProps {
  people?: Array<{ id: string; name: string }>;
}

export function PersonMentionView({
  node,
  people = [],
}: PersonMentionViewProps) {
  const { personId, chartId, fallbackName, generation } = node.attrs;
  const { text, missing } = resolvePersonMentionLabel(
    { personId, fallbackName },
    people,
  );

  return (
    <NodeViewWrapper
      as="span"
      className={`puwen-person-mention${missing ? ' is-missing' : ''}`}
      title={missing ? '原世系节点已移除' : undefined}
      data-type="personMention"
      data-person-id={personId}
      data-chart-id={chartId}
      data-fallback-name={fallbackName}
      data-generation={generation ?? ''}
    >
      {text}
    </NodeViewWrapper>
  );
}

export function createPersonMentionView(
  people: Array<{ id: string; name: string }>,
): ComponentType<ReactNodeViewProps> {
  return function PersonMentionViewWithPeople(props: ReactNodeViewProps) {
    return <PersonMentionView {...props} people={people} />;
  };
}