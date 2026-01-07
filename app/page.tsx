'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

type FeaturedItem = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
};

export default function Home() {
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeatured = async () => {
    try {
      const res = await fetch('/api/featured');
      const data = await res.json();
      return data.featured || [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    loadFeatured().then((result) => {
      setFeatured(result);
      setLoading(false);
    });
  }, []);

  if (!loading && featured.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <p className="text-neutral-400 mb-4">No galleries yet</p>
        <Link
          href="/create"
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Create the first one
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Refresh button */}
      <button
        onClick={async () => {
          if (refreshing) return;
          setRefreshing(true);
          const result = await loadFeatured();
          setFeatured(result);
          setRefreshing(false);
        }}
        disabled={refreshing}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 p-2.5 md:p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-neutral-100 active:scale-90 transition-all duration-150"
        title="Show different art"
      >
        <RefreshCw
          size={18}
          className={`md:w-5 md:h-5 text-neutral-600 transition-transform duration-500 ${refreshing ? 'animate-spin' : ''}`}
        />
      </button>

      {/* Responsive grid - 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="fixed inset-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {featured.slice(0, 3).map((item, index) => (
          <Link
            key={`${item.id}-${index}`}
            href={`/g/${item.slug}`}
            className={`relative group overflow-hidden ${
              index === 2 ? 'hidden lg:block' : index === 1 ? 'hidden sm:block' : ''
            }`}
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 md:p-4">
                <p className="font-medium text-neutral-900 truncate text-sm md:text-base">{item.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="fixed inset-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`bg-neutral-100 animate-pulse ${
                index === 2 ? 'hidden lg:block' : index === 1 ? 'hidden sm:block' : ''
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
