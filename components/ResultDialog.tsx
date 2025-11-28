'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Download, ExternalLink, Sparkles } from 'lucide-react'

interface SourceCreative {
  id: string
  competitor_name: string | null
  original_image_url: string
  analysis?: any
}

interface ResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUseAsSource?: (creative: SourceCreative) => void
  result: {
    id: string
    result_url?: string | null
    generation_type: string
    copy_mode: string
    config?: {
      customPrompt?: string
      [key: string]: any
    }
    status: 'running' | 'completed' | 'failed'
    created_at: string
    creative?: {
      competitor_name: string | null
      original_image_url: string
    }
  } | null
}

export function ResultDialog({ open, onOpenChange, onUseAsSource, result }: ResultDialogProps) {
  if (!result) return null

  const handleDownload = async () => {
    if (!result.result_url) return

    try {
      const response = await fetch(result.result_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `algonova-creative-${result.id}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download image')
    }
  }

  const handleOpenInNewTab = () => {
    if (result.result_url) {
      window.open(result.result_url, '_blank')
    }
  }

  const statusConfig = {
    running: { variant: 'default' as const, label: 'Running' },
    completed: { variant: 'success' as const, label: 'Completed' },
    failed: { variant: 'destructive' as const, label: 'Failed' },
  }

  const status = statusConfig[result.status]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generated Creative</DialogTitle>
          <DialogDescription>
            {result.creative?.competitor_name || 'Unknown'} · {result.copy_mode}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(result.created_at).toLocaleString()}
            </span>
          </div>

          {/* Image Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div>
              <p className="text-sm font-medium mb-2">Original</p>
              <div className="relative w-full rounded-lg overflow-hidden border bg-muted">
                {result.creative?.original_image_url && (
                  <img
                    src={result.creative.original_image_url}
                    alt="Original"
                    className="w-full h-auto"
                  />
                )}
              </div>
            </div>

            {/* Generated */}
            <div>
              <p className="text-sm font-medium mb-2">Generated</p>
              <div className="relative w-full rounded-lg overflow-hidden border bg-muted">
                {result.result_url ? (
                  <img
                    src={result.result_url}
                    alt="Generated"
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="flex items-center justify-center text-muted-foreground p-12">
                    <p className="text-sm">No result available</p>
                  </div>
                )}
              </div>
              {/* Use as a source button */}
              {result.result_url && onUseAsSource && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full gap-2"
                  onClick={() => {
                    const creative: SourceCreative = {
                      id: `generated_${result.id}`,
                      competitor_name: 'My Creatives',
                      original_image_url: result.result_url!,
                      analysis: null,
                    }
                    onOpenChange(false)
                    onUseAsSource(creative)
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  Use as a source
                </Button>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="p-4 rounded-lg bg-muted/30 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Generation Type:</span>
              <span className="font-medium">{result.generation_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Copy Mode:</span>
              <span className="font-medium">{result.copy_mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={status.variant} className="h-6">
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Custom Prompt (if used) */}
          {result.config?.customPrompt && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                📝 Custom Prompt:
              </p>
              <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                {result.config.customPrompt}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {result.result_url && (
            <>
              <Button variant="outline" onClick={handleOpenInNewTab} className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

