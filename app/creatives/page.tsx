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
  config?: {
    customPrompt?: string
    [key: string]: any
  }
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
      // Add timestamp to prevent browser caching
      const timestamp = Date.now()
      const response = await fetch(`/api/runs?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      const data = await response.json()
      console.log(`✅ Received ${data.runs?.length || 0} runs (timestamp: ${timestamp})`)
      
      // Log first 3 runs for debugging
      if (data.runs && data.runs.length > 0) {
        console.log('📋 First 3 runs:', data.runs.slice(0, 3).map((r: any) => ({
          id: r.id.substring(0, 8),
          status: r.status,
          mode: r.copy_mode,
          created: new Date(r.created_at).toLocaleTimeString(),
        })))
      }
      
      setRuns(data.runs || [])
    } catch (error) {
      console.error('❌ Failed to fetch runs:', error)
    }
  }

  // Get unique competitors
  // Кастомный порядок конкурентов
  const competitorOrder = [
    'Kodland Indonesia',
    'Bright Champs',
    'Schola Indonesia (Bright Champs)',
    'Ruangguru',
    'Coding Bee Academy',
    'Timedoor Academy',
    'KodeKiddo',
    'DIGIKIDZ',
    'Edufic',
    'Kalananti',
    'KodioKids',
    'Math Champs by Ruangguru',
    'Sekolah programming Indonesia',
    'The Lab',
  ]

  // Получаем уникальных конкурентов из данных (excluding My Creatives)
  const uniqueCompetitors = Array.from(
    new Set(creatives.map((c) => c.competitor_name).filter(Boolean))
  ).filter(name => name !== 'My Creatives') as string[]

  // Сортируем по кастомному порядку, остальные в конец по алфавиту
  const sortedCompetitors = uniqueCompetitors.sort((a, b) => {
    const indexA = competitorOrder.indexOf(a)
    const indexB = competitorOrder.indexOf(b)
    
    // Если оба в списке - сортируем по позиции в списке
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }
    
    // Если только A в списке - A выше
    if (indexA !== -1) return -1
    
    // Если только B в списке - B выше
    if (indexB !== -1) return 1
    
    // Если оба не в списке - алфавитная сортировка
    return a.localeCompare(b)
  })

  // ✅ Add "My Creatives" at the beginning if there are any
  const hasMyCreatives = creatives.some(c => c.competitor_name === 'My Creatives')
  const competitors = hasMyCreatives 
    ? ['My Creatives', ...sortedCompetitors] 
    : sortedCompetitors

  // Filter creatives (use includes for partial matching, e.g., "Kodland" matches "Kodland Indonesia")
  const filteredCreatives = creatives.filter((creative) => {
    // ✅ Exclude "My Creatives" from "All" tab (only show in My Creatives tab)
    if (selectedCompetitor === 'All' && creative.competitor_name === 'My Creatives') {
      return false
    }
    
    if (selectedCompetitor !== 'All') {
      // If no competitor_name, exclude it
      if (!creative.competitor_name) {
        return false
      }
      // Use includes() for partial matching (case-insensitive)
      if (!creative.competitor_name.toLowerCase().includes(selectedCompetitor.toLowerCase())) {
        return false
      }
    }
    return true
  })
  
  // ✅ Сортировка по активным дням (чем меньше дней - тем выше)
  const sortedCreatives = [...filteredCreatives].sort((a, b) => {
    const daysA = a.active_days ?? 0
    const daysB = b.active_days ?? 0
    return daysA - daysB // Ascending order (fewer days first)
  })
  
  // Debug: Log filter results
  if (selectedCompetitor !== 'All' && creatives.length > 0) {
    console.log(`🔍 Filter: "${selectedCompetitor}" selected`)
    console.log('  Total creatives in state:', creatives.length)
    console.log('  After filter:', filteredCreatives.length)
  }

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
          imageModel: 'nano-banana-pro',
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
            imageModel: 'nano-banana-pro',
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
            imageModel: 'nano-banana-pro',
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
          
          // Add timeout (60 seconds max)
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 60000)
          
          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(genConfig),
            signal: controller.signal,
          })
          
          clearTimeout(timeoutId)
          console.log(`📥 ${mode} response: ${response.status}`)

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error(`❌ ${mode} generation failed:`, errorData)
            // Refresh history to show failed status
            await fetchRuns()
            return { success: false, mode, error: errorData }
          }

          const result = await response.json()
          console.log(`✅ ${mode} generation complete:`, result)
          // Refresh history to show completion
          await fetchRuns()
          return { success: true, mode, result }
        } catch (error: any) {
          console.error(`❌ ${mode} generation error:`, error)
          
          if (error.name === 'AbortError') {
            console.error(`⏱️ ${mode} request timed out after 60 seconds`)
          }
          
          await fetchRuns()
          return { success: false, mode, error: error.message }
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
    if (!file) {
      console.log('⚠️ No file selected')
      return
    }

    console.log('📁 File selected:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type)
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('❌ File too large:', file.size)
      alert('File size must be less than 10MB')
      return
    }

    console.log('✅ File validation passed')
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

      console.log('📥 Upload response status:', response.status)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const { creative } = await response.json()
      console.log('✅ Creative uploaded:', creative)

      // Map to Creative interface (image_url -> original_image_url)
      const mappedCreative: Creative = {
        id: creative.id.toString(),
        competitor_name: creative.competitor_name,
        original_image_url: creative.image_url, // ✅ Маппинг!
        active_days: creative.active_days || 0,
        ad_id: creative.ad_id,
        analysis: null,
        generated_character_url: null,
        generated_background_url: null,
        generated_image_url: null,
        figma_file_id: null,
        status: 'pending' as const,
        error_message: null,
        created_at: creative.created_at,
        updated_at: creative.updated_at,
      }

      // Refresh creatives list
      await fetchCreatives()

      // Open generate dialog with uploaded creative
      setSelectedCreative(mappedCreative)
      setDialogOpen(true)
    } catch (error) {
      console.error('❌ Upload error:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
      // Reset input to allow uploading same file again
      if (e.target) {
        e.target.value = ''
      }
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
        ) : sortedCreatives.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No creatives found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedCreatives.map((creative) => (
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

