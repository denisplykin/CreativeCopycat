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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

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
  variationMode: 'default' | 'random' | 'custom'
  defaultOptions?: {
    copycat: boolean
    copycatWithColors: boolean
    fbData: boolean
  }
  customPrompt?: string
}

export function GenerateDialog({
  open,
  onOpenChange,
  creative,
  onGenerate,
}: GenerateDialogProps) {
  const [config, setConfig] = useState<GenerationConfig>({
    aspectRatio: 'original',
    variationMode: 'default',
    defaultOptions: {
      copycat: true,
      copycatWithColors: false,
      fbData: false,
    },
    customPrompt: '',
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await onGenerate(config)
      onOpenChange(false)
    } catch (error) {
      console.error('Generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!creative) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        onClose={() => onOpenChange(false)}
      >
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
                className="object-cover"
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
              <Label className="text-base font-semibold mb-3 block">Aspect Ratio</Label>
              <RadioGroup
                value={config.aspectRatio}
                onValueChange={(value) =>
                  setConfig({ ...config, aspectRatio: value as any })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="original" id="original" />
                  <Label htmlFor="original" className="font-normal cursor-pointer">
                    Original
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1:1" id="square" />
                  <Label htmlFor="square" className="font-normal cursor-pointer">
                    Square 1:1
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4:5" id="vertical" />
                  <Label htmlFor="vertical" className="font-normal cursor-pointer">
                    Vertical 4:5
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Variation Mode */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Variations</Label>
              <RadioGroup
                value={config.variationMode}
                onValueChange={(value) =>
                  setConfig({ ...config, variationMode: value as any })
                }
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="default" id="default" />
                    <Label htmlFor="default" className="font-normal cursor-pointer">
                      1. Default variations
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Выбрать что именно изменить (мультивыбор)
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="random" id="random" />
                    <Label htmlFor="random" className="font-normal cursor-pointer">
                      2. 6 Random variations
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Случайные вариации
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="font-normal cursor-pointer">
                      3. Custom variations
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Свой промпт
                  </p>
                </div>
              </RadioGroup>
            </div>

            {/* Default Options (multi-select checkboxes) */}
            {config.variationMode === 'default' && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold block">Select variations:</Label>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="copycat"
                    checked={config.defaultOptions?.copycat}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        defaultOptions: {
                          ...config.defaultOptions!,
                          copycat: checked as boolean,
                        },
                      })
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="copycat" className="font-normal cursor-pointer">
                      Copycat
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Replace brand name + logo only
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="copycatColors"
                    checked={config.defaultOptions?.copycatWithColors}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        defaultOptions: {
                          ...config.defaultOptions!,
                          copycatWithColors: checked as boolean,
                        },
                      })
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="copycatColors" className="font-normal cursor-pointer">
                      Copycat + Algonova color scheme
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Replace brand + recolor with Algonova palette
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="fbData"
                    disabled
                    checked={config.defaultOptions?.fbData}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        defaultOptions: {
                          ...config.defaultOptions!,
                          fbData: checked as boolean,
                        },
                      })
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="fbData" className="font-normal cursor-pointer text-muted-foreground">
                      Based on FB data
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Coming soon
                      </Badge>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use Facebook performance data
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Random Variations Info */}
            {config.variationMode === 'random' && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Generate 6 random variations with different styles, layouts, and brand replacements.
                </p>
              </div>
            )}

            {/* Custom Prompt */}
            {config.variationMode === 'custom' && (
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

