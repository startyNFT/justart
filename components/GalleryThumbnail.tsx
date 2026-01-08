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
  cachedThumbnails?: string[] | null; // Pre-cached thumbnail URLs
  horizontal?: boolean; // Show single image for horizontal cards
};

// Cache for CDN URLs
const cdnCache = new Map<string, string>();

async function getCdnUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;

  // Check cache
  const cached = cdnCache.get(url);
  if (cached) return cached;

  // Already a CDN URL
  if (url.includes('i.rscdn.art') || url.includes('i.stargaze-apis.com')) {
    cdnCache.set(url, url);
    return url;
  }

  try {
    // Convert to IPFS format for API
    let ipfsUrl = url;
    if (url.includes('ipfs.io/ipfs/')) {
      ipfsUrl = 'ipfs://' + url.split('ipfs.io/ipfs/')[1];
    } else if (url.includes('/ipfs/') && !url.startsWith('ipfs://')) {
      ipfsUrl = 'ipfs://' + url.split('/ipfs/')[1];
    }

    const res = await fetch(`/api/image?url=${encodeURIComponent(ipfsUrl)}&size=sm`);
    const data = await res.json();
    if (data.url) {
      cdnCache.set(url, data.url);
      return data.url;
    }
  } catch {
    // Fall back to original
  }
  return url;
}

export function GalleryThumbnail({ nftIds, backgroundColor = '#f5f5f5', cachedThumbnails, horizontal = false }: GalleryThumbnailProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isVideoOnly, setIsVideoOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use cached thumbnails if available
  const hasCachedThumbnails = cachedThumbnails && cachedThumbnails.length > 0;

  // Get exactly the first 3 NFT IDs in user's order (for vertical triptych)
  const nftIdsToFetch = useMemo(() => {
    if (hasCachedThumbnails) return []; // Don't fetch if we have cached thumbnails
    if (!nftIds || !Array.isArray(nftIds)) return [];
    return nftIds.slice(0, 3).filter(nft => nft?.contract && nft?.token_id);
  }, [nftIds, hasCachedThumbnails]);

  useEffect(() => {
    // If we have cached thumbnails, use them directly
    if (hasCachedThumbnails) {
      // Convert cached URLs to CDN URLs (first 3 for triptych)
      Promise.all(cachedThumbnails.slice(0, 3).map(getCdnUrl))
        .then(cdnUrls => {
          setImages(cdnUrls);
          setLoading(false);
        })
        .catch(() => {
          setImages(cachedThumbnails.slice(0, 3));
          setLoading(false);
        });
      return;
    }

    if (nftIdsToFetch.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchImages() {
      try {
        // Fetch all first 4 NFTs at once, maintaining order
        const nfts = await fetchNFTsById(nftIdsToFetch);
        if (cancelled) return;

        // Map results to URLs in exact order
        const rawUrls: string[] = [];
        let videoCount = 0;

        for (const nft of nfts) {
          if (!nft) {
            rawUrls.push(''); // Placeholder for missing NFT
            continue;
          }
          const imageUrl = nft.thumbnail || nft.image || '';
          rawUrls.push(imageUrl);
          if (nft.mediaType === 'video') videoCount++;
        }

        if (cancelled) return;

        // Filter out empty URLs for display but keep order
        const validUrls = rawUrls.filter(url => url);

        // Convert to CDN URLs in parallel
        if (validUrls.length > 0) {
          try {
            const cdnUrls = await Promise.all(validUrls.map(getCdnUrl));
            if (!cancelled) {
              setImages(cdnUrls);
              setIsVideoOnly(validUrls.length === 1 && videoCount === 1);
            }
          } catch {
            // Use raw URLs as fallback
            if (!cancelled) {
              setImages(validUrls);
              setIsVideoOnly(validUrls.length === 1 && videoCount === 1);
            }
          }
        }
      } catch {
        // Error fetching NFTs
      }

      if (!cancelled) setLoading(false);
    }

    fetchImages();

    return () => { cancelled = true; };
  }, [nftIdsToFetch, hasCachedThumbnails, cachedThumbnails]);

  // Loading placeholder
  if (loading) {
    return (
      <div className="w-full h-full bg-neutral-200 animate-pulse" />
    );
  }

  // No images
  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
        <div className="text-neutral-300 text-xs">No preview</div>
      </div>
    );
  }

  // Horizontal mode - 3 vertical strips (triptych)
  if (horizontal) {
    // If only 1 image, show it full
    if (images.length === 1) {
      return (
        <div className="w-full h-full relative">
          <img
            src={images[0]}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          {isVideoOnly && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5" />
              </div>
            </div>
          )}
        </div>
      );
    }

    // Show 3 vertical strips
    return (
      <div className="w-full h-full grid grid-cols-3 gap-0.5" style={{ backgroundColor }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative overflow-hidden">
            {images[i] ? (
              <img
                src={images[i]}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Video-only gallery - show single thumbnail (square mode)
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

  // Vertical triptych - 3 columns
  return (
    <div className="w-full h-full grid grid-cols-3 gap-0.5" style={{ backgroundColor }}>
      {[0, 1, 2].map((i) => (
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
