'use client';

import { useEffect, useState } from 'react';
import { fetchNFTById } from '@/lib/stargaze';

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

  useEffect(() => {
    // Handle edge cases
    if (!nftIds || !Array.isArray(nftIds) || nftIds.length === 0) {
      setLoading(false);
      return;
    }

    const first4 = nftIds.slice(0, 4);

    async function fetchImages() {
      try {
        const results = await Promise.all(
          first4.map(async (nft) => {
            try {
              if (!nft?.contract || !nft?.token_id) return null;
              const nftData = await fetchNFTById(nft.contract, nft.token_id);
              return nftData?.thumbnail || nftData?.image || null;
            } catch {
              return null;
            }
          })
        );
        setImages(results);
      } catch {
        // Silently fail
      }
      setLoading(false);
    }

    fetchImages();
  }, [nftIds]);

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
