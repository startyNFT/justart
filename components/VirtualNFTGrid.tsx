'use client';

import { useRef, useCallback, memo, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { NFT } from '@/lib/stargaze';
import type { SizeType } from '@/lib/constants';
import { getStargazeNFTUrl } from '@/lib/utils';

type VirtualNFTGridProps = {
  nfts: NFT[];
  size?: SizeType;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (nft: NFT) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
};

// Column counts for different sizes
const columnCounts: Record<SizeType, number> = {
  small: 6,
  medium: 4,
  large: 3,
};

// Simple card component - extremely minimal
const VirtualNFTCard = memo(function VirtualNFTCard({
  nft,
  selected,
  onSelect,
  selectable,
}: {
  nft: NFT;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
}) {
  const handleClick = useCallback(() => {
    if (selectable && onSelect) {
      onSelect();
    } else {
      window.open(getStargazeNFTUrl(nft.collection.contractAddress, nft.tokenId), '_blank');
    }
  }, [nft.collection.contractAddress, nft.tokenId, selectable, onSelect]);

  const isVideo = nft.mediaType === 'video' && nft.animationUrl;

  return (
    <div
      onClick={handleClick}
      className={`relative aspect-square bg-neutral-100 rounded-lg overflow-hidden cursor-pointer ${
        selected ? 'ring-2 ring-neutral-900 ring-offset-2' : ''
      }`}
    >
      {isVideo ? (
        <video
          src={nft.animationUrl}
          poster={nft.image}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="none"
        />
      ) : (
        <img
          src={nft.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
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

export function VirtualNFTGrid({
  nfts,
  size = 'medium',
  selectable,
  selectedIds,
  onSelect,
  hasMore,
  loadingMore,
  onLoadMore,
}: VirtualNFTGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const columns = columnCounts[size];

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (parentRef.current) {
        setContainerWidth(parentRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const gap = size === 'small' ? 8 : size === 'medium' ? 12 : 16;

  // Calculate row height based on container width (square cards)
  const cardWidth = (containerWidth - gap * (columns - 1)) / columns;
  const rowHeight = cardWidth + gap; // card height + gap

  // Calculate number of rows
  const rowCount = Math.ceil(nfts.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 3, // Render 3 extra rows above/below viewport
  });

  // Infinite scroll - load more when near bottom
  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement || !hasMore || loadingMore || !onLoadMore) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      // Load more when within 500px of bottom
      if (scrollHeight - scrollTop - clientHeight < 500) {
        onLoadMore();
      }
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, onLoadMore]);

  const getNftKey = (nft: NFT) => `${nft.collection.contractAddress}-${nft.tokenId}`;

  if (nfts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        No NFTs found
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-200px)] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowStartIndex = virtualRow.index * columns;
          const rowItems = nfts.slice(rowStartIndex, rowStartIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
                paddingBottom: `${gap}px`,
              }}
            >
              {rowItems.map((nft, colIndex) => (
                <VirtualNFTCard
                  key={`${getNftKey(nft)}-${rowStartIndex + colIndex}`}
                  nft={nft}
                  selectable={selectable}
                  selected={selectedIds?.has(getNftKey(nft))}
                  onSelect={() => onSelect?.(nft)}
                />
              ))}
            </div>
          );
        })}
      </div>
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
