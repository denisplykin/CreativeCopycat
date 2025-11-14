'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type {
  Creative,
  CreativeAnalysis,
  CreativeVariant,
  CopyMode,
  StylePreset,
} from '@/types/creative';

export default function CreativeDetailPage() {
  const params = useParams();
  const creativeId = params.id as string;

  const [creative, setCreative] = useState<Creative & { imageUrl: string } | null>(null);
  const [analysis, setAnalysis] = useState<CreativeAnalysis | null>(null);
  const [variants, setVariants] = useState<
    (CreativeVariant & { renderedUrl: string; backgroundUrl: string | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedCopyMode, setSelectedCopyMode] = useState<CopyMode>('simple_overlay');
  const [selectedStylePreset, setSelectedStylePreset] = useState<StylePreset>('original');
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCreativeData();
  }, [creativeId]);

  const fetchCreativeData = async () => {
    try {
      const response = await fetch(`/api/creatives/${creativeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch creative');
      }
      const data = await response.json();
      setCreative(data.creative);
      setAnalysis(data.analysis);
      setVariants(data.variants);
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

      if (!response.ok) {
        throw new Error('Failed to analyze creative');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateCopy = async () => {
    if (!analysis) {
      setError('Please analyze the creative first');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeId,
          copyMode: selectedCopyMode,
          stylePreset: selectedStylePreset,
          texts: Object.keys(customTexts).length > 0 ? customTexts : undefined,
          language: 'en',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate copy');
      }

      // Refresh variants
      await fetchCreativeData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateVariation = async (variantType: string) => {
    if (!analysis) {
      setError('Please analyze the creative first');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-variation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeId,
          variantType,
          stylePreset: selectedStylePreset,
          language: 'en',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate variation');
      }

      // Refresh variants
      await fetchCreativeData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading creative...</p>
        </div>
      </div>
    );
  }

  if (!creative) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Creative not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Original Image */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Original Creative</h2>
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="relative aspect-square mb-4">
              <Image
                src={creative.imageUrl}
                alt="Creative"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Platform:</strong> {creative.platform}
              </p>
              <p>
                <strong>Size:</strong> {creative.width}×{creative.height}
              </p>
              <p>
                <strong>Created:</strong>{' '}
                {new Date(creative.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Analysis & Actions */}
        <div className="space-y-6">
          {/* Analysis Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Analysis</h2>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {analyzing ? 'Analyzing...' : analysis ? 'Re-analyze' : 'Analyze'}
              </button>
            </div>

            {analysis ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Text Roles</h3>
                  <div className="space-y-2">
                    {analysis.roles_json.map((role, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-3">
                        <span className="text-xs font-semibold text-blue-600 uppercase">
                          {role.role}
                        </span>
                        <p className="text-sm">{role.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Properties</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Language:</span>{' '}
                      <span className="font-medium">{analysis.language}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Aspect Ratio:</span>{' '}
                      <span className="font-medium">{analysis.aspect_ratio}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Dominant Colors</h3>
                  <div className="flex gap-2">
                    {analysis.dominant_colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-10 h-10 rounded border-2 border-gray-300"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Click "Analyze" to analyze this creative</p>
            )}
          </div>

          {/* Copy Modes Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Copy Modes (Experiments)</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Copy Mode</label>
                <select
                  value={selectedCopyMode}
                  onChange={(e) => setSelectedCopyMode(e.target.value as CopyMode)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="simple_overlay">Simple Overlay (Fast)</option>
                  <option value="dalle_inpaint">DALL·E Inpaint (Clean Background)</option>
                  <option value="bg_regen">DALL·E New Background</option>
                  <option value="new_text_pattern">New Text via LLM</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Style Preset</label>
                <select
                  value={selectedStylePreset}
                  onChange={(e) => setSelectedStylePreset(e.target.value as StylePreset)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={selectedCopyMode === 'simple_overlay'}
                >
                  <option value="original">Original</option>
                  <option value="anime">Anime</option>
                  <option value="sakura">Sakura</option>
                  <option value="realistic">Realistic</option>
                  <option value="3d">3D</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <button
                onClick={handleGenerateCopy}
                disabled={generating || !analysis}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {generating ? 'Generating...' : 'Generate Copy'}
              </button>
            </div>
          </div>

          {/* Variations Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Generate Variations</h2>

            <div className="space-y-2">
              <button
                onClick={() => handleGenerateVariation('variation_text')}
                disabled={generating || !analysis}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-left"
              >
                New Text, Same Style
              </button>
              <button
                onClick={() => handleGenerateVariation('variation_style')}
                disabled={generating || !analysis}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-left"
              >
                New Style, Same Text
              </button>
              <button
                onClick={() => handleGenerateVariation('variation_structure')}
                disabled={generating || !analysis}
                className="w-full px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-left"
              >
                Complete Regeneration
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Variants */}
      {variants.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Generated Variants</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {variants.map((variant) => (
              <div key={variant.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="relative aspect-square">
                  <Image
                    src={variant.renderedUrl}
                    alt={`Variant ${variant.variant_type}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {variant.variant_type}
                    </span>
                    {variant.copy_mode && (
                      <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded">
                        {variant.copy_mode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {variant.style_preset} • {variant.language}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(variant.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

