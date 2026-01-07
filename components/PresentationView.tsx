'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { NFT } from '@/lib/stargaze';
import { getStargazeNFTUrl } from '@/lib/utils';

type PresentationViewProps = {
  nfts: NFT[];
  descriptions?: Record<string, string>; // Map of tokenId to description
  autoPlayDuration?: number; // Duration in ms for each slide (default 5000)
  backgroundColor?: string;
};

export function PresentationView({
  nfts,
  descriptions = {},
  autoPlayDuration = 5000,
  backgroundColor = '#000000',
}: PresentationViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const currentNft = nfts[currentIndex];
  const isVideo = currentNft?.mediaType === 'video' && currentNft?.animationUrl;
  const isAudio = currentNft?.mediaType === 'audio' && currentNft?.audioUrl;

  // Get description for current NFT
  const currentDescription = descriptions[`${currentNft?.collection.contractAddress}-${currentNft?.tokenId}`] || '';

  // Navigate to next/prev
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % nfts.length);
    setProgress(0);
    progressRef.current = 0;
  }, [nfts.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + nfts.length) % nfts.length);
    setProgress(0);
    progressRef.current = 0;
  }, [nfts.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setProgress(0);
    progressRef.current = 0;
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Auto-advance timer with smooth progress
  useEffect(() => {
    if (!isPlaying || nfts.length <= 1) return;

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
  }, [isPlaying, currentIndex, autoPlayDuration, goToNext, nfts.length]);

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

  // Touch/swipe support
  const touchStartX = useRef<number | null>(null);

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

  if (!currentNft) return null;

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
        {nfts.map((_, index) => (
          <button
            key={index}
            onClick={() => goToIndex(index)}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer hover:bg-white/40 transition-colors"
          >
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
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
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <ChevronLeft size={24} />
          </div>
        </button>

        {/* NFT Display */}
        <div className="w-full h-full flex items-center justify-center p-8 pb-32">
          {isVideo ? (
            <video
              key={currentNft.animationUrl}
              src={currentNft.animationUrl}
              className="max-w-full max-h-full object-contain rounded-lg"
              autoPlay
              loop
              muted
              playsInline
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
          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <ChevronRight size={24} />
          </div>
        </button>
      </div>

      {/* Bottom info panel */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-2xl mx-auto text-center">
          {/* Collection name */}
          <h2 className="text-white text-xl font-medium mb-3">
            {currentNft.collection.name}
          </h2>

          {/* Custom description/comment if provided */}
          {currentDescription && (
            <p className="text-white/80 text-base leading-relaxed mb-4 italic">
              "{currentDescription}"
            </p>
          )}

          {/* Play/Pause button */}
          <button
            onClick={togglePlayPause}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-colors"
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

          {/* Counter */}
          <p className="text-white/40 text-xs mt-3">
            {currentIndex + 1} / {nfts.length}
          </p>
        </div>
      </div>
    </div>
  );
}
