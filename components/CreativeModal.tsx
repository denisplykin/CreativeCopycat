'use client';

import { useState } from 'react';
import type { Creative } from '@/types/creative';

interface CreativeModalProps {
  creative: Creative;
  onClose: () => void;
  onGenerate: (config: GenerationConfig) => void;
}

interface GenerationConfig {
  aspectRatio: string;
  numVariations: number;
  mode: 'clone' | 'similar' | 'new_background';
}

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Square)', emoji: '⬛' },
  { value: '16:9', label: '16:9 (Landscape)', emoji: '🖥️' },
  { value: '9:16', label: '9:16 (Portrait)', emoji: '📱' },
  { value: '4:5', label: '4:5 (Instagram)', emoji: '📸' },
];

const GENERATION_MODES = [
  {
    id: 'clone',
    title: '🎯 Full Clone',
    description: 'Exact copy adapted for Algonova branding',
    subtitle: 'Same style, Algonova colors',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'similar',
    title: '✨ Similar Style',
    description: 'Similar concept with creative variations',
    subtitle: 'Keep vibe, change details',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'new_background',
    title: '🌈 New Background',
    description: 'Fresh background, keep text structure',
    subtitle: 'Bold new look',
    color: 'from-purple-500 to-pink-600',
  },
];

export default function CreativeModal({ creative, onClose, onGenerate }: CreativeModalProps) {
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [numVariations, setNumVariations] = useState(3);
  const [selectedMode, setSelectedMode] = useState<'clone' | 'similar' | 'new_background'>('clone');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate({
        aspectRatio,
        numVariations,
        mode: selectedMode,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-black gradient-text mb-2">
              {creative.competitor_name}
            </h2>
            <p className="text-gray-400">Configure and generate variations</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Preview */}
          <div>
            <div className="glass rounded-2xl p-4 mb-4">
              <img
                src={creative.original_image_url}
                alt={creative.competitor_name || 'Creative'}
                className="w-full rounded-xl"
              />
            </div>

            {/* Analysis Info */}
            {creative.analysis && (
              <div className="glass-dark rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">📝 Text blocks:</span>
                  <span className="font-bold">{creative.analysis.ocr?.blocks?.length || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">🌐 Language:</span>
                  <span className="font-bold uppercase">{creative.analysis.language || 'en'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">💯 Confidence:</span>
                  <span className="font-bold">
                    {((creative.analysis.ocr?.confidence || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                {creative.analysis.dominant_colors && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">🎨 Colors:</span>
                    <div className="flex gap-1">
                      {creative.analysis.dominant_colors.slice(0, 5).map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-lg border border-white/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Settings */}
          <div className="space-y-6">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-300">
                📐 Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`aspect-ratio-btn ${
                      aspectRatio === ratio.value ? 'active' : ''
                    }`}
                  >
                    <div className="text-2xl mb-1">{ratio.emoji}</div>
                    <div className="font-bold">{ratio.value}</div>
                    <div className="text-xs text-gray-400">{ratio.label.split('(')[1]?.replace(')', '')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Variations */}
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-300">
                🔢 Number of Variations
              </label>
              <div className="glass-dark rounded-2xl p-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={numVariations}
                  onChange={(e) => setNumVariations(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #FF6B35 0%, #FF6B35 ${numVariations * 10}%, rgba(255,255,255,0.1) ${numVariations * 10}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-2xl font-black gradient-text">{numVariations}</span>
                  <span className="text-sm text-gray-400">variations</span>
                </div>
              </div>
            </div>

            {/* Generation Mode */}
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-300">
                🎨 Generation Mode
              </label>
              <div className="space-y-3">
                {GENERATION_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id as any)}
                    className={`gen-mode-btn w-full ${
                      selectedMode === mode.id
                        ? 'border-orange-500/50 shadow-lg'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`text-3xl`}>
                        {mode.title.split(' ')[0]}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-lg mb-1">
                          {mode.title.slice(2)}
                        </div>
                        <div className="text-sm text-gray-400">
                          {mode.description}
                        </div>
                        {selectedMode === mode.id && (
                          <div className={`text-xs mt-2 font-medium bg-gradient-to-r ${mode.color} bg-clip-text text-transparent`}>
                            ✓ {mode.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="loading-spinner" />
                  Generating...
                </span>
              ) : (
                <span>🚀 Generate {numVariations} Variations</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

