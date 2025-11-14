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

  // Form states
  const [selectedGenerationType, setSelectedGenerationType] = useState<GenerationType>('full_creative');
  const [selectedStylePreset, setSelectedStylePreset] = useState<StylePreset>('original');

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
      setCreative(data.creative);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!creative?.analysis) {
      setError('Please analyze the creative first');
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
        throw new Error(errorData.details || 'Failed to generate');
      }

      // Refresh data
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
                src={creative.original_image_url}
                alt="Creative"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Status:</strong>{' '}
                <span className={`px-2 py-1 rounded text-xs ${
                  creative.status === 'completed' ? 'bg-green-100 text-green-800' :
                  creative.status === 'analyzing' ? 'bg-blue-100 text-blue-800' :
                  creative.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                  creative.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {creative.status}
                </span>
              </p>
              {creative.competitor_name && (
                <p>
                  <strong>Competitor:</strong> {creative.competitor_name}
                </p>
              )}
              <p>
                <strong>Created:</strong>{' '}
                {new Date(creative.created_at).toLocaleString()}
              </p>
              {creative.error_message && (
                <p className="text-red-600">
                  <strong>Error:</strong> {creative.error_message}
                </p>
              )}
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
                disabled={analyzing || creative.status === 'analyzing'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {analyzing ? 'Analyzing...' : creative.analysis ? 'Re-analyze' : 'Analyze'}
              </button>
            </div>

            {creative.analysis ? (
              <div className="space-y-4">
                {creative.analysis.roles && creative.analysis.roles.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Text Roles</h3>
                    <div className="space-y-2">
                      {creative.analysis.roles.map((role, idx) => (
                        <div key={idx} className="border-l-4 border-blue-500 pl-3">
                          <span className="text-xs font-semibold text-blue-600 uppercase">
                            {role.role}
                          </span>
                          <p className="text-sm">{role.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {creative.analysis.language && (
                    <div>
                      <span className="text-gray-600">Language:</span>{' '}
                      <span className="font-medium">{creative.analysis.language}</span>
                    </div>
                  )}
                  {creative.analysis.aspect_ratio && (
                    <div>
                      <span className="text-gray-600">Aspect Ratio:</span>{' '}
                      <span className="font-medium">{creative.analysis.aspect_ratio}</span>
                    </div>
                  )}
                </div>

                {creative.analysis.dominant_colors && creative.analysis.dominant_colors.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Dominant Colors</h3>
                    <div className="flex gap-2">
                      {creative.analysis.dominant_colors.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-10 h-10 rounded border-2 border-gray-300"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Click "Analyze" to analyze this creative</p>
            )}
          </div>

          {/* Generation Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Generate</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Generation Type</label>
                <select
                  value={selectedGenerationType}
                  onChange={(e) => setSelectedGenerationType(e.target.value as GenerationType)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="character">Character Only</option>
                  <option value="background">Background Only</option>
                  <option value="full_creative">Full Creative</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Style Preset</label>
                <select
                  value={selectedStylePreset}
                  onChange={(e) => setSelectedStylePreset(e.target.value as StylePreset)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                onClick={handleGenerate}
                disabled={generating || !creative.analysis || creative.status === 'generating'}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Generated Results */}
          {(creative.generated_character_url || creative.generated_background_url || creative.generated_image_url) && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Generated</h2>
              <div className="space-y-4">
                {creative.generated_character_url && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Character</h3>
                    <div className="relative aspect-square bg-gray-100 rounded">
                      <Image
                        src={creative.generated_character_url}
                        alt="Generated character"
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                )}
                {creative.generated_background_url && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Background</h3>
                    <div className="relative aspect-square bg-gray-100 rounded">
                      <Image
                        src={creative.generated_background_url}
                        alt="Generated background"
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                )}
                {creative.generated_image_url && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Full Creative</h3>
                    <div className="relative aspect-square bg-gray-100 rounded">
                      <Image
                        src={creative.generated_image_url}
                        alt="Generated creative"
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 50vw"
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
