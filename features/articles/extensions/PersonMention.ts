import { mergeAttributes, Node } from '@tiptap/core';

export const PersonMention = Node.create({
  name: 'personMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      personId: { default: '' },
      chartId: { default: '' },
      fallbackName: { default: '' },
      generation: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-person-id]' }, { tag: 'span[data-type="personMention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'personMention',
        'data-person-id': node.attrs.personId,
        'data-chart-id': node.attrs.chartId,
        'data-fallback-name': node.attrs.fallbackName,
        'data-generation': node.attrs.generation ?? '',
        class: 'puwen-person-mention',
      }),
      String(node.attrs.fallbackName || '未命名'),
    ];
  },
});