import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, defaultValue, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || "")
    const currentValue = value !== undefined ? value : internalValue

    const handleChange = (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    }

    return (
      <div
        ref={ref}
        className={cn("grid gap-2", className)}
        role="radiogroup"
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              ...child.props,
              checked: child.props.value === currentValue,
              onCheckedChange: () => handleChange(child.props.value),
            } as any)
          }
          return child
        })}
      </div>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
  onCheckedChange?: () => void
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, checked, onCheckedChange, ...props }, ref) => {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onCheckedChange}
        className="relative flex items-center cursor-pointer"
      >
        <input
          ref={ref}
          type="radio"
          value={value}
          checked={checked}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          {...props}
        />
        <div
          className={cn(
            "aspect-square h-4 w-4 rounded-full border-2 transition-all",
            checked ? "border-primary" : "border-input",
            className
          )}
        >
          {checked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
          )}
        </div>
      </button>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }

