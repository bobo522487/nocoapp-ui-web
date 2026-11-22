import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  isPlaceholder?: boolean;
  containerClassName?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, containerClassName, isPlaceholder, children, value, ...props },
    ref
  ) => {
    const showPlaceholderTone =
      isPlaceholder !== undefined
        ? isPlaceholder
        : value !== undefined && value === '';

    return (
      <div className={cn('relative w-full', containerClassName)}>
        <select
          ref={ref}
          value={value}
          className={cn(
            'flex h-8 w-full appearance-none rounded-md border border-input bg-card pl-2.5 pr-7 py-1 text-xs shadow-[var(--shadow-control)] ring-offset-background transition-all duration-150 outline-none hover:border-[hsl(var(--border-strong))] focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:shadow-[var(--shadow-focus-halo)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
            showPlaceholderTone
              ? 'text-placeholder font-normal'
              : 'text-foreground font-normal',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={13}
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/75"
        />
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
