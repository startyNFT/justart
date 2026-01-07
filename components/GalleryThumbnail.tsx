'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchNFTsById } from '@/lib/stargaze';

type NFTId = {
  contract: string;
  token_id: string;
};

type GalleryThumbnailProps = {
  nftIds: NFTId[];
  backgroundColor?: string;
};

export function GalleryThumbnail({ nftIds, backgroundColor = '#f5f5f5' }: GalleryThumbnailProps) {
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [loading, setLoading] = useState(true);

  // Memoize the first 4 NFT IDs to prevent unnecessary re-fetches
  const first4 = useMemo(() => {
    if (!nftIds || !Array.isArray(nftIds)) return [];
    return nftIds.slice(0, 4).filter(nft => nft?.contract && nft?.token_id);
  }, [nftIds]);

  useEffect(() => {
    if (first4.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchImages() {
      try {
        // Fetch all NFTs in parallel using batch function
        const nfts = await fetchNFTsById(first4);
        if (cancelled) return;

        // Use thumbnail (small CDN image) for faster loading
        const results = nfts.map(nft => nft?.thumbnail || nft?.image || null);
        setImages(results);
      } catch {
        // Silently fail
      }
      if (!cancelled) setLoading(false);
    }

    fetchImages();

    return () => { cancelled = true; };
  }, [first4]);

  // If still loading, show placeholder
  if (loading) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor }}
      >
        <div className="grid grid-cols-2 gap-1 w-full h-full p-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-neutral-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // If no images, show empty state
  const validImages = images.filter(Boolean);
  if (validImages.length === 0) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor }}
      >
        <div className="grid grid-cols-2 gap-1 p-4 opacity-50">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 bg-neutral-300 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full grid grid-cols-2 gap-0.5" style={{ backgroundColor }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="relative overflow-hidden">
          {images[i] ? (
            <img
              src={images[i]!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ backgroundColor }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
