'use client';

import { memo, useState, useRef, useCallback } from 'react';
import { getStargazeNFTUrl } from '@/lib/utils';
import type { NFT } from '@/lib/stargaze';

type NFTCardProps = {
  nft: NFT;
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  highRes?: boolean; // Use full resolution image instead of thumbnail
};

// Optimized card with video support (no autoplay for performance)
export const NFTCard = memo(function NFTCard({ nft, selected, onSelect, selectable, highRes }: NFTCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleClick = useCallback(() => {
    if (selectable && onSelect) {
      onSelect();
    } else {
      window.open(getStargazeNFTUrl(nft.collection.contractAddress, nft.tokenId), '_blank');
    }
  }, [nft.collection.contractAddress, nft.tokenId, selectable, onSelect]);

  const handleAudioToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleVideoToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoPlaying) {
      videoRef.current.pause();
      setVideoPlaying(false);
    } else {
      videoRef.current.play();
      setVideoPlaying(true);
    }
  }, [videoPlaying]);

  const isAudio = nft.mediaType === 'audio' && nft.audioUrl;
  const isVideo = nft.mediaType === 'video' && nft.animationUrl;

  return (
    <div
      onClick={handleClick}
      className={`relative aspect-square bg-neutral-100 rounded-lg overflow-hidden cursor-pointer ${
        selected ? 'ring-2 ring-neutral-900 ring-offset-2' : ''
      }`}
      style={{
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform',
      }}
    >
      {isVideo ? (
        <>
          <video
            ref={videoRef}
            src={nft.animationUrl}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            muted
            playsInline
            preload="auto"
          />
          {/* Play/pause button - only this area triggers video toggle */}
          <button
            onClick={handleVideoToggle}
            className={`absolute bottom-2 right-2 w-10 h-10 bg-black/70 rounded-full flex items-center justify-center transition-opacity ${
              videoPlaying ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            }`}
          >
            {videoPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>
        </>
      ) : (nft.thumbnail || nft.image) ? (
        <img
          src={highRes ? nft.image : (nft.thumbnail || nft.image)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          decoding="async"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-neutral-300 text-xs">
          No Image
        </div>
      )}

      {isAudio && (
        <>
          <audio
            ref={audioRef}
            src={nft.audioUrl}
            onEnded={() => setIsPlaying(false)}
            preload="none"
          />
          <button
            onClick={handleAudioToggle}
            className="absolute bottom-2 right-2 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center"
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>
        </>
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
