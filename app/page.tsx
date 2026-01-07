'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, type Gallery } from '@/lib/supabase';
import { fetchNFTById, type NFT } from '@/lib/stargaze';
import { RefreshCw } from 'lucide-react';

type FeaturedItem = {
  nft: NFT;
  gallery: Gallery;
};

export default function Home() {
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeatured = async () => {
    setLoading(true);

    const { data: galleries, error } = await supabase
      .from('galleries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !galleries || galleries.length === 0) {
      setLoading(false);
      return;
    }

    // Shuffle galleries and pick random ones
    const shuffled = [...galleries].sort(() => Math.random() - 0.5);
    const selectedGalleries = shuffled.slice(0, 6);

    const featuredItems: FeaturedItem[] = [];

    for (const gallery of selectedGalleries) {
      if (gallery.nft_ids && gallery.nft_ids.length > 0) {
        // Pick a random NFT from this gallery
        const randomNftId = gallery.nft_ids[Math.floor(Math.random() * gallery.nft_ids.length)];
        const nft = await fetchNFTById(randomNftId.contract, randomNftId.token_id);
        if (nft && nft.image) {
          featuredItems.push({ nft, gallery });
        }
      }
    }

    setFeatured(featuredItems);
    setLoading(false);
  };

  useEffect(() => {
    loadFeatured();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (featured.length === 0) {
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
    <div className="min-h-screen bg-white">
      {/* Refresh button */}
      <button
        onClick={loadFeatured}
        className="fixed bottom-6 right-6 z-50 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-neutral-100 transition-colors"
        title="Show different art"
      >
        <RefreshCw size={20} className="text-neutral-600" />
      </button>

      {/* Responsive art grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 min-h-screen">
        {featured.slice(0, 6).map(({ nft, gallery }, index) => (
          <Link
            key={`${gallery.id}-${nft.tokenId}-${index}`}
            href={`/g/${gallery.slug}`}
            className="relative aspect-square md:aspect-auto md:h-[50vh] lg:h-screen group overflow-hidden"
          >
            <img
              src={nft.image}
              alt={nft.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            {/* Hover overlay with gallery info */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm text-neutral-500 truncate">{nft.name}</p>
                <p className="font-medium text-neutral-900 truncate">{gallery.name}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Mobile: show fewer images */}
      <style jsx>{`
        @media (max-width: 768px) {
          .grid > :nth-child(n+4) {
            display: none;
          }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .grid > :nth-child(n+5) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
