'use client';

import { useState, useEffect } from 'react';
import type { Creative } from '@/types/creative';
import CreativeModal from '@/components/CreativeModal';

export default function CreativesPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [competitorFilter, setCompetitorFilter] = useState<string>('all');
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  
  const itemsPerPage = 20;

  // Get unique competitors
  const competitors = ['all', ...Array.from(new Set(creatives.map(c => c.competitor_name).filter(Boolean) as string[])).sort()];

  useEffect(() => {
    fetchCreatives();
  }, []);

  // Auto-analyze first 6 pending creatives
  useEffect(() => {
    if (creatives.length > 0) {
      autoAnalyzeFirst6();
    }
  }, [creatives.length]);

  const autoAnalyzeFirst6 = async () => {
    const pendingCreatives = creatives
      .filter(c => c.status === 'pending')
      .slice(0, 6);

    if (pendingCreatives.length === 0) return;

    console.log(`🔍 Auto-analyzing first ${pendingCreatives.length} creatives...`);

    for (const creative of pendingCreatives) {
      try {
        // Start analysis (don't wait)
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creativeId: creative.id }),
        }).catch(err => console.error('Auto-analyze error:', err));

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error('Failed to start auto-analysis:', err);
      }
    }
  };

  const fetchCreatives = async () => {
    try {
      const response = await fetch('/api/creatives');
      if (!response.ok) throw new Error('Failed to fetch creatives');
      const data = await response.json();
      setCreatives(data.creatives || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCreative = async (creativeId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Don't open modal

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creativeId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      // Refresh list to show updated status
      setTimeout(fetchCreatives, 1000);
    } catch (err) {
      alert('❌ Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleGenerate = async (config: any) => {
    if (!selectedCreative) return;

    try {
      // Map UI mode to copyMode
      const copyModeMap: Record<string, 'dalle_simple' | 'character_swap'> = {
        'dalle_simple': 'dalle_simple',
        'character_swap': 'character_swap',
      };

      // Call generate API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creativeId: selectedCreative.id,
          generationType: 'full_creative',
          copyMode: copyModeMap[config.mode] || 'simple_overlay',
          aspectRatio: config.aspectRatio,
          numVariations: config.numVariations,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      console.log('✅ Generation result:', result);

      alert('✅ Generation complete! Refresh to see results.');
      setSelectedCreative(null);
      fetchCreatives(); // Refresh list
    } catch (err) {
      console.error('Generation error:', err);
      alert('❌ Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Filter creatives
  const filteredCreatives = creatives.filter(creative => {
    const matchesSearch = creative.competitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesStatus = statusFilter === 'all' || creative.status === statusFilter;
    const matchesCompetitor = competitorFilter === 'all' || creative.competitor_name === competitorFilter;
    return matchesSearch && matchesStatus && matchesCompetitor;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCreatives.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCreatives = filteredCreatives.slice(startIndex, startIndex + itemsPerPage);

  // Status counts
  const statusCounts = {
    all: creatives.length,
    pending: creatives.filter(c => c.status === 'pending').length,
    analyzing: creatives.filter(c => c.status === 'analyzing').length,
    completed: creatives.filter(c => c.status === 'completed').length,
    failed: creatives.filter(c => c.status === 'failed').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-dark rounded-3xl p-12 text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-xl font-bold">Loading creatives...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="error-box max-w-md">
          <div className="text-4xl">❌</div>
          <div>
            <h2 className="text-xl font-bold mb-1">Error</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 content-wrapper">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center animate-fade-in">
          <h1 className="text-6xl font-black mb-4 gradient-text">
            🎨 Creative Copycat
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            Analyze & generate competitor creatives powered by AI 🔥
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-8 glass-card animate-float">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries({
              all: { label: 'Total', emoji: '📊', color: 'from-cyan-500 to-blue-600' },
              pending: { label: 'Pending', emoji: '⏳', color: 'from-yellow-500 to-orange-500' },
              analyzing: { label: 'Analyzing', emoji: '🔍', color: 'from-purple-500 to-pink-500' },
              completed: { label: 'Done', emoji: '✅', color: 'from-green-500 to-emerald-600' },
              failed: { label: 'Failed', emoji: '❌', color: 'from-red-500 to-pink-600' },
            }).map(([key, { label, emoji, color }]) => (
              <button
                key={key}
                onClick={() => {
                  setStatusFilter(key);
                  setCurrentPage(1);
                }}
                className={`p-4 rounded-2xl transition-all hover:scale-105 ${
                  statusFilter === key
                    ? `bg-gradient-to-r ${color} text-white shadow-xl scale-105`
                    : 'glass-dark hover:bg-white/10'
                }`}
              >
                <div className="text-3xl mb-1">{emoji}</div>
                <div className="text-2xl font-bold">{statusCounts[key as keyof typeof statusCounts]}</div>
                <div className="text-xs font-medium opacity-90">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Competitor Filter */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-3 text-gray-700">
            🏢 Filter by Competitor
          </label>
          <select
            value={competitorFilter}
            onChange={(e) => {
              setCompetitorFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="select-glass w-full font-medium"
          >
            {competitors.map((competitor) => (
              <option key={competitor} value={competitor}>
                {competitor === 'all' ? '📊 All Competitors' : competitor}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="🔍 Search competitors..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="input-glass w-full"
          />
        </div>

        {/* Pagination Info */}
        <div className="mb-6 text-center text-gray-600 font-medium">
          Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCreatives.length)} of {filteredCreatives.length}
        </div>

        {/* Creatives Grid */}
        {paginatedCreatives.length === 0 ? (
          <div className="glass-dark rounded-3xl p-20 text-center">
            <div className="text-6xl mb-4">🤷</div>
            <p className="text-xl text-gray-300">No creatives found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {paginatedCreatives.map((creative) => (
              <div
                key={creative.id}
                onClick={() => setSelectedCreative(creative)}
                className="glass-card cursor-pointer group overflow-hidden animate-fade-in"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-orange-500/10 to-purple-500/10 rounded-2xl">
                  <img
                    src={creative.original_image_url}
                    alt={creative.competitor_name || 'Creative'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {creative.status === 'analyzing' ? (
                      <span className="analyzing-badge">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing
                      </span>
                    ) : (
                      <span className={`status-badge ${
                        creative.status === 'completed' ? 'bg-green-500/90 text-white' : ''
                      }${
                        creative.status === 'pending' ? 'bg-yellow-500/90 text-white' : ''
                      }${
                        creative.status === 'failed' ? 'bg-red-500/90 text-white' : ''
                      }`}>
                        {creative.status === 'completed' && '✅'}
                        {creative.status === 'pending' && '⏳'}
                        {creative.status === 'failed' && '❌'}
                      </span>
                    )}
                  </div>

                  {/* Analyze Button - Show for pending/failed */}
                  {(creative.status === 'pending' || creative.status === 'failed') && !creative.analysis && (
                    <button
                      onClick={(e) => handleAnalyzeCreative(creative.id, e)}
                      className="analyze-btn"
                    >
                      🔍 Analyze
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-orange-500 transition-colors">
                    {creative.competitor_name || 'Unknown'}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span>🕐 {new Date(creative.created_at).toLocaleDateString('en')}</span>
                  </div>

                  {/* Analysis Info */}
                  {creative.analysis && (
                    <div className="mt-2 flex gap-1 flex-wrap mb-3">
                      {creative.analysis.ocr && (
                        <span className="px-2 py-1 glass-dark text-cyan-700 rounded-lg text-xs font-medium">
                          📝 {creative.analysis.ocr.blocks?.length || 0} blocks
                        </span>
                      )}
                      {creative.analysis.dominant_colors && creative.analysis.dominant_colors.length > 0 && (
                        <span className="px-2 py-1 glass-dark text-pink-700 rounded-lg text-xs font-medium">
                          🎨 {creative.analysis.dominant_colors.length} colors
                        </span>
                      )}
                    </div>
                  )}

                  {/* Generated Variants Slots */}
                  {(creative.generated_image_url || creative.generated_background_url || creative.generated_character_url) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs font-bold text-gray-600 mb-2">🎨 Generated Variants:</div>
                      <div className="grid grid-cols-3 gap-2">
                        {/* Full Creative */}
                        {creative.generated_image_url && (
                          <div className="relative group/img">
                            <img
                              src={creative.generated_image_url}
                              alt="Generated"
                              className="w-full h-20 object-cover rounded-lg border-2 border-green-400 hover:scale-105 transition-transform cursor-zoom-in"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(creative.generated_image_url!, '_blank');
                              }}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-bold text-center px-1">🎯 Full Creative</span>
                            </div>
                          </div>
                        )}

                        {/* Background */}
                        {creative.generated_background_url && (
                          <div className="relative group/img">
                            <img
                              src={creative.generated_background_url}
                              alt="Background"
                              className="w-full h-20 object-cover rounded-lg border-2 border-purple-400 hover:scale-105 transition-transform cursor-zoom-in"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(creative.generated_background_url!, '_blank');
                              }}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-bold text-center px-1">🌈 Background</span>
                            </div>
                          </div>
                        )}

                        {/* Character */}
                        {creative.generated_character_url && (
                          <div className="relative group/img">
                            <img
                              src={creative.generated_character_url}
                              alt="Character"
                              className="w-full h-20 object-cover rounded-lg border-2 border-blue-400 hover:scale-105 transition-transform cursor-zoom-in"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(creative.generated_character_url!, '_blank');
                              }}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-bold text-center px-1">👤 Character</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedCreative && (
          <CreativeModal
            creative={selectedCreative}
            onClose={() => setSelectedCreative(null)}
            onGenerate={handleGenerate}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-glass disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            
            <div className="flex gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-12 h-12 rounded-xl font-bold transition-all ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-xl scale-110'
                        : 'glass hover:scale-105'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              {totalPages > 5 && (
                <>
                  <span className="px-4 py-3 text-gray-500">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-12 h-12 rounded-xl font-bold transition-all ${
                      currentPage === totalPages
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-xl scale-110'
                        : 'glass hover:scale-105'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-glass disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Forward →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
