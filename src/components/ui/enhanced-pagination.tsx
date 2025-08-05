import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface EnhancedPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisiblePages?: number
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export const EnhancedPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 7,
  size = 'default',
  className,
}: EnhancedPaginationProps) => {
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const halfVisible = Math.floor(maxVisiblePages / 2)
    let start = Math.max(currentPage - halfVisible, 1)
    let end = Math.min(start + maxVisiblePages - 1, totalPages)

    if (end - start < maxVisiblePages - 1) {
      start = Math.max(end - maxVisiblePages + 1, 1)
    }

    const pages = []
    
    if (start > 1) {
      pages.push(1)
      if (start > 2) {
        pages.push('ellipsis-start' as const)
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pages.push('ellipsis-end' as const)
      }
      pages.push(totalPages)
    }

    return pages
  }

  const sizeClasses = {
    sm: "h-8 min-w-8 text-xs",
    default: "h-9 min-w-9 text-sm",
    lg: "h-10 min-w-10 text-base",
  }

  const visiblePages = getVisiblePages()

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center space-x-1", className)}
    >
      {/* First Page */}
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="outline"
          size="icon"
          className={sizeClasses[size]}
          onClick={() => onPageChange(1)}
          aria-label="Go to first page"
        >
          ««
        </Button>
      )}

      {/* Previous Page */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="icon"
          className={sizeClasses[size]}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Page Numbers */}
      {visiblePages.map((page, index) => {
        if (typeof page === 'string') {
          return (
            <Button
              key={page}
              variant="ghost"
              size="icon"
              className={sizeClasses[size]}
              disabled
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )
        }

        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            className={sizeClasses[size]}
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </Button>
        )
      })}

      {/* Next Page */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="icon"
          className={sizeClasses[size]}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Last Page */}
      {showFirstLast && currentPage < totalPages && (
        <Button
          variant="outline"
          size="icon"
          className={sizeClasses[size]}
          onClick={() => onPageChange(totalPages)}
          aria-label="Go to last page"
        >
          »»
        </Button>
      )}
    </nav>
  )
}

// Pagination Info Component
export interface PaginationInfoProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  className?: string
}

export const PaginationInfo = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  className,
}: PaginationInfoProps) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Showing {startItem} to {endItem} of {totalItems} results
    </div>
  )
}

// Simple Pagination (just prev/next)
export interface SimplePaginationProps {
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  className?: string
}

export const SimplePagination = ({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  className,
}: SimplePaginationProps) => (
  <div className={cn("flex items-center justify-between", className)}>
    <Button
      variant="outline"
      onClick={onPrevious}
      disabled={!hasPrevious}
      className="flex items-center"
    >
      <ChevronLeft className="h-4 w-4 mr-2" />
      Previous
    </Button>
    <Button
      variant="outline"
      onClick={onNext}
      disabled={!hasNext}
      className="flex items-center"
    >
      Next
      <ChevronRight className="h-4 w-4 ml-2" />
    </Button>
  </div>
)