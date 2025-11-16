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
  const [uploading, setUploading] = useState(false)

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
      console.log('🔄 Fetching runs from /api/runs...')
      const response = await fetch('/api/runs')
      const data = await response.json()
      console.log(`✅ Received ${data.runs?.length || 0} runs:`, data.runs)
      setRuns(data.runs || [])
    } catch (error) {
      console.error('❌ Failed to fetch runs:', error)
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

    // Immediately refresh history to show the new "running" items
    // (they get created in the API before generation starts)
    console.log('🔄 Initial history refresh (expecting new running items)...')
    setTimeout(() => fetchRuns(), 200) // Small delay to let API create the run record

    // Start all generations in background
    const startGenerations = async () => {
      // Send all requests in parallel
      const promises = modesToGenerate.map(async ({ mode, config: genConfig }) => {
        try {
          console.log(`📤 Sending ${mode} request to /api/generate...`)
          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(genConfig),
          })

          console.log(`📥 ${mode} response: ${response.status}`)

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error(`❌ ${mode} generation failed:`, errorData)
            // Refresh history to show failed status
            await fetchRuns()
            return { success: false, mode }
          }

          const result = await response.json()
          console.log(`✅ ${mode} generation complete:`, result)
          // Refresh history to show completion
          await fetchRuns()
          return { success: true, mode }
        } catch (error) {
          console.error(`❌ ${mode} generation error:`, error)
          await fetchRuns()
          return { success: false, mode }
        }
      })

      // Wait for all requests to complete
      const results = await Promise.all(promises)
      console.log(`🏁 All generations complete:`, results)
      
      // Final refresh
      await fetchRuns()
    }

    // Start generations (don't wait for completion)
    startGenerations().catch(err => {
      console.error('❌ startGenerations error:', err)
      fetchRuns() // Refresh even on error
    })

    // Also refresh runs with progressive delays to catch updates
    console.log('🔄 Setting up progressive history refresh...')
    const delays = [1000, 2000, 4000, 8000] // 1s, 2s, 4s, 8s
    delays.forEach(delay => {
      setTimeout(() => {
        console.log(`⏰ Progressive refresh at ${delay}ms`)
        fetchRuns()
      }, delay)
    })
  }

  // Handle creative card click
  const handleCreativeClick = (creative: Creative) => {
    console.log('🖼️ Creative card clicked:', creative.id, creative.competitor_name)
    setSelectedCreative(creative)
    setDialogOpen(true)
    console.log('📂 Dialog should now be open')
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploading(true)
    try {
      console.log('📤 Uploading file:', file.name)

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('competitor_name', 'My Upload') // Default name

      // Upload to API
      const response = await fetch('/api/creatives/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const { creative } = await response.json()
      console.log('✅ Creative uploaded:', creative)

      // Refresh creatives list
      await fetchCreatives()

      // Open generate dialog with uploaded creative
      setSelectedCreative(creative)
      setDialogOpen(true)
    } catch (error) {
      console.error('❌ Upload error:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
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
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <Button variant="outline" className="gap-2" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Choose File
                    </>
                  )}
                </Button>
              </div>
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

