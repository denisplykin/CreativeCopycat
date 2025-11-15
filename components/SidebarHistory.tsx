'use client'

import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn, groupByDate, formatRelativeTime } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

interface HistoryItem {
  id: string
  creative_id: string
  generation_type: string
  copy_mode: string
  status: 'running' | 'completed' | 'failed'
  progress?: number
  created_at: string
  result_url?: string | null
  creative?: {
    competitor_name: string | null
    original_image_url: string
  }
}

interface SidebarHistoryProps {
  items: HistoryItem[]
  onItemClick?: (item: HistoryItem) => void
}

export function SidebarHistory({ items, onItemClick }: SidebarHistoryProps) {
  const groupedItems = groupByDate(items)

  return (
    <div className="w-[280px] h-screen fixed left-0 top-0 border-r bg-card flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length} generation{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Scrollable List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([date, dateItems]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                {date}
              </h3>
              <div className="space-y-2">
                {dateItems.map((item) => (
                  <HistoryItemCard
                    key={item.id}
                    item={item}
                    onClick={() => onItemClick?.(item)}
                  />
                ))}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No generation history yet</p>
              <p className="text-xs mt-1">Start by generating a creative</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function HistoryItemCard({
  item,
  onClick,
}: {
  item: HistoryItem
  onClick: () => void
}) {
  const statusConfig = {
    running: {
      variant: 'default' as const,
      label: 'Running',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    completed: {
      variant: 'success' as const,
      label: 'Done',
      icon: null,
    },
    failed: {
      variant: 'destructive' as const,
      label: 'Failed',
      icon: null,
    },
  }

  const status = statusConfig[item.status]
  const time = formatRelativeTime(item.created_at)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border bg-card p-3 text-left transition-all hover:shadow-md hover:border-primary/50",
        item.status === 'running' && "opacity-70"
      )}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
          {item.result_url || item.creative?.original_image_url ? (
            <Image
              src={item.result_url || item.creative!.original_image_url}
              alt="Creative"
              fill
              className={cn(
                "object-cover",
                item.status === 'running' && "blur-sm"
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-xs">No image</span>
            </div>
          )}

          {/* Running Overlay */}
          {item.status === 'running' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              {item.progress && (
                <span className="text-xs text-white font-bold mt-1">
                  {item.progress}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium truncate">
              {item.creative?.competitor_name || 'Unknown'} · {item.copy_mode}
            </p>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Badge variant={status.variant} className="text-xs flex items-center gap-1">
              {status.icon}
              {status.label}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">{time}</p>
        </div>
      </div>
    </button>
  )
}

