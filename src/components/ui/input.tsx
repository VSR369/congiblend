import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all",
  {
    variants: {
      variant: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-accent focus-visible:ring-accent",
        warning: "border-primary focus-visible:ring-primary",
      },
      size: {
        default: "h-10",
        sm: "h-9 text-xs",
        lg: "h-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  error?: string
  success?: string
  warning?: string
  helpText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  showPasswordToggle?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    variant,
    size,
    label,
    error,
    success,
    warning,
    helpText,
    leftIcon,
    rightIcon,
    showPasswordToggle = false,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [internalType, setInternalType] = React.useState(type)

    React.useEffect(() => {
      if (type === 'password' && showPasswordToggle) {
        setInternalType(showPassword ? 'text' : 'password')
      } else {
        setInternalType(type)
      }
    }, [type, showPassword, showPasswordToggle])

    // Determine validation state
    const validationVariant = error ? 'error' : success ? 'success' : warning ? 'warning' : variant || 'default'
    
    const validationIcon = error ? (
      <AlertCircle className="h-4 w-4 text-destructive" />
    ) : success ? (
      <CheckCircle className="h-4 w-4 text-accent" />
    ) : warning ? (
      <AlertCircle className="h-4 w-4 text-primary" />
    ) : null

    const passwordToggle = type === 'password' && showPasswordToggle ? (
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    ) : null

    const finalRightIcon = passwordToggle || rightIcon || validationIcon

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            type={internalType}
            className={cn(
              inputVariants({ variant: validationVariant, size, className }),
              leftIcon && "pl-10",
              finalRightIcon && "pr-10"
            )}
            ref={ref}
            {...props}
          />
          {finalRightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {finalRightIcon}
            </div>
          )}
        </div>
        {(error || success || warning || helpText) && (
          <p className={cn(
            "text-xs",
            error && "text-destructive",
            success && "text-accent",
            warning && "text-primary",
            !error && !success && !warning && "text-muted-foreground"
          )}>
            {error || success || warning || helpText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
