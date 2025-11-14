'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Creative } from '@/types/creative';

export default function CreativesPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCreatives();
  }, []);

  const fetchCreatives = async () => {
    try {
      const response = await fetch('/api/creatives');
      if (!response.ok) {
        throw new Error('Failed to fetch creatives');
      }
      const data = await response.json();
      setCreatives(data.creatives);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'analyzing': return '🔍';
      case 'generating': return '🎨';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-gradient-to-r from-green-400 to-emerald-500';
      case 'analyzing': return 'bg-gradient-to-r from-blue-400 to-cyan-500';
      case 'generating': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'failed': return 'bg-gradient-to-r from-red-400 to-pink-500';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="text-center">
          <div className="text-8xl mb-8 float-animation">🎨</div>
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
          <p className="mt-6 text-2xl font-bold text-white">Loading creatives...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-20">
        <div className="gradient-card p-12 max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">😢</div>
          <h2 className="text-3xl font-black text-red-600 mb-4">Oops! Something went wrong</h2>
          <p className="text-xl text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="text-7xl mb-6 float-animation">🚀</div>
        <h1 className="section-title">Creative Library</h1>
        <p className="text-2xl text-white font-medium mt-4">
          Browse, analyze, and generate amazing creatives ✨
        </p>
      </div>

      {creatives.length === 0 ? (
        <div className="gradient-card p-20 text-center max-w-3xl mx-auto">
          <div className="text-8xl mb-8">📦</div>
          <h2 className="text-4xl font-black text-gray-800 mb-4">No creatives yet</h2>
          <p className="text-xl text-gray-600 mb-8">
            Time to add some magic! Create your first creative via API 🎯
          </p>
          <div className="bg-gray-100 rounded-2xl p-6 text-left">
            <p className="text-sm font-mono text-gray-700">
              POST /api/creatives<br/>
              {"{ \"original_image_url\": \"...\", \"competitor_name\": \"...\" }"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {creatives.map((creative) => (
            <Link
              key={creative.id}
              href={`/creatives/${creative.id}`}
              className="creative-card group"
            >
              <div className="relative aspect-square bg-gradient-to-br from-purple-200 to-pink-200">
                <Image
                  src={creative.original_image_url}
                  alt={`Creative from ${creative.competitor_name || 'Unknown'}`}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                />
                <div className="absolute top-3 right-3">
                  <span className="text-3xl">
                    {getStatusEmoji(creative.status)}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-3">
                  <span className={`status-badge ${getStatusColor(creative.status)} text-white`}>
                    {creative.status}
                  </span>
                </div>
                {creative.competitor_name && (
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {creative.competitor_name}
                  </h3>
                )}
                <p className="text-sm text-gray-500">
                  📅 {new Date(creative.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
