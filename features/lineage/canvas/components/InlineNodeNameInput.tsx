import React, { useEffect, useRef, useState } from 'react';

interface InlineNodeNameInputProps {
  personId: string;
  placeholder?: string;
  className?: string;
  onCommit: (personId: string, name: string, openDrawer: boolean) => void;
  onCancel: (personId: string) => void;
}

export const InlineNodeNameInput: React.FC<InlineNodeNameInputProps> = ({
  personId,
  placeholder = '输入姓名，回车确认',
  className = '',
  onCommit,
  onCancel,
}) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isComposingRef = useRef(false);
  const handledRef = useRef(false);
  const mountedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    mountedAtRef.current = Date.now();
    handledRef.current = false;
    const rafId = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    const timer = setTimeout(() => {
      if (!handledRef.current && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 45);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [personId]);

  const handleCommit = (openDrawer: boolean) => {
    if (handledRef.current) return;
    const trimmed = value.trim();
    if (!trimmed) {
      handledRef.current = true;
      onCancel(personId);
      return;
    }
    handledRef.current = true;
    onCommit(personId, trimmed, openDrawer);
  };

  const handleCancel = () => {
    if (handledRef.current) return;
    handledRef.current = true;
    onCancel(personId);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          if (e.nativeEvent.isComposing || isComposingRef.current) {
            return;
          }
          e.preventDefault();
          handleCommit(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
        }
      }}
      onBlur={() => {
        if (handledRef.current) return;
        if (Date.now() - mountedAtRef.current < 160) {
          requestAnimationFrame(() => inputRef.current?.focus());
          return;
        }
        if (value.trim()) {
          handleCommit(false);
        } else {
          handleCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      placeholder={placeholder}
      aria-label="输入新族人姓名"
      className={`nodrag nopan nowheel outline-none font-sans font-semibold text-foreground bg-background border border-primary ring-2 ring-primary/25 rounded transition-colors placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-placeholder ${className}`}
    />
  );
};

export default InlineNodeNameInput;
