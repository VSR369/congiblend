import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
  overlayClassName?: string
}

const sizeClasses = {
  sm: "max-w-md",
  default: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw] max-h-[95vh]",
}

export const Modal = ({
  open,
  onClose,
  children,
  size = "default",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  overlayClassName,
}: ModalProps) => {
  React.useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [open, closeOnEscape, onClose])

  return (
    open && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in",
            overlayClassName
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
          style={{ contain: 'none' }}
        />

        {/* Modal Content */}
        <div
          className={cn(
            "relative w-full bg-background rounded-lg shadow-lg border animate-scale-in z-[10000]",
            sizeClasses[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
          style={{ contain: 'none' }}
        >
          {showCloseButton && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-4 top-4 z-10"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {children}
        </div>
      </div>
    )
  )
}

// Modal compound components
export const ModalHeader = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("px-6 py-4 border-b", className)}
    {...props}
  >
    {children}
  </div>
)

export const ModalBody = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("px-6 py-4", className)}
    {...props}
  >
    {children}
  </div>
)

export const ModalFooter = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("px-6 py-4 border-t bg-muted/30 flex justify-end space-x-2", className)}
    {...props}
  >
    {children}
  </div>
)

export const ModalTitle = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  >
    {children}
  </h2>
)

export const ModalDescription = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("text-sm text-muted-foreground mt-2", className)}
    {...props}
  >
    {children}
  </p>
)