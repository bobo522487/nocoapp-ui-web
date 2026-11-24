import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1.5 text-[14px] shadow-[var(--shadow-control)] ring-offset-background transition-all duration-150 file:border-0 file:bg-transparent file:text-[14px] file:font-medium placeholder:text-placeholder placeholder:font-normal placeholder:tracking-normal hover:border-[hsl(var(--border-strong))] focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:shadow-[var(--shadow-focus-halo)] disabled:cursor-not-allowed disabled:opacity-50 text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }