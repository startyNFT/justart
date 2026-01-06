'use client';

import { NFTCard } from './NFTCard';
import type { NFT } from '@/lib/stargaze';
import type { LayoutType } from '@/lib/constants';

type NFTGridProps = {
  nfts: NFT[];
  layout: LayoutType;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (nft: NFT) => void;
};

const layoutClasses: Record<LayoutType, string> = {
  small: 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2',
  medium: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4',
  large: 'grid grid-cols-1 sm:grid-cols-2 gap-6',
  horizontal: 'flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory',
  vertical: 'flex flex-col gap-4',
  grid: 'columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4',
};

export function NFTGrid({
  nfts,
  layout,
  selectable,
  selectedIds,
  onSelect,
}: NFTGridProps) {
  if (nfts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        No NFTs found
      </div>
    );
  }

  const getNftKey = (nft: NFT) => `${nft.collection.contractAddress}-${nft.tokenId}`;

  if (layout === 'horizontal') {
    return (
      <div className={layoutClasses[layout]}>
        {nfts.map((nft) => (
          <div
            key={getNftKey(nft)}
            className="flex-shrink-0 w-64 h-64 snap-center"
          >
            <NFTCard
              nft={nft}
              selectable={selectable}
              selected={selectedIds?.has(getNftKey(nft))}
              onSelect={() => onSelect?.(nft)}
            />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className={layoutClasses[layout]}>
        {nfts.map((nft) => (
          <div key={getNftKey(nft)} className="w-full max-w-2xl mx-auto">
            <NFTCard
              nft={nft}
              selectable={selectable}
              selected={selectedIds?.has(getNftKey(nft))}
              onSelect={() => onSelect?.(nft)}
            />
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div className={layoutClasses[layout]}>
        {nfts.map((nft) => (
          <div key={getNftKey(nft)} className="break-inside-avoid">
            <NFTCard
              nft={nft}
              selectable={selectable}
              selected={selectedIds?.has(getNftKey(nft))}
              onSelect={() => onSelect?.(nft)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={layoutClasses[layout]}>
      {nfts.map((nft) => (
        <NFTCard
          key={getNftKey(nft)}
          nft={nft}
          selectable={selectable}
          selected={selectedIds?.has(getNftKey(nft))}
          onSelect={() => onSelect?.(nft)}
        />
      ))}
    </div>
  );
}
