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
  mode: 'clone' | 'similar' | 'new_background' | 'old_style';
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
  {
    id: 'old_style',
    title: '🎨 Old Style (Midjourney)',
    description: 'Uses analyzed prompts for Midjourney/Flux generation',
    subtitle: 'AI-generated from scratch',
    color: 'from-yellow-500 to-orange-600',
  },
];

export default function CreativeModal({ creative, onClose, onGenerate }: CreativeModalProps) {
  const [aspectRatio, setAspectRatio] = useState('9:16'); // Default to Facebook portrait
  const [numVariations, setNumVariations] = useState(3);
  const [selectedMode, setSelectedMode] = useState<'clone' | 'similar' | 'new_background' | 'old_style'>('clone');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

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

  const handleGenerate = async (config: GenerationConfig) => {
    if (!creative.analysis) {
      setError('Please analyze the creative first!');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 2000);

      await onGenerate(config);

      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      // Refresh after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 2500);
    }
  };

  const handleGenerateAll = async () => {
    if (!creative.analysis) {
      setError('Please analyze the creative first!');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);
    
    try {
      console.log('🚀 Generating ALL variants...');
      
      // Generate all 4 modes sequentially
      for (let i = 0; i < GENERATION_MODES.length; i++) {
        const mode = GENERATION_MODES[i];
        console.log(`🎨 Generating ${mode.title}...`);
        
        setGenerationProgress(Math.floor((i / GENERATION_MODES.length) * 100));
        
        await onGenerate({
          aspectRatio,
          numVariations: 1, // 1 variant per mode when generating all
          mode: mode.id as any,
        });
        
        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setGenerationProgress(100);
      
      // Refresh after completion
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 2500);
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
              <>
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
                  
                  {/* Design elements summary */}
                  {creative.analysis.design && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">👤 Characters:</span>
                        <span className="font-bold">{creative.analysis.design.characters?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">🎯 Graphics:</span>
                        <span className="font-bold">{creative.analysis.design.graphics?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📐 Background:</span>
                        <span className="font-bold">{creative.analysis.design.background?.type || 'unknown'}</span>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm font-medium"
                  >
                    {showDetails ? '📕 Hide Details' : '📖 Show Full Details'}
                  </button>
                </div>

                {/* Full Details Panel */}
                {showDetails && (
                  <div className="glass-dark rounded-2xl p-4 max-h-96 overflow-y-auto">
                    <h4 className="font-bold mb-3 text-gray-800">📊 Complete Analysis</h4>
                    <pre className="text-xs bg-black/20 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(creative.analysis, null, 2)}
                    </pre>
                  </div>
                )}
              </>
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

            {/* Generation Buttons */}
            <div>
              <label className="block text-sm font-bold mb-3 text-gray-700">
                🎨 Choose Generation Mode
              </label>
              <div className="space-y-3">
                {GENERATION_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleGenerate({ aspectRatio, numVariations, mode: mode.id as any })}
                    disabled={isGenerating || !creative.analysis}
                    className={`w-full text-left p-4 rounded-xl transition-all bg-gradient-to-r ${mode.color} text-white hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
                  >
                    <h4 className="font-bold text-lg mb-1">{mode.title}</h4>
                    <p className="text-sm opacity-90">{mode.subtitle}</p>
                  </button>
                ))}
                
                {/* Generate ALL Button */}
                <button
                  onClick={() => handleGenerateAll()}
                  disabled={isGenerating || !creative.analysis}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white font-bold text-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>🚀 Generate ALL Variants</span>
                  </div>
                  <p className="text-sm font-normal opacity-90 mt-1">Creates all 4 modes simultaneously</p>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isGenerating && (
              <div className="glass-dark rounded-2xl p-4">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="loading-spinner" />
                  <span className="font-bold">Generating {generationProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}

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
          </div>
        </div>

        {/* Generated Variants Section */}
        {creative.generated_image_url && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">🎨 Generated Variants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Main Generated Image */}
              {creative.generated_image_url && (
                <div className="glass-card overflow-hidden">
                  <img
                    src={creative.generated_image_url}
                    alt="Generated variant"
                    className="w-full rounded-xl"
                  />
                  <div className="p-3 text-center">
                    <div className="font-bold text-gray-700 mb-2">
                      🎯 Latest Generation
                    </div>
                    <a
                      href={creative.generated_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      📥 Open Full Size
                    </a>
                  </div>
                </div>
              )}
              
              {/* Background variant */}
              {creative.generated_background_url && (
                <div className="glass-card overflow-hidden">
                  <img
                    src={creative.generated_background_url}
                    alt="Generated background"
                    className="w-full rounded-xl"
                  />
                  <div className="p-3 text-center">
                    <div className="font-bold text-gray-700 mb-2">
                      🌈 Background
                    </div>
                    <a
                      href={creative.generated_background_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      📥 Open Full Size
                    </a>
                  </div>
                </div>
              )}
              
              {/* Character variant */}
              {creative.generated_character_url && (
                <div className="glass-card overflow-hidden">
                  <img
                    src={creative.generated_character_url}
                    alt="Generated character"
                    className="w-full rounded-xl"
                  />
                  <div className="p-3 text-center">
                    <div className="font-bold text-gray-700 mb-2">
                      👤 Character
                    </div>
                    <a
                      href={creative.generated_character_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      📥 Open Full Size
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

