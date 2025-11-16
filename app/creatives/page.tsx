'use client'

import React, { useState, useEffect } from 'react'
import { SidebarHistory } from '@/components/SidebarHistory'
import { CompetitorFilterTabs } from '@/components/CompetitorFilterTabs'
import { CreativeCard } from '@/components/CreativeCard'
import { GenerateDialog, type GenerationConfig } from '@/components/GenerateDialog'
import { ResultDialog } from '@/components/ResultDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Loader2 } from 'lucide-react'
import type { Creative } from '@/types/creative'

interface Run {
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

export default function CreativesNewPage() {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompetitor, setSelectedCompetitor] = useState('All')
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState<Run | null>(null)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)

  // Fetch creatives
  useEffect(() => {
    fetchCreatives()
    fetchRuns()
  }, [])

  // Poll for updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRuns()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchCreatives = async () => {
    try {
      const response = await fetch('/api/creatives')
      const data = await response.json()
      setCreatives(data.creatives || [])
    } catch (error) {
      console.error('Failed to fetch creatives:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRuns = async () => {
    try {
      const response = await fetch('/api/runs')
      const data = await response.json()
      setRuns(data.runs || [])
    } catch (error) {
      console.error('Failed to fetch runs:', error)
    }
  }

  // Get unique competitors
  const competitors = Array.from(
    new Set(creatives.map((c) => c.competitor_name).filter(Boolean))
  ).sort() as string[]

  // Filter creatives
  const filteredCreatives = creatives.filter((creative) => {
    if (selectedCompetitor !== 'All' && creative.competitor_name !== selectedCompetitor) {
      return false
    }
    return true
  })

  // Handle generate - supports multiple generation modes
  const handleGenerate = async (config: GenerationConfig) => {
    console.log('🎯 handleGenerate called in page.tsx')
    console.log('🎨 Selected creative:', selectedCreative?.id)
    console.log('⚙️ Config:', config)
    
    if (!selectedCreative) {
      console.error('❌ No creative selected!')
      return
    }

    // Determine which modes to generate
    const modesToGenerate: Array<{ mode: string; config: any }> = []

    if (config.generationType === 'custom') {
      // Custom mode - single generation with custom prompt
      modesToGenerate.push({
        mode: 'custom',
        config: {
          creativeId: selectedCreative.id,
          generationType: 'full_creative',
          copyMode: 'mask_edit',
          aspectRatio: config.aspectRatio,
          configGenerationType: 'custom',
          customPrompt: config.customPrompt,
        }
      })
    } else {
      // Simple mode - generate for each selected option
      const options = config.simpleOptions
      
      if (options?.simpleCopy) {
        modesToGenerate.push({
          mode: 'simple_copy',
          config: {
            creativeId: selectedCreative.id,
            generationType: 'full_creative',
            copyMode: 'simple_copy',
            aspectRatio: config.aspectRatio,
            configGenerationType: 'simple',
          }
        })
      }
      
      if (options?.copyWithColor) {
        modesToGenerate.push({
          mode: 'copy_with_color',
          config: {
            creativeId: selectedCreative.id,
            generationType: 'full_creative',
            copyMode: 'copy_with_color',
            aspectRatio: config.aspectRatio,
            configGenerationType: 'simple',
          }
        })
      }
      
      if (options?.slightlyDifferent) {
        modesToGenerate.push({
          mode: 'slightly_different',
          config: {
            creativeId: selectedCreative.id,
            generationType: 'full_creative',
            copyMode: 'slightly_different',
            aspectRatio: config.aspectRatio,
            configGenerationType: 'simple',
          }
        })
      }
    }

    console.log(`🚀 Starting ${modesToGenerate.length} generation(s)...`)

    // Start all generations in parallel (fire and forget)
    modesToGenerate.forEach(async ({ mode, config: genConfig }) => {
      try {
        console.log(`📤 Starting ${mode} generation...`)
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(genConfig),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error(`❌ ${mode} generation failed:`, errorData)
          return
        }

        const result = await response.json()
        console.log(`✅ ${mode} generation started:`, result)
      } catch (error) {
        console.error(`❌ ${mode} generation error:`, error)
      }
    })

    // Refresh runs immediately to show new items in history
    console.log('🔄 Refreshing runs immediately...')
    setTimeout(() => {
      fetchRuns()
      console.log('✅ Runs refreshed!')
    }, 500) // Small delay to ensure server created the records
  }

  // Handle creative card click
  const handleCreativeClick = (creative: Creative) => {
    setSelectedCreative(creative)
    setDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <SidebarHistory
        items={runs}
        onItemClick={(item) => {
          // If completed, show result dialog
          if (item.status === 'completed' && item.result_url) {
            setSelectedRun(item)
            setResultDialogOpen(true)
          } else {
            // Otherwise, open generate dialog for this creative
            const creative = creatives.find((c) => c.id === item.creative_id)
            if (creative) {
              setSelectedCreative(creative)
              setDialogOpen(true)
            }
          }
        }}
      />

      {/* Main Content */}
      <div className="ml-[280px] p-6 space-y-6">
        {/* Upload Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-1">Upload your creative</h2>
                <p className="text-sm text-muted-foreground">
                  Or pick a competitor creative below
                </p>
              </div>
              <Button variant="outline" className="gap-2">
                <Upload className="w-4 h-4" />
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Competitor Filter Tabs */}
        <CompetitorFilterTabs
          competitors={competitors}
          activeCompetitor={selectedCompetitor}
          onCompetitorChange={setSelectedCompetitor}
        />

        {/* Creatives Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredCreatives.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No creatives found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCreatives.map((creative) => (
              <CreativeCard
                key={creative.id}
                creative={creative}
                onClick={() => handleCreativeClick(creative)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Generate Dialog */}
      <GenerateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        creative={selectedCreative}
        onGenerate={handleGenerate}
      />

      {/* Result Dialog */}
      <ResultDialog
        open={resultDialogOpen}
        onOpenChange={setResultDialogOpen}
        result={selectedRun}
      />
    </div>
  )
}

