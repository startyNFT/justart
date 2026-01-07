'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { StarRating } from './StarRating';
import { getStargazeNFTUrl } from '@/lib/utils';
import type { NFT } from '@/lib/stargaze';

type NFTRatingModalProps = {
  nft: NFT | null;
  galleryId: string;
  walletAddress?: string;
  isOwner: boolean;
  onClose: () => void;
  onRated?: () => void;
};

type RatingData = {
  average: number;
  count: number;
  userRating?: number;
};

export function NFTRatingModal({
  nft,
  galleryId,
  walletAddress,
  isOwner,
  onClose,
  onRated,
}: NFTRatingModalProps) {
  const [rating, setRating] = useState<RatingData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nftKey = nft ? `${nft.collection.contractAddress}-${nft.tokenId}` : '';

  // Fetch current rating
  useEffect(() => {
    if (!nft) return;

    async function fetchRating() {
      try {
        const url = `/api/ratings?gallery_id=${galleryId}${walletAddress ? `&wallet=${walletAddress}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.ratings && data.ratings[nftKey]) {
          setRating(data.ratings[nftKey]);
        } else {
          setRating({ average: 0, count: 0 });
        }
      } catch {
        setRating({ average: 0, count: 0 });
      }
    }

    fetchRating();
  }, [nft, galleryId, walletAddress, nftKey]);

  const handleRate = useCallback(async (stars: number) => {
    if (!nft || !walletAddress || isOwner) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: galleryId,
          nft_contract: nft.collection.contractAddress,
          nft_token_id: nft.tokenId,
          wallet_address: walletAddress,
          stars,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit rating');
      } else {
        // Update local rating
        setRating(prev => ({
          average: prev ? ((prev.average * prev.count + stars) / (prev.count + (prev.userRating ? 0 : 1))) : stars,
          count: prev ? prev.count + (prev.userRating ? 0 : 1) : 1,
          userRating: stars,
        }));
        onRated?.();
      }
    } catch {
      setError('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  }, [nft, galleryId, walletAddress, isOwner, onRated]);

  if (!nft) return null;

  const stargazeUrl = getStargazeNFTUrl(nft.collection.contractAddress, nft.tokenId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Image */}
        <div className="relative aspect-square bg-neutral-100">
          <img
            src={nft.image}
            alt={nft.name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Info */}
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{nft.name}</h3>
              <p className="text-sm text-neutral-500">{nft.collection.name}</p>
            </div>
            <a
              href={stargazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600"
              title="View on Stargaze"
            >
              <ExternalLink size={18} />
            </a>
          </div>

          {/* Rating section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-1">Community Rating</p>
                {rating ? (
                  <StarRating
                    rating={rating.average}
                    userRating={rating.userRating}
                    count={rating.count}
                    onRate={!isOwner && walletAddress ? handleRate : undefined}
                    readonly={isOwner || !walletAddress || submitting}
                    size="lg"
                  />
                ) : (
                  <div className="text-sm text-neutral-400">Loading...</div>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}

            {isOwner && (
              <p className="text-xs text-neutral-400 mt-2">
                You cannot rate NFTs in your own gallery
              </p>
            )}

            {!walletAddress && !isOwner && (
              <p className="text-xs text-neutral-400 mt-2">
                Connect your wallet to rate this NFT
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
