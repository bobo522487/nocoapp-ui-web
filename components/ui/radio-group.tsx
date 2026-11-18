import * as React from 'react';
import { cn } from '../../lib/utils';

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  name: string;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(
  null
);

export interface RadioGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      name,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const groupName = name || `radio-group-${generatedId}`;
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const currentValue = value !== undefined ? value : internalValue;

    const handleChange = React.useCallback(
      (next: string) => {
        if (disabled) return;
        if (value === undefined) {
          setInternalValue(next);
        }
        onValueChange?.(next);
      },
      [disabled, onValueChange, value]
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      props.onKeyDown?.(e);
      if (e.defaultPrevented || disabled) return;
      if (
        e.key !== 'ArrowRight' &&
        e.key !== 'ArrowDown' &&
        e.key !== 'ArrowLeft' &&
        e.key !== 'ArrowUp'
      ) {
        return;
      }
      const container = e.currentTarget;
      const radios = Array.from(
        container.querySelectorAll('[role="radio"]:not(:disabled)')
      ) as HTMLButtonElement[];
      if (radios.length === 0) return;
      const activeIdx = radios.findIndex((el) => el === document.activeElement);
      if (activeIdx === -1) return;
      e.preventDefault();
      const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const nextIdx = (activeIdx + delta + radios.length) % radios.length;
      const nextEl = radios[nextIdx];
      nextEl.focus();
      const nextVal = nextEl.getAttribute('data-value');
      if (nextVal !== null) {
        handleChange(nextVal);
      }
    };

    return (
      <RadioGroupContext.Provider
        value={{
          value: currentValue,
          onValueChange: handleChange,
          name: groupName,
          disabled,
        }}
      >
        <div
          ref={ref}
          role="radiogroup"
          onKeyDown={handleKeyDown}
          className={cn('grid gap-2', className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

export interface RadioGroupItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, disabled, onClick, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext);
    const isChecked = ctx?.value === value;
    const isDisabled = Boolean(disabled || ctx?.disabled);

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isChecked}
        data-state={isChecked ? 'checked' : 'unchecked'}
        data-value={value}
        disabled={isDisabled}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented && !isDisabled) {
            ctx?.onValueChange?.(value);
          }
        }}
        className={cn(
          'aspect-square h-3.5 w-3.5 rounded-full border border-input bg-card text-primary shadow-[var(--shadow-control)] transition-colors duration-150 flex items-center justify-center shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50',
          isChecked && 'border-primary bg-primary/10',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full bg-primary transition-transform duration-150',
            isChecked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          )}
        />
      </button>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
