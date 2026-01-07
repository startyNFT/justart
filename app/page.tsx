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

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const result = await loadFeatured();
      if (!cancelled && result) {
        setFeatured(result);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadFeatured = async (): Promise<FeaturedItem[] | null> => {
    const { data: galleries, error } = await supabase
      .from('galleries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !galleries || galleries.length === 0) {
      return null;
    }

    // Shuffle and pick galleries
    const shuffled = [...galleries].sort(() => Math.random() - 0.5);
    const selectedGalleries = shuffled.slice(0, 6);

    // Build list of NFTs to fetch - pick first visual NFT from each gallery
    const fetchPromises = selectedGalleries.map(async (gallery) => {
      if (!gallery.nft_ids || gallery.nft_ids.length === 0) return null;

      // Shuffle NFT ids
      const shuffledNftIds = [...gallery.nft_ids].sort(() => Math.random() - 0.5);

      // Try each NFT until we find a visual one
      for (const nftId of shuffledNftIds.slice(0, 3)) { // Only try first 3 to be fast
        try {
          const nft = await fetchNFTById(nftId.contract, nftId.token_id);
          if (nft && nft.image && nft.mediaType !== 'audio') {
            return { nft, gallery };
          }
        } catch {}
      }
      return null;
    });

    // Fetch all in parallel
    const results = await Promise.all(fetchPromises);
    const featuredItems = results.filter((item): item is FeaturedItem => item !== null);

    return featuredItems;
  };

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
          const result = await loadFeatured();
          if (result) setFeatured(result);
        }}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 p-2.5 md:p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-neutral-100 transition-colors"
        title="Show different art"
      >
        <RefreshCw size={18} className="md:w-5 md:h-5 text-neutral-600" />
      </button>

      {/* Responsive grid - 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className="fixed inset-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {featured.slice(0, 3).map(({ nft, gallery }, index) => {
          const isVideo = nft.mediaType === 'video' && nft.animationUrl;

          return (
            <Link
              key={`${gallery.id}-${nft.tokenId}-${index}`}
              href={`/g/${gallery.slug}`}
              className={`relative group overflow-hidden ${
                // Hide 3rd item on tablet, hide 2nd & 3rd on mobile
                index === 2 ? 'hidden lg:block' : index === 1 ? 'hidden sm:block' : ''
              }`}
            >
              {isVideo ? (
                <video
                  src={nft.animationUrl}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={nft.image}
                  alt={nft.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}

              {/* Hover overlay with gallery info */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 md:p-4">
                  <p className="text-xs md:text-sm text-neutral-500 truncate">{nft.name}</p>
                  <p className="font-medium text-neutral-900 truncate text-sm md:text-base">{gallery.name}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
