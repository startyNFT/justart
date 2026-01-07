'use client';

import { useRef, useState, useEffect, memo, useCallback } from 'react';
import { NFTCard } from './NFTCard';
import type { NFT } from '@/lib/stargaze';
import { getOptimizedImageUrl } from '@/lib/stargaze';
import type { SizeType, ArrangementType, LayoutType } from '@/lib/constants';
import { getStargazeNFTUrl } from '@/lib/utils';

type NFTGridProps = {
  nfts: NFT[];
  size?: SizeType;
  arrangement?: ArrangementType;
  layout?: LayoutType;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (nft: NFT) => void;
  useThumbnails?: boolean;
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
  small: 120,
  medium: 180,
  large: 280,
};

// Simple card with natural aspect ratio for vertical/masonry layout
const SimpleCard = memo(function SimpleCard({
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
      <img
        src={nft.thumbnail || nft.image}
        alt=""
        className="w-full h-auto"
        draggable={false}
        decoding="async"
        loading="eager"
      />
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
}: {
  nft: NFT;
  width: number;
  height: number;
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
      <img
        src={nft.thumbnail || nft.image}
        alt=""
        className="w-full h-full object-cover"
        draggable={false}
        decoding="async"
        loading="eager"
      />
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
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => setContainerWidth(containerRef.current?.offsetWidth || 1200);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
          />
        ))}
      </div>
    );
  }

  // Justified
  if (arrangement === 'justified') {
    const rows = calculateRows(nfts, containerWidth, justifiedRowHeights[size], 4);

    return (
      <div ref={containerRef} className="nft-grid flex flex-col gap-1">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1">
            {row.map(({ nft, width, height, index }) => (
              <JustifiedItem
                key={getKey(nft, index)}
                nft={nft}
                width={width}
                height={height}
                selectable={selectable}
                selected={isSelected(nft)}
                onSelect={() => onSelect?.(nft)}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
}
