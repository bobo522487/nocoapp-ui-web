import { mergeAttributes, Node } from '@tiptap/core';

export const InlineAnnotation = Node.create({
  name: 'inlineAnnotation',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      mode: { default: 'footnote' },
      citationId: { default: null },
      noteText: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-annotation-mode]' }];
  },

  renderHTML({ node }) {
    const mode = node.attrs.mode === 'interlinear' ? 'interlinear' : 'footnote';
    const className = mode === 'interlinear' ? 'puwen-interlinear' : 'puwen-footnote';
    return [
      'span',
      mergeAttributes({
        'data-annotation-mode': mode,
        'data-citation-id': node.attrs.citationId ?? '',
        class: className,
      }),
      String(node.attrs.noteText || ''),
    ];
  },
});