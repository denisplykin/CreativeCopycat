import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for merging Tailwind CSS classes
 * Used by shadcn/ui components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to relative time (e.g., "2 hours ago", "Yesterday")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Group items by date (Today, Yesterday, date string)
 */
export function groupByDate<T extends { created_at: string | Date }>(
  items: T[]
): Record<string, T[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const groups: Record<string, T[]> = {}

  items.forEach(item => {
    const itemDate = new Date(item.created_at)
    itemDate.setHours(0, 0, 0, 0)

    let groupKey: string
    if (itemDate.getTime() === today.getTime()) {
      groupKey = 'Today'
    } else if (itemDate.getTime() === yesterday.getTime()) {
      groupKey = 'Yesterday'
    } else {
      groupKey = itemDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: itemDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
  })

  return groups
}

