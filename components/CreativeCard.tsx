'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Creative {
  id: string
  competitor_name: string | null
  original_image_url: string
  created_at: string
  analysis?: {
    aspect_ratio?: string
    dominant_colors?: string[]
  } | null
}

interface CreativeCardProps {
  creative: Creative
  onClick: () => void
}

export function CreativeCard({ creative, onClick }: CreativeCardProps) {
  const daysActive = Math.floor(
    (Date.now() - new Date(creative.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02] hover:border-primary/50",
        "bg-card"
      )}
    >
      {/* Image */}
      <div className="relative w-full h-[400px] bg-muted overflow-hidden">
        {creative.original_image_url ? (
          <Image
            src={creative.original_image_url}
            alt={`${creative.competitor_name || 'Creative'} creative`}
            fill
            className="object-contain transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No image available
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Aspect Ratio Badge */}
        {creative.analysis?.aspect_ratio && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm"
          >
            {creative.analysis.aspect_ratio}
          </Badge>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm truncate">
            {creative.competitor_name || 'Unknown'}
          </h3>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Created {new Date(creative.created_at).toLocaleDateString()}</span>
          <span>Active {daysActive}d</span>
        </div>
      </div>
    </Card>
  )
}

