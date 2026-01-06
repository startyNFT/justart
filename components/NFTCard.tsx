'use client';

import Image from 'next/image';
import { getStargazeNFTUrl } from '@/lib/utils';
import type { NFT } from '@/lib/stargaze';

type NFTCardProps = {
  nft: NFT;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
};

export function NFTCard({ nft, selected, onSelect, selectable }: NFTCardProps) {
  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect();
    } else {
      window.open(
        getStargazeNFTUrl(nft.collection.contractAddress, nft.tokenId),
        '_blank'
      );
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative aspect-square bg-neutral-50 rounded-lg overflow-hidden cursor-pointer group transition-all ${
        selected ? 'ring-2 ring-neutral-900 ring-offset-2' : ''
      }`}
    >
      {nft.image ? (
        <Image
          src={nft.image}
          alt={nft.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-neutral-300">
          No Image
        </div>
      )}

      {selectable && selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-neutral-900 rounded-full flex items-center justify-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
