/**
 * Pagination utilities for NFT collections
 */

export interface PaginationResult {
  pageNumbers: (number | string)[]
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Generate page numbers to display in pagination
 * Shows: [1] [...] [current-1] [current] [current+1] [...] [last]
 */
export function generatePagination(
  currentPage: number,
  totalPages: number
): PaginationResult {
  const pageNumbers: (number | string)[] = []

  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    // Always show first page
    pageNumbers.push(1)

    // Show ellipsis if current page is far from start
    if (currentPage > 3) {
      pageNumbers.push('...')
    }

    // Show pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pageNumbers.push(i)
    }

    // Show ellipsis if current page is far from end
    if (currentPage < totalPages - 2) {
      pageNumbers.push('...')
    }

    // Always show last page
    if (totalPages > 1) {
      pageNumbers.push(totalPages)
    }
  }

  return {
    pageNumbers,
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  }
}

/**
 * Calculate page offset for API requests
 */
export function getPageOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}

/**
 * Check if page number is valid
 */
export function isValidPage(page: number, totalPages: number): boolean {
  return page >= 1 && page <= totalPages && Number.isInteger(page)
}

/**
 * Get URL for a specific page
 */
export function getPageUrl(
  basePath: string,
  page: number,
  searchParams?: URLSearchParams
): string {
  if (page === 1) {
    // Don't include page param for first page
    return searchParams && searchParams.toString()
      ? `${basePath}?${searchParams.toString()}`
      : basePath
  }

  const params = new URLSearchParams(searchParams)
  params.set('page', page.toString())
  return `${basePath}?${params.toString()}`
}

/**
 * Format number with commas for display
 * Example: 1000 -> "1,000"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}
