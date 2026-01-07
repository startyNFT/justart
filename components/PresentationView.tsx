'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Star } from 'lucide-react';
import type { NFT } from '@/lib/stargaze';
import { getStargazeNFTUrl, isDarkColor } from '@/lib/utils';

type PresentationViewProps = {
  nfts: NFT[];
  descriptions?: Record<string, string>;
  autoPlayDuration?: number;
  backgroundColor?: string;
  hasBackgroundMusic?: boolean;
  onVideoStateChange?: (isVideo: boolean) => void;
  onNFTClick?: (nft: NFT) => void;
};

export function PresentationView({
  nfts,
  descriptions = {},
  autoPlayDuration = 5000,
  backgroundColor = '#000000',
  hasBackgroundMusic = false,
  onVideoStateChange,
  onNFTClick,
}: PresentationViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Determine text colors based on background
  const isDark = isDarkColor(backgroundColor);
  const textColor = isDark ? 'text-white' : 'text-neutral-900';
  const textMuted = isDark ? 'text-white/80' : 'text-neutral-600';
  const progressBg = isDark ? 'bg-white/30' : 'bg-black/20';
  const progressFill = isDark ? 'bg-white' : 'bg-neutral-900';
  const buttonBg = isDark ? 'bg-black/50 hover:bg-black/70 text-white' : 'bg-white/80 hover:bg-white text-neutral-900';
  const navButtonBg = isDark ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-white/80 text-neutral-900 hover:bg-white';
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const safeNfts = nfts || [];
  const hasNfts = safeNfts.length > 0;
  const currentNft = hasNfts ? safeNfts[currentIndex] : null;
  const currentIsVideo = currentNft?.mediaType === 'video' && !!currentNft?.animationUrl;

  // Notify parent when video state changes (for pausing background music)
  useEffect(() => {
    onVideoStateChange?.(currentIsVideo);
    // Reset video duration when changing slides
    setVideoDuration(null);
  }, [currentIsVideo, currentIndex, onVideoStateChange]);

  // Navigate to next/prev
  const goToNext = useCallback(() => {
    if (!hasNfts) return;
    setCurrentIndex((prev) => (prev + 1) % safeNfts.length);
    setProgress(0);
    progressRef.current = 0;
  }, [hasNfts, safeNfts.length]);

  const goToPrev = useCallback(() => {
    if (!hasNfts) return;
    setCurrentIndex((prev) => (prev - 1 + safeNfts.length) % safeNfts.length);
    setProgress(0);
    progressRef.current = 0;
  }, [hasNfts, safeNfts.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setProgress(0);
    progressRef.current = 0;
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Auto-advance timer
  // For videos: wait for video to end (handled by onEnded event)
  // For images: use autoPlayDuration
  useEffect(() => {
    if (!isPlaying || !hasNfts || safeNfts.length <= 1) return;

    // For videos, we'll advance when the video ends via onEnded handler
    // But we still show progress based on video duration if known
    if (currentIsVideo && videoDuration) {
      lastTimeRef.current = performance.now();

      const animate = (currentTime: number) => {
        const deltaTime = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;

        progressRef.current += deltaTime;
        const durationMs = videoDuration * 1000;
        const newProgress = Math.min((progressRef.current / durationMs) * 100, 100);
        setProgress(newProgress);

        // Don't auto-advance here - video onEnded will handle it
        if (progressRef.current < durationMs) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }

    // For images or videos without known duration, use fixed autoPlayDuration
    if (!currentIsVideo) {
      lastTimeRef.current = performance.now();

      const animate = (currentTime: number) => {
        const deltaTime = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;

        progressRef.current += deltaTime;
        const newProgress = Math.min((progressRef.current / autoPlayDuration) * 100, 100);
        setProgress(newProgress);

        if (progressRef.current >= autoPlayDuration) {
          goToNext();
        } else {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPlaying, currentIndex, autoPlayDuration, goToNext, hasNfts, safeNfts.length, currentIsVideo, videoDuration]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'p' || e.key === 'P') {
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, togglePlayPause]);

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const showControlsTemporarily = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    const handleMouseMove = () => showControlsTemporarily();
    const handleClick = () => showControlsTemporarily();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    showControlsTemporarily();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      clearTimeout(timeout);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    touchStartX.current = null;
  };

  // Early return AFTER all hooks
  if (!hasNfts || !currentNft) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor }}
      >
        <p className="text-white/60">No NFTs to display</p>
      </div>
    );
  }

  const isVideo = currentNft.mediaType === 'video' && currentNft.animationUrl;
  const isAudio = currentNft.mediaType === 'audio' && currentNft.audioUrl;
  const currentDescription = currentNft.collection
    ? (descriptions[`${currentNft.collection.contractAddress}-${currentNft.tokenId}`] || '')
    : '';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex flex-col"
      style={{ backgroundColor }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars at top */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex gap-1 p-3 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {safeNfts.map((_, index) => (
          <button
            key={index}
            onClick={() => goToIndex(index)}
            className={`flex-1 h-1 ${progressBg} rounded-full overflow-hidden cursor-pointer transition-colors`}
          >
            <div
              className={`h-full ${progressFill} rounded-full transition-all duration-100`}
              style={{
                width:
                  index < currentIndex
                    ? '100%'
                    : index === currentIndex
                    ? `${progress}%`
                    : '0%',
              }}
            />
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Left navigation area */}
        <button
          onClick={goToPrev}
          className={`absolute left-0 top-0 bottom-0 w-1/4 z-10 flex items-center justify-start pl-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className={`w-10 h-10 rounded-full ${navButtonBg} flex items-center justify-center transition-colors`}>
            <ChevronLeft size={24} />
          </div>
        </button>

        {/* NFT Display */}
        <div className="w-full h-full flex items-center justify-center px-8 pt-16 pb-40">
          {isVideo ? (
            <video
              ref={videoRef}
              key={currentNft.animationUrl}
              src={currentNft.animationUrl}
              className="max-w-full max-h-full object-contain rounded-lg"
              autoPlay
              playsInline
              muted={!hasBackgroundMusic}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                if (video.duration && isFinite(video.duration)) {
                  setVideoDuration(video.duration);
                }
              }}
              onEnded={() => {
                // When video ends, advance to next slide
                if (isPlaying && safeNfts.length > 1) {
                  goToNext();
                }
              }}
            />
          ) : (
            <img
              key={currentNft.image}
              src={currentNft.image}
              alt={currentNft.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={() => window.open(getStargazeNFTUrl(currentNft.collection.contractAddress, currentNft.tokenId), '_blank')}
              style={{ cursor: 'pointer' }}
            />
          )}

          {isAudio && (
            <audio
              key={currentNft.audioUrl}
              src={currentNft.audioUrl}
              autoPlay
              controls
              className="absolute bottom-40 left-1/2 -translate-x-1/2"
            />
          )}
        </div>

        {/* Right navigation area */}
        <button
          onClick={goToNext}
          className={`absolute right-0 top-0 bottom-0 w-1/4 z-10 flex items-center justify-end pr-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className={`w-10 h-10 rounded-full ${navButtonBg} flex items-center justify-center transition-colors`}>
            <ChevronRight size={24} />
          </div>
        </button>
      </div>

      {/* Bottom info panel - visible on hover/controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 p-6 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-2xl mx-auto text-center">
          {/* Collection name */}
          <h2 className={`${textColor} text-xl font-medium mb-3 drop-shadow-sm`}>
            {currentNft.collection.name}
          </h2>

          {/* Custom description/comment if provided */}
          {currentDescription && (
            <p className={`${textMuted} text-base leading-relaxed mb-4 italic`}>
              "{currentDescription}"
            </p>
          )}

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-3">
            {/* Play/Pause button */}
            <button
              onClick={togglePlayPause}
              className={`inline-flex items-center gap-2 px-4 py-2 ${buttonBg} rounded-full text-sm transition-colors`}
            >
              {isPlaying ? (
                <>
                  <Pause size={16} />
                  Pause
                </>
              ) : (
                <>
                  <Play size={16} />
                  Play
                </>
              )}
            </button>

            {/* Rate button */}
            {onNFTClick && (
              <button
                onClick={() => onNFTClick(currentNft)}
                className={`inline-flex items-center gap-2 px-4 py-2 ${buttonBg} rounded-full text-sm transition-colors`}
                title="Rate this NFT"
              >
                <Star size={16} />
                Rate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
