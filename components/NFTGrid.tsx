'use client';

import { useRef, useState, useEffect, memo, useCallback } from 'react';
import { NFTCard } from './NFTCard';
import type { NFT } from '@/lib/stargaze';
import type { SizeType, ArrangementType, LayoutType } from '@/lib/constants';
import { getStargazeNFTUrl } from '@/lib/utils';
import { useCdnUrl } from '@/hooks/useCdnUrl';

type NFTGridProps = {
  nfts: NFT[];
  size?: SizeType;
  arrangement?: ArrangementType;
  layout?: LayoutType;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (nft: NFT) => void;
  useThumbnails?: boolean; // Force thumbnails even for large sizes (e.g., selection mode)
  highRes?: boolean; // Use full resolution images (for gallery display)
  customRowCounts?: number[] | null; // Custom row counts for justified layout
  rowHeights?: number[] | null; // Custom row heights for justified layout
};

const gridSizeClasses: Record<SizeType, string> = {
  small: 'grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2',
  medium: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3',
  large: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4',
};

const sizeColumnCounts: Record<SizeType, number> = {
  small: 5,
  medium: 3,
  large: 2,
};

const justifiedRowHeights: Record<SizeType, number> = {
  small: 180,
  medium: 280,
  large: 400,
};

// Simple card with natural aspect ratio for vertical/masonry layout
const SimpleCard = memo(function SimpleCard({
  nft,
  selected,
  onSelect,
  selectable,
  highRes,
}: {
  nft: NFT;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  highRes?: boolean;
}) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = nft.mediaType === 'video' && nft.animationUrl;

  // Get the best available image URL - try multiple sources
  const getImageUrl = () => {
    if (isVideo) {
      return nft.thumbnail || nft.image || '';
    }
    if (highRes) {
      return nft.image || nft.thumbnail || '';
    }
    return nft.thumbnail || nft.image || '';
  };

  const originalUrl = getImageUrl();
  const { url: cdnImageUrl } = useCdnUrl(originalUrl, highRes ? 'lg' : 'md');

  // Handle image load error - try original URL, then show placeholder
  const handleImgError = useCallback(() => {
    if (!useFallback && originalUrl && originalUrl !== cdnImageUrl) {
      setUseFallback(true);
    } else {
      setImgError(true);
    }
  }, [useFallback, originalUrl, cdnImageUrl]);

  const displayUrl = useFallback ? originalUrl : (cdnImageUrl || originalUrl);

  const handleClick = useCallback(() => {
    if (selectable && onSelect) {
      onSelect();
    } else {
      window.open(getStargazeNFTUrl(nft.collection.contractAddress, nft.tokenId), '_blank');
    }
  }, [nft.collection.contractAddress, nft.tokenId, selectable, onSelect]);

  const handleVideoToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoPlaying) {
      videoRef.current?.pause();
      setVideoPlaying(false);
    } else {
      setVideoPlaying(true);
    }
  }, [videoPlaying]);

  return (
    <div
      onClick={handleClick}
      className={`relative bg-neutral-100 overflow-hidden cursor-pointer mb-3 ${
        selected ? 'ring-2 ring-neutral-900 ring-offset-2' : ''
      }`}
      style={{
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        breakInside: 'avoid',
      }}
    >
      {isVideo ? (
        <>
          {videoPlaying ? (
            <video
              ref={videoRef}
              src={nft.animationUrl}
              className="w-full h-auto"
              loop
              muted
              playsInline
              autoPlay
            />
          ) : displayUrl && !imgError ? (
            <img
              src={displayUrl}
              alt=""
              className="w-full h-auto"
              draggable={false}
              decoding="async"
              loading="lazy"
              onError={handleImgError}
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-neutral-300 text-xs">
              No Preview
            </div>
          )}
          <button
            onClick={handleVideoToggle}
            className="absolute bottom-2 right-2 w-10 h-10 bg-black/70 rounded-full flex items-center justify-center opacity-80 hover:opacity-100"
          >
            {videoPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>
        </>
      ) : displayUrl && !imgError ? (
        <img
          src={displayUrl}
          alt=""
          className="w-full h-auto"
          draggable={false}
          decoding="async"
          loading="lazy"
          onError={handleImgError}
        />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center text-neutral-300 text-xs">
          No Image
        </div>
      )}
      {selectable && selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-neutral-900 rounded-full flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
});

// Justified row item
const JustifiedItem = memo(function JustifiedItem({
  nft,
  width,
  height,
  selected,
  onSelect,
  selectable,
  highRes,
}: {
  nft: NFT;
  width: number;
  height: number;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  highRes?: boolean;
}) {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = nft.mediaType === 'video' && nft.animationUrl;

  // Get the best available image URL - try multiple sources
  const getImageUrl = () => {
    if (isVideo) {
      return nft.thumbnail || nft.image || '';
    }
    if (highRes) {
      return nft.image || nft.thumbnail || '';
    }
    return nft.thumbnail || nft.image || '';
  };

  const originalUrl = getImageUrl();
  const { url: cdnImageUrl } = useCdnUrl(originalUrl, highRes ? 'lg' : 'md');

  // Handle image load error - try original URL, then show placeholder
  const handleImgError = useCallback(() => {
    if (!useFallback && originalUrl && originalUrl !== cdnImageUrl) {
      setUseFallback(true);
    } else {
      setImgError(true);
    }
  }, [useFallback, originalUrl, cdnImageUrl]);

  const displayUrl = useFallback ? originalUrl : (cdnImageUrl || originalUrl);

  const handleClick = useCallback(() => {
    if (selectable && onSelect) {
      onSelect();
    } else {
      window.open(getStargazeNFTUrl(nft.collection.contractAddress, nft.tokenId), '_blank');
    }
  }, [nft.collection.contractAddress, nft.tokenId, selectable, onSelect]);

  const handleVideoToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoPlaying) {
      videoRef.current?.pause();
      setVideoPlaying(false);
    } else {
      setVideoPlaying(true);
    }
  }, [videoPlaying]);

  return (
    <div
      onClick={handleClick}
      style={{
        width,
        height,
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
      }}
      className={`relative flex-shrink-0 bg-neutral-100 overflow-hidden cursor-pointer ${
        selected ? 'ring-2 ring-neutral-900 ring-offset-2' : ''
      }`}
    >
      {isVideo ? (
        <>
          {videoPlaying ? (
            <video
              ref={videoRef}
              src={nft.animationUrl}
              className="w-full h-full object-cover"
              loop
              muted
              playsInline
              autoPlay
            />
          ) : displayUrl && !imgError ? (
            <img
              src={displayUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
              decoding="async"
              loading="lazy"
              onError={handleImgError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">
              No Preview
            </div>
          )}
          <button
            onClick={handleVideoToggle}
            className="absolute bottom-2 right-2 w-10 h-10 bg-black/70 rounded-full flex items-center justify-center opacity-80 hover:opacity-100"
          >
            {videoPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>
        </>
      ) : displayUrl && !imgError ? (
        <img
          src={displayUrl}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
          decoding="async"
          loading="lazy"
          onError={handleImgError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">
          No Image
        </div>
      )}
      {selectable && selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-neutral-900 rounded-full flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
});

// Hash for pseudo-random aspect ratio
function getAspectRatio(nft: NFT): number {
  const hash = nft.tokenId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const ratios = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5];
  return ratios[hash % ratios.length];
}

// Calculate justified rows
function calculateRows(
  nfts: NFT[],
  containerWidth: number,
  targetHeight: number,
  gap: number
): { nft: NFT; width: number; height: number; index: number }[][] {
  const rows: { nft: NFT; width: number; height: number; index: number }[][] = [];
  let currentRow: { nft: NFT; width: number; height: number; index: number }[] = [];
  let currentWidth = 0;

  for (let i = 0; i < nfts.length; i++) {
    const nft = nfts[i];
    const ratio = getAspectRatio(nft);
    const itemWidth = targetHeight * ratio;

    if (currentWidth + itemWidth + (currentRow.length > 0 ? gap : 0) <= containerWidth) {
      currentRow.push({ nft, width: itemWidth, height: targetHeight, index: i });
      currentWidth += itemWidth + (currentRow.length > 1 ? gap : 0);
    } else {
      if (currentRow.length > 0) {
        const totalGap = gap * (currentRow.length - 1);
        const available = containerWidth - totalGap;
        const content = currentRow.reduce((sum, item) => sum + item.width, 0);
        const scale = available / content;
        rows.push(currentRow.map(item => ({
          ...item,
          width: item.width * scale,
          height: item.height * scale,
        })));
      }
      currentRow = [{ nft, width: itemWidth, height: targetHeight, index: i }];
      currentWidth = itemWidth;
    }
  }

  // Last row - also justify
  if (currentRow.length > 0) {
    const totalGap = gap * (currentRow.length - 1);
    const available = containerWidth - totalGap;
    const content = currentRow.reduce((sum, item) => sum + item.width, 0);
    const scale = available / content;
    rows.push(currentRow.map(item => ({
      ...item,
      width: item.width * scale,
      height: item.height * scale,
    })));
  }

  return rows;
}

export function NFTGrid({
  nfts,
  size = 'medium',
  arrangement = 'grid',
  layout,
  selectable,
  selectedIds,
  onSelect,
  highRes,
  customRowCounts,
  rowHeights,
}: NFTGridProps) {
  // Legacy support
  if (layout && !arrangement) {
    if (layout === 'small' || layout === 'medium' || layout === 'large') {
      size = layout;
      arrangement = 'grid';
    } else if (layout === 'horizontal' || layout === 'vertical') {
      arrangement = 'vertical';
    }
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Use ResizeObserver for reliable width updates
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    // Initial measurement
    setContainerWidth(containerRef.current.offsetWidth);

    return () => resizeObserver.disconnect();
  }, [arrangement]); // Re-run when arrangement changes

  if (nfts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        No NFTs found
      </div>
    );
  }

  const getKey = (nft: NFT, i: number) => `${nft.collection.contractAddress}-${nft.tokenId}-${i}`;
  const isSelected = (nft: NFT) => selectedIds?.has(`${nft.collection.contractAddress}-${nft.tokenId}`);

  // Grid
  if (arrangement === 'grid') {
    return (
      <div className={`nft-grid ${gridSizeClasses[size]}`}>
        {nfts.map((nft, i) => (
          <NFTCard
            key={getKey(nft, i)}
            nft={nft}
            selectable={selectable}
            selected={isSelected(nft)}
            onSelect={() => onSelect?.(nft)}
            highRes={highRes}
          />
        ))}
      </div>
    );
  }

  // Vertical/Masonry - CSS columns auto-balance heights
  if (arrangement === 'vertical') {
    const cols = sizeColumnCounts[size];

    return (
      <div
        className="nft-grid"
        style={{
          columnCount: cols,
          columnGap: '12px',
        }}
      >
        {nfts.map((nft, i) => (
          <SimpleCard
            key={getKey(nft, i)}
            nft={nft}
            selectable={selectable}
            selected={isSelected(nft)}
            onSelect={() => onSelect?.(nft)}
            highRes={highRes}
          />
        ))}
      </div>
    );
  }

  // Justified
  if (arrangement === 'justified') {
    // Wait for container width measurement before rendering
    if (containerWidth === 0) {
      return (
        <div ref={containerRef} className="nft-grid w-full min-h-[200px]" />
      );
    }

    // Use custom row counts if provided, otherwise calculate automatically
    if (customRowCounts && customRowCounts.length > 0) {
      // Custom row layout
      let nftIndex = 0;
      const customRows: { nft: NFT; index: number }[][] = [];

      for (const count of customRowCounts) {
        const row: { nft: NFT; index: number }[] = [];
        for (let i = 0; i < count && nftIndex < nfts.length; i++) {
          row.push({ nft: nfts[nftIndex], index: nftIndex });
          nftIndex++;
        }
        if (row.length > 0) {
          customRows.push(row);
        }
      }

      return (
        <div ref={containerRef} className="nft-grid w-full flex flex-col gap-1">
          {customRows.map((row, rowIdx) => {
            const gap = 4;
            const totalGap = gap * (row.length - 1);
            const itemWidth = (containerWidth - totalGap) / row.length;
            // Use custom height if provided, otherwise use default
            const rowHeight = rowHeights?.[rowIdx] ?? justifiedRowHeights[size];

            return (
              <div key={rowIdx} className="flex gap-1 w-full">
                {row.map(({ nft, index }) => (
                  <JustifiedItem
                    key={getKey(nft, index)}
                    nft={nft}
                    width={itemWidth}
                    height={rowHeight}
                    selectable={selectable}
                    selected={isSelected(nft)}
                    onSelect={() => onSelect?.(nft)}
                    highRes={highRes}
                  />
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    // Automatic justified layout
    const rows = calculateRows(nfts, containerWidth, justifiedRowHeights[size], 4);

    return (
      <div ref={containerRef} className="nft-grid w-full flex flex-col gap-1">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1 w-full">
            {row.map(({ nft, width, height, index }) => (
              <JustifiedItem
                key={getKey(nft, index)}
                nft={nft}
                width={width}
                height={height}
                selectable={selectable}
                selected={isSelected(nft)}
                onSelect={() => onSelect?.(nft)}
                highRes={highRes}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Presentation mode is handled at the page level, not in NFTGrid
  if (arrangement === 'presentation') {
    return null;
  }

  return null;
}
