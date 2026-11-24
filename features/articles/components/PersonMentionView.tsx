import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { resolvePersonMentionLabel } from '../domain/personMention';

export function PersonMentionView({ node }: NodeViewProps) {
  const { personId, chartId, fallbackName, generation } = node.attrs;
  const { text, missing } = resolvePersonMentionLabel(
    { personId, fallbackName },
    [],
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