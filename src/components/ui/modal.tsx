import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { ModalPortal } from "./modal-portal"
import { ModalErrorBoundary } from "./modal-error-boundary"

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
  // New optional auto-scaling props (opt-in only)
  autoScaleToViewport?: boolean
  viewportPadding?: number
  minScale?: number
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
  autoScaleToViewport = false,
  viewportPadding = 16,
  minScale = 0.75,
}: ModalProps) => {
  React.useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (open) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
      document.body.classList.add("modal-open")
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
      document.body.classList.remove("modal-open")
    }
  }, [open, closeOnEscape, onClose])

  // Auto scale to viewport (opt-in)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)

  React.useLayoutEffect(() => {
    if (!open) return
    if (!autoScaleToViewport) {
      setScale(1)
      return
    }

    const measure = () => {
      const el = contentRef.current
      if (!el) return
      const padding = viewportPadding ?? 16
      const minS = minScale ?? 0.75

      const prev = el.style.transform
      el.style.transform = 'none'
      const rect = el.getBoundingClientRect()
      const availW = window.innerWidth - padding * 2
      const availH = window.innerHeight - padding * 2
      let s = Math.min(availW / rect.width, availH / rect.height, 1)
      if (!isFinite(s) || s <= 0) s = 1
      s = Math.max(s, minS)
      setScale(s)
      el.style.transform = prev
    }

    const onResize = () => {
      window.requestAnimationFrame(measure)
    }

    const raf = window.requestAnimationFrame(measure)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [open, autoScaleToViewport, viewportPadding, minScale, size, children])

  if (!open) return null

  return (
    <ModalPortal>
      <ModalErrorBoundary onReset={onClose}>
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ pointerEvents: 'auto', padding: autoScaleToViewport ? viewportPadding : undefined }}
        >
          {/* Backdrop */}
          <div
            className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in",
              overlayClassName
            )}
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal Content */}
          <div
            ref={contentRef}
            className={cn(
              "relative w-full bg-background rounded-lg shadow-lg border animate-scale-in z-[10000]",
              sizeClasses[size],
              className
            )}
            style={autoScaleToViewport ? { transform: `scale(${scale})`, transformOrigin: 'center' } : undefined}
            onClick={(e) => e.stopPropagation()}
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
      </ModalErrorBoundary>
    </ModalPortal>
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