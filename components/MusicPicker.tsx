'use client';

import { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, Volume2, VolumeX, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { NFT } from '@/lib/stargaze';
import type { MusicTrack } from '@/lib/constants';

type MusicPickerProps = {
  value: MusicTrack | null;
  onChange: (track: MusicTrack | null) => void;
  audioNfts: NFT[];
  loading?: boolean;
};

export function MusicPicker({ value, onChange, audioNfts, loading = false }: MusicPickerProps) {
  const [expanded, setExpanded] = useState(!!value);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle preview playback
  useEffect(() => {
    if (previewUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.volume = 0.3;
      }
      audioRef.current.src = previewUrl;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }

    return () => {
      audioRef.current?.pause();
    };
  }, [previewUrl]);

  const handlePreview = (url: string) => {
    if (previewUrl === url) {
      setPreviewUrl(null);
    } else {
      setPreviewUrl(url);
    }
  };

  const handleSelect = (nft: NFT | null) => {
    if (!nft) {
      onChange(null);
    } else {
      const url = nft.audioUrl || nft.animationUrl || '';
      onChange({
        url,
        name: nft.name,
        collection: nft.collection.name,
      });
    }
    setPreviewUrl(null);
  };

  const handleToggle = () => {
    if (expanded && value) {
      // If collapsing while a track is selected, clear it
      onChange(null);
    }
    setExpanded(!expanded);
  };

  const getAudioUrl = (nft: NFT) => nft.audioUrl || nft.animationUrl || '';

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      {/* Header - click to expand/collapse */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            value ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'
          }`}>
            <Music size={16} />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">
              {value ? value.name : 'Add Background Music'}
            </p>
            {value && (
              <p className="text-xs text-neutral-400">{value.collection}</p>
            )}
            {!value && (
              <p className="text-xs text-neutral-400">Select from your audio/video NFTs</p>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={18} className="text-neutral-400" /> : <ChevronDown size={18} className="text-neutral-400" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-neutral-100 p-3 space-y-3 max-h-64 overflow-y-auto">
          {/* No music option */}
          <div
            onClick={() => handleSelect(null)}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              !value ? 'bg-neutral-100' : 'hover:bg-neutral-50'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
              <VolumeX size={14} className="text-neutral-500" />
            </div>
            <span className="text-sm">No Music</span>
            {!value && <div className="ml-auto w-2 h-2 rounded-full bg-neutral-900" />}
          </div>

          {/* Loading state */}
          {loading && audioNfts.length === 0 && (
            <div className="flex items-center justify-center py-6 text-neutral-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">Loading audio NFTs...</span>
            </div>
          )}

          {/* No audio NFTs found */}
          {!loading && audioNfts.length === 0 && (
            <div className="py-6 text-center text-neutral-400 text-sm">
              No audio or video NFTs found in your collection
            </div>
          )}

          {/* Audio NFT list */}
          {audioNfts.map((nft) => {
            const audioUrl = getAudioUrl(nft);
            const isSelected = value?.url === audioUrl;
            const isPreviewing = previewUrl === audioUrl;

            return (
              <div
                key={`${nft.collection.contractAddress}-${nft.tokenId}`}
                onClick={() => handleSelect(nft)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                }`}
              >
                {/* Preview button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(audioUrl);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isPreviewing
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {isPreviewing ? <Pause size={14} /> : <Play size={14} />}
                </button>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{nft.name}</p>
                  <p className="text-xs text-neutral-400 truncate">
                    {nft.collection.name} • {nft.mediaType}
                  </p>
                </div>

                {/* Selected indicator */}
                {isSelected && <div className="w-2 h-2 rounded-full bg-neutral-900 flex-shrink-0" />}
              </div>
            );
          })}

          {/* Loading more indicator */}
          {loading && audioNfts.length > 0 && (
            <div className="flex items-center justify-center py-2 text-neutral-400">
              <Loader2 size={14} className="animate-spin mr-2" />
              <span className="text-xs">Loading more...</span>
            </div>
          )}
        </div>
      )}

      {/* Currently previewing indicator */}
      {isPlaying && previewUrl && (
        <div className="border-t border-neutral-100 px-3 py-2 flex items-center gap-2 text-sm text-neutral-500 bg-neutral-50">
          <Volume2 size={14} className="animate-pulse" />
          <span>Previewing...</span>
        </div>
      )}
    </div>
  );
}
