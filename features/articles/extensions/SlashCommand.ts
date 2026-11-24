import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import {
  filterPersonMentions,
  type MentionCandidate,
} from '../domain/personMention';
import {
  filterSlashCommands,
  type SlashCommandItem,
} from '../domain/slashCommands';

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: '/',
        items: ({ query }) => filterSlashCommands(query),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },
      }),
    ];
  },
});

export const PersonMentionSuggestion = Extension.create<{
  people: MentionCandidate[];
}>({
  name: 'personMentionSuggestion',

  addOptions() {
    return {
      people: [] as MentionCandidate[],
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<MentionCandidate>({
        editor: this.editor,
        char: '@',
        items: ({ query }) =>
          filterPersonMentions(query, this.options.people),
        command: ({ editor, range, props: item }) => {
          editor.chain().focus().deleteRange(range).run();
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'personMention',
              attrs: {
                personId: item.personId,
                chartId: item.chartId,
                fallbackName: item.name,
                generation: item.generation,
              },
            })
            .run();
        },
      }),
    ];
  },
});