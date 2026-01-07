'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchNFTsById, type NFT } from '@/lib/stargaze';

type NFTId = {
  contract: string;
  token_id: string;
};

type GalleryThumbnailProps = {
  nftIds: NFTId[];
  backgroundColor?: string;
};

export function GalleryThumbnail({ nftIds, backgroundColor = '#f5f5f5' }: GalleryThumbnailProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isVideoOnly, setIsVideoOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get up to 8 NFT IDs to have more chances of finding images
  const nftIdsToFetch = useMemo(() => {
    if (!nftIds || !Array.isArray(nftIds)) return [];
    return nftIds.slice(0, 8).filter(nft => nft?.contract && nft?.token_id);
  }, [nftIds]);

  useEffect(() => {
    if (nftIdsToFetch.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchImages() {
      try {
        const nfts = await fetchNFTsById(nftIdsToFetch);
        if (cancelled) return;

        // Separate images and videos
        const imageNfts: NFT[] = [];
        const videoNfts: NFT[] = [];

        for (const nft of nfts) {
          if (!nft) continue;
          if (nft.mediaType === 'video') {
            videoNfts.push(nft);
          } else if (nft.thumbnail || nft.image) {
            imageNfts.push(nft);
          }
        }

        // Prefer images, take up to 4
        if (imageNfts.length > 0) {
          const results = imageNfts.slice(0, 4).map(nft => nft.thumbnail || nft.image || '');
          setImages(results.filter(Boolean));
          setIsVideoOnly(false);
        } else if (videoNfts.length > 0) {
          // Only videos - just use 1 thumbnail
          const firstVideo = videoNfts[0];
          const thumb = firstVideo.thumbnail || firstVideo.image;
          if (thumb) {
            setImages([thumb]);
          }
          setIsVideoOnly(true);
        }
      } catch {
        // Silently fail
      }
      if (!cancelled) setLoading(false);
    }

    fetchImages();

    return () => { cancelled = true; };
  }, [nftIdsToFetch]);

  // Loading placeholder
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

  // No images
  if (images.length === 0) {
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

  // Video-only gallery - show single thumbnail
  if (isVideoOnly) {
    return (
      <div className="w-full h-full relative" style={{ backgroundColor }}>
        <img
          src={images[0]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* Video indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
          </div>
        </div>
      </div>
    );
  }

  // Regular 2x2 grid for images
  return (
    <div className="w-full h-full grid grid-cols-2 gap-0.5" style={{ backgroundColor }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="relative overflow-hidden">
          {images[i] ? (
            <img
              src={images[i]}
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
