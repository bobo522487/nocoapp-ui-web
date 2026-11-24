import React from 'react';

export interface SlashCommandMenuProps {
  items: Array<{ id: string; title: string }>;
  onSelect: (id: string) => void;
}

export function SlashCommandMenu({ items, onSelect }: SlashCommandMenuProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-md"
      role="listbox"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="option"
          className="flex w-full cursor-pointer items-center rounded-sm px-2.5 py-1.5 text-left text-[13px] text-foreground hover:bg-muted"
          onClick={() => onSelect(item.id)}
        >
          {item.title}
        </button>
      ))}
    </div>
  );
}