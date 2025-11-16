'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

interface Creative {
  id: string
  competitor_name: string | null
  original_image_url: string
  analysis?: {
    aspect_ratio?: string
  } | null
}

interface GenerateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creative: Creative | null
  onGenerate: (config: GenerationConfig) => Promise<void>
}

export interface GenerationConfig {
  aspectRatio: 'original' | '1:1' | '4:5' | '9:16' | '16:9'
  generationType: 'simple' | 'custom'
  
  // Для простой генерации (чекбоксы)
  simpleOptions?: {
    simpleCopy: boolean
    copyWithColor: boolean
    slightlyDifferent: boolean
    fbData: boolean
    randomVariations: boolean
  }
  
  // Для кастомной генерации
  customPrompt?: string
}

export function GenerateDialog({
  open,
  onOpenChange,
  creative,
  onGenerate,
}: GenerateDialogProps) {
  const [config, setConfig] = useState<GenerationConfig>({
    aspectRatio: 'original',      // ✅ Original size по умолчанию
    generationType: 'simple',
    simpleOptions: {
      simpleCopy: true,           // ✅ По умолчанию включен
      copyWithColor: false,
      slightlyDifferent: false,
      fbData: false,
      randomVariations: false,
    },
    customPrompt: '',
  })

  const handleGenerate = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('🚀 Generate button clicked!')
    console.log('📦 Config:', config)
    console.log('🎨 Creative:', creative?.id)
    
    // Close dialog FIRST
    console.log('🚪 Closing dialog...')
    onOpenChange(false)
    
    // Wait a tiny bit to ensure modal closes first
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Then start generation
    console.log('📤 Starting generation...')
    onGenerate(config).catch((error) => {
      console.error('❌ Generation failed:', error)
    })
  }

  if (!creative) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Variations</DialogTitle>
          <DialogDescription>
            Configure and generate creative variations for {creative.competitor_name || 'this creative'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left: Preview */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Preview</Label>
            <div className="relative aspect-[9/16] w-full max-w-sm mx-auto bg-muted rounded-lg overflow-hidden border">
              <Image
                src={creative.original_image_url}
                alt={creative.competitor_name || 'Creative'}
                fill
                className="object-contain"
              />
            </div>
            {creative.analysis?.aspect_ratio && (
              <Badge variant="secondary" className="mt-3 mx-auto block w-fit">
                Original: {creative.analysis.aspect_ratio}
              </Badge>
            )}
          </div>

          {/* Right: Configuration */}
          <div className="space-y-6">
            {/* Aspect Ratio */}
            <div>
              <Label htmlFor="aspectRatio" className="text-base font-semibold mb-3 block">
                Aspect Ratio
              </Label>
              <select
                id="aspectRatio"
                value={config.aspectRatio}
                onChange={(e) => setConfig({ ...config, aspectRatio: e.target.value as any })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="original">Original (Keep same as source)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:5">4:5 (Vertical)</option>
                <option value="9:16">9:16 (Stories)</option>
                <option value="16:9">16:9 (Horizontal)</option>
              </select>
            </div>

            {/* Generation Type */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Generation Type</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-accent transition-colors">
                  <input
                    type="radio"
                    name="generationType"
                    value="simple"
                    checked={config.generationType === 'simple'}
                    onChange={(e) => {
                      console.log('📻 Simple selected')
                      setConfig({ ...config, generationType: 'simple' })
                    }}
                    className="w-4 h-4 text-primary"
                  />
                  <div>
                    <div className="font-medium">Simple (preset options)</div>
                    <div className="text-xs text-muted-foreground">Choose from predefined generation modes</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-accent transition-colors">
                  <input
                    type="radio"
                    name="generationType"
                    value="custom"
                    checked={config.generationType === 'custom'}
                    onChange={(e) => {
                      console.log('📻 Custom selected')
                      setConfig({ ...config, generationType: 'custom' })
                    }}
                    className="w-4 h-4 text-primary"
                  />
                  <div>
                    <div className="font-medium">Custom (your own prompt)</div>
                    <div className="text-xs text-muted-foreground">Describe exactly what you want to change</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Simple Options (multi-select checkboxes) */}
            {config.generationType === 'simple' && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold block">Select what to generate:</Label>
                
                {/* Simple Copy */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="simpleCopy"
                    checked={config.simpleOptions?.simpleCopy}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        simpleOptions: {
                          ...config.simpleOptions!,
                          simpleCopy: checked as boolean,
                        },
                      })
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="simpleCopy" className="font-normal cursor-pointer">
                      Simple Copy
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Replace brand name & logo with Algonova
                    </p>
                  </div>
                </div>

                {/* Copy + Color */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="copyWithColor"
                    checked={config.simpleOptions?.copyWithColor}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        simpleOptions: {
                          ...config.simpleOptions!,
                          copyWithColor: checked as boolean,
                        },
                      })
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="copyWithColor" className="font-normal cursor-pointer">
                      Copy + Color
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Replace brand, logo & recolor with Algonova palette
                    </p>
                  </div>
                </div>

                {/* Slightly Different */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="slightlyDifferent"
                    checked={config.simpleOptions?.slightlyDifferent}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        simpleOptions: {
                          ...config.simpleOptions!,
                          slightlyDifferent: checked as boolean,
                        },
                      })
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="slightlyDifferent" className="font-normal cursor-pointer">
                      Slightly Different
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Slightly change the character (same type)
                    </p>
                  </div>
                </div>

                {/* Based on FB data - DISABLED */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="fbData"
                    disabled
                    checked={config.simpleOptions?.fbData}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        simpleOptions: {
                          ...config.simpleOptions!,
                          fbData: checked as boolean,
                        },
                      })
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="fbData" className="font-normal cursor-pointer text-muted-foreground">
                      Based on FB data
                      <Badge variant="secondary" className="ml-2 text-xs">
                        🔒 Coming soon
                      </Badge>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Generate based on Facebook performance data
                    </p>
                  </div>
                </div>

                {/* 6 Random Variations - DISABLED */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="randomVariations"
                    disabled
                    checked={config.simpleOptions?.randomVariations}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        simpleOptions: {
                          ...config.simpleOptions!,
                          randomVariations: checked as boolean,
                        },
                      })
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="randomVariations" className="font-normal cursor-pointer text-muted-foreground">
                      6 Random Variations
                      <Badge variant="secondary" className="ml-2 text-xs">
                        🔒 Coming soon
                      </Badge>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      6 random variations for Indonesian parents
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Prompt */}
            {config.generationType === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customPrompt" className="text-sm font-semibold">
                  What changes do you want to make?
                </Label>
                <Textarea
                  id="customPrompt"
                  value={config.customPrompt}
                  onChange={(e) => setConfig({ ...config, customPrompt: e.target.value })}
                  placeholder="e.g., Replace the main character with a confident 25-year-old Indonesian woman"
                  rows={4}
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>💡 Example prompts:</p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    <li>Replace the main character with a different demographic</li>
                    <li>Change the background to a modern office setting</li>
                    <li>Update the color scheme to match our brand</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

