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
  { value: '9:16', label: '9:16 📱 Portrait (Facebook)', emoji: '📱' },
  { value: '1:1', label: '1:1 ⬛ Square', emoji: '⬛' },
  { value: '16:9', label: '16:9 🖥️ Landscape', emoji: '🖥️' },
  { value: '4:5', label: '4:5 📸 Instagram', emoji: '📸' },
];

const NUM_VARIATIONS_OPTIONS = [
  { value: 1, label: '1 variation' },
  { value: 2, label: '2 variations' },
  { value: 3, label: '3 variations' },
  { value: 5, label: '5 variations' },
  { value: 10, label: '10 variations' },
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
  const [aspectRatio, setAspectRatio] = useState('9:16'); // Default to Facebook portrait
  const [numVariations, setNumVariations] = useState(3);
  const [selectedMode, setSelectedMode] = useState<'clone' | 'similar' | 'new_background'>('clone');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creativeId: creative.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      alert('✅ Analysis complete! Refresh to see results.');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!creative.analysis) {
      setError('Please analyze the creative first!');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      await onGenerate({
        aspectRatio,
        numVariations,
        mode: selectedMode,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
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
            {creative.analysis ? (
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
            ) : (
              <div className="glass-dark rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-300 font-medium mb-4">Not analyzed yet</p>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="btn-primary w-full"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="loading-spinner" />
                      Analyzing...
                    </span>
                  ) : (
                    '🔍 Analyze Creative'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right: Settings */}
          <div className="space-y-6">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">
                📐 Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="select-glass w-full font-medium"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Number of Variations */}
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">
                🔢 Number of Variations
              </label>
              <select
                value={numVariations}
                onChange={(e) => setNumVariations(parseInt(e.target.value))}
                className="select-glass w-full font-medium"
              >
                {NUM_VARIATIONS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Generation Mode */}
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">
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

            {/* Error Message */}
            {error && (
              <div className="error-box">
                <div className="text-2xl">⚠️</div>
                <div>
                  <p className="font-bold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !creative.analysis}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="loading-spinner" />
                  Generating...
                </span>
              ) : !creative.analysis ? (
                <span>⚠️ Analyze First</span>
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

