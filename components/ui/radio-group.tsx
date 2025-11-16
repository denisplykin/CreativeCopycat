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
  ({ className, value, checked, onCheckedChange, id, ...props }, ref) => {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={(e) => {
          e.preventDefault()
          console.log('🔘 RadioGroupItem clicked:', value, 'checked:', checked)
          if (onCheckedChange && !checked) {
            onCheckedChange()
          }
        }}
        className="relative flex items-center cursor-pointer focus:outline-none"
      >
        <input
          ref={ref}
          id={id}
          type="radio"
          name={props.name || 'radio-group'}
          value={value}
          checked={checked}
          onChange={(e) => {
            console.log('📻 Radio onChange:', value, e.target.checked)
            if (e.target.checked && onCheckedChange) {
              onCheckedChange()
            }
          }}
          className="sr-only"
          tabIndex={-1}
          {...props}
        />
        <div
          className={cn(
            "aspect-square h-4 w-4 rounded-full border-2 transition-all flex items-center justify-center",
            checked ? "border-primary" : "border-input",
            className
          )}
        >
          {checked && (
            <div className="h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
      </button>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }

