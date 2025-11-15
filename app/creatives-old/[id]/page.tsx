'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type {
  Creative,
  StylePreset,
  GenerationType,
} from '@/types/creative';

export default function CreativeDetailPage() {
  const params = useParams();
  const creativeId = params.id as string;

  const [creative, setCreative] = useState<Creative | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedGenerationType, setSelectedGenerationType] = useState<GenerationType>('full_creative');
  const [selectedStylePreset, setSelectedStylePreset] = useState<StylePreset>('anime');

  useEffect(() => {
    fetchCreativeData();
  }, [creativeId]);

  const fetchCreativeData = async () => {
    try {
      const response = await fetch(`/api/creatives/${creativeId}`);
      if (!response.ok) throw new Error('Failed to fetch creative');
      const data = await response.json();
      setCreative(data.creative);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creativeId }),
      });
      if (!response.ok) throw new Error('Failed to analyze');
      const data = await response.json();
      setCreative(data.creative);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!creative?.analysis) {
      setError('Please analyze first! 🔍');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeId,
          generationType: selectedGenerationType,
          stylePreset: selectedStylePreset,
          language: 'en',
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Generation failed');
      }
      await fetchCreativeData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="text-center">
          <div className="text-8xl mb-8 float-animation">🎨</div>
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
          <p className="mt-6 text-2xl font-bold text-white">Loading magic...</p>
        </div>
      </div>
    );
  }

  if (!creative) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="gradient-card p-12 max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🔍</div>
          <h2 className="text-3xl font-black text-gray-800 mb-4">Creative not found</h2>
          <a href="/creatives" className="btn-primary inline-block mt-6">
            ← Back to Library
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      {error && (
        <div className="gradient-card p-6 mb-8 border-l-8 border-red-500 pulse-glow">
          <div className="flex items-center">
            <span className="text-4xl mr-4">⚠️</span>
            <p className="text-lg font-bold text-gray-800">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Left Column: Original */}
        <div className="space-y-8">
          <div className="gradient-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Original Creative 🎯
              </h2>
            </div>
            
            <div className="relative aspect-square bg-gradient-to-br from-purple-200 to-pink-200 rounded-2xl overflow-hidden mb-6">
              <Image
                src={creative.original_image_url}
                alt="Creative"
                fill
                className="object-contain"
                sizes="(max-width: 1280px) 100vw, 50vw"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl">
                <span className="font-bold text-gray-700">Status:</span>
                <span className="text-2xl">{creative.status === 'completed' ? '✅' : creative.status === 'analyzing' ? '🔍' : creative.status === 'generating' ? '🎨' : '⏳'}</span>
              </div>
              {creative.competitor_name && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                  <span className="font-bold text-gray-700">Competitor: </span>
                  <span className="text-lg">{creative.competitor_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="space-y-8">
          {/* Analysis Section */}
          <div className="gradient-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-gray-800 flex items-center">
                <span className="mr-3">🔍</span>
                Analysis
              </h2>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || creative.status === 'analyzing'}
                className="btn-secondary"
              >
                {analyzing ? '⏳ Analyzing...' : creative.analysis ? '🔄 Re-analyze' : '🚀 Analyze'}
              </button>
            </div>

            {creative.analysis ? (
              <div className="space-y-6">
                {creative.analysis.roles && creative.analysis.roles.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <span className="text-2xl mr-2">💬</span>
                      Text Roles
                    </h3>
                    <div className="space-y-3">
                      {creative.analysis.roles.map((role, idx) => (
                        <div key={idx} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-l-4 border-purple-500">
                          <span className="text-xs font-black text-purple-600 uppercase tracking-wider">{role.role}</span>
                          <p className="text-gray-800 mt-1">{role.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {creative.analysis.dominant_colors && creative.analysis.dominant_colors.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <span className="text-2xl mr-2">🎨</span>
                      Colors
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                      {creative.analysis.dominant_colors.map((color, idx) => (
                        <div key={idx} className="group relative">
                          <div
                            className="w-16 h-16 rounded-xl shadow-lg hover:scale-110 transition-transform cursor-pointer"
                            style={{ backgroundColor: color }}
                          />
                          <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-mono text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {color}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤔</div>
                <p className="text-xl text-gray-600">Click "Analyze" to start the magic!</p>
              </div>
            )}
          </div>

          {/* Generation Section */}
          <div className="gradient-card p-8">
            <h2 className="text-3xl font-black text-gray-800 mb-6 flex items-center">
              <span className="mr-3">✨</span>
              Generate
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                  🎯 Generation Type
                </label>
                <select
                  value={selectedGenerationType}
                  onChange={(e) => setSelectedGenerationType(e.target.value as GenerationType)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  <option value="character">👤 Character Only</option>
                  <option value="background">🖼️ Background Only</option>
                  <option value="full_creative">🎨 Full Creative</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                  🎭 Style Preset
                </label>
                <select
                  value={selectedStylePreset}
                  onChange={(e) => setSelectedStylePreset(e.target.value as StylePreset)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-medium focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
                >
                  <option value="anime">🌸 Anime</option>
                  <option value="sakura">🌺 Sakura</option>
                  <option value="realistic">📸 Realistic</option>
                  <option value="3d">🎮 3D</option>
                  <option value="minimal">⚪ Minimal</option>
                  <option value="original">✨ Original</option>
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !creative.analysis || creative.status === 'generating'}
                className="w-full btn-primary text-xl py-4"
              >
                {generating ? '⏳ Generating Magic...' : '🚀 Generate Now!'}
              </button>
            </div>
          </div>

          {/* Generated Results */}
          {(creative.generated_character_url || creative.generated_background_url || creative.generated_image_url) && (
            <div className="gradient-card p-8">
              <h2 className="text-3xl font-black text-gray-800 mb-6 flex items-center">
                <span className="mr-3">🎉</span>
                Generated Results
              </h2>
              <div className="space-y-6">
                {creative.generated_image_url && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-700 mb-3 flex items-center">
                      <span className="text-2xl mr-2">🎨</span>
                      Full Creative
                    </h3>
                    <div className="relative aspect-square bg-gradient-to-br from-yellow-100 to-pink-100 rounded-2xl overflow-hidden">
                      <Image
                        src={creative.generated_image_url}
                        alt="Generated"
                        fill
                        className="object-contain"
                        sizes="(max-width: 1280px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
