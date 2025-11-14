'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Creative } from '@/types/creative';

export default function CreativesPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const itemsPerPage = 20;

  useEffect(() => {
    fetchCreatives();
  }, []);

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

  // Filter creatives
  const filteredCreatives = creatives.filter(creative => {
    const matchesSearch = creative.competitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesStatus = statusFilter === 'all' || creative.status === statusFilter;
    return matchesSearch && matchesStatus;
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🔄</div>
          <p className="text-xl font-bold text-gray-800">Загружаем креативы...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            🎨 Creative Copycat
          </h1>
          <p className="text-xl text-gray-700 font-medium">
            Анализируем и копируем креативы конкурентов 🔥
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-8 bg-white rounded-3xl shadow-lg p-6 animate-float">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries({
              all: { label: 'Всего', emoji: '📊', color: 'from-blue-500 to-cyan-500' },
              pending: { label: 'Ожидают', emoji: '⏳', color: 'from-yellow-500 to-orange-500' },
              analyzing: { label: 'Анализ', emoji: '🔍', color: 'from-purple-500 to-pink-500' },
              completed: { label: 'Готово', emoji: '✅', color: 'from-green-500 to-emerald-500' },
              failed: { label: 'Ошибки', emoji: '❌', color: 'from-red-500 to-pink-500' },
            }).map(([key, { label, emoji, color }]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`p-4 rounded-2xl transition-all hover:scale-105 ${
                  statusFilter === key
                    ? `bg-gradient-to-r ${color} text-white shadow-xl`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-3xl mb-1">{emoji}</div>
                <div className="text-2xl font-bold">{statusCounts[key as keyof typeof statusCounts]}</div>
                <div className="text-xs font-medium opacity-90">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="🔍 Поиск по конкуренту..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-6 py-4 text-lg rounded-2xl border-2 border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all outline-none"
          />
        </div>

        {/* Pagination Info */}
        <div className="mb-6 text-center text-gray-700 font-medium">
          Показано {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCreatives.length)} из {filteredCreatives.length}
        </div>

        {/* Creatives Grid */}
        {paginatedCreatives.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤷</div>
            <p className="text-xl text-gray-600">Креативы не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {paginatedCreatives.map((creative) => (
              <Link
                key={creative.id}
                href={`/creatives/${creative.id}`}
                className="group bg-white rounded-3xl shadow-lg overflow-hidden hover:shadow-2xl transition-all hover:scale-105 animate-fade-in"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
                  <img
                    src={creative.original_image_url}
                    alt={creative.competitor_name || 'Creative'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm
                      ${creative.status === 'completed' ? 'bg-green-500/90 text-white' : ''}
                      ${creative.status === 'pending' ? 'bg-yellow-500/90 text-white' : ''}
                      ${creative.status === 'analyzing' ? 'bg-purple-500/90 text-white' : ''}
                      ${creative.status === 'failed' ? 'bg-red-500/90 text-white' : ''}
                    `}>
                      {creative.status === 'completed' && '✅'}
                      {creative.status === 'pending' && '⏳'}
                      {creative.status === 'analyzing' && '🔍'}
                      {creative.status === 'failed' && '❌'}
                      {creative.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {creative.competitor_name || 'Unknown'}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>🕐 {new Date(creative.created_at).toLocaleDateString('ru')}</span>
                  </div>

                  {/* Analysis Info */}
                  {creative.analysis && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {creative.analysis.ocr && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                          📝 {creative.analysis.ocr.blocks?.length || 0} блоков
                        </span>
                      )}
                      {creative.analysis.dominant_colors && creative.analysis.dominant_colors.length > 0 && (
                        <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-lg text-xs font-medium">
                          🎨 {creative.analysis.dominant_colors.length} цветов
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-6 py-3 rounded-2xl bg-white shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500 hover:text-white transition-all"
            >
              ← Назад
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
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl scale-110'
                        : 'bg-white text-gray-700 shadow-lg hover:bg-gray-100'
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
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl scale-110'
                        : 'bg-white text-gray-700 shadow-lg hover:bg-gray-100'
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
              className="px-6 py-3 rounded-2xl bg-white shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500 hover:text-white transition-all"
            >
              Вперёд →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
