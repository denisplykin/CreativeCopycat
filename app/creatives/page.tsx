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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading creatives...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Creative Library</h1>
        <p className="text-gray-600">Browse and analyze competitive creatives</p>
      </div>

      {creatives.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No creatives found</p>
          <p className="text-gray-400 mt-2">Add creatives via API or database</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {creatives.map((creative) => (
            <Link
              key={creative.id}
              href={`/creatives/${creative.id}`}
              className="group block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative aspect-square bg-gray-200">
                <Image
                  src={creative.original_image_url}
                  alt={`Creative from ${creative.competitor_name || 'Unknown'}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    creative.status === 'completed' ? 'bg-green-100 text-green-800' :
                    creative.status === 'analyzing' ? 'bg-blue-100 text-blue-800' :
                    creative.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                    creative.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {creative.status}
                  </span>
                </div>
                {creative.competitor_name && (
                  <p className="text-sm font-medium text-gray-900">{creative.competitor_name}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(creative.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
