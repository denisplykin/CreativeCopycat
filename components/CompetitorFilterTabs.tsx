'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface CompetitorFilterTabsProps {
  competitors: string[]
  activeCompetitor: string
  onCompetitorChange: (competitor: string) => void
}

export function CompetitorFilterTabs({
  competitors,
  activeCompetitor,
  onCompetitorChange,
}: CompetitorFilterTabsProps) {
  const allCompetitors = ['All', ...competitors]

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      {allCompetitors.map((competitor) => (
        <button
          key={competitor}
          onClick={() => onCompetitorChange(competitor)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
            "border hover:border-primary/50 flex items-center gap-1.5",
            activeCompetitor === competitor
              ? "bg-primary text-primary-foreground border-primary shadow-md"
              : "bg-background text-foreground border-border hover:bg-accent"
          )}
        >
          {competitor === 'My Creatives' && (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {competitor}
        </button>
      ))}
    </div>
  )
}

