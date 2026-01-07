'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchNFTById, type NFT } from '@/lib/stargaze';
import { Home, Star, ChevronLeft, ChevronRight, Volume2, VolumeX, ExternalLink, Loader2 } from 'lucide-react';

type TopRatedNFT = {
  contract: string;
  tokenId: string;
  galleryId: string;
  average: number;
  count: number;
  gallery: {
    id: string;
    slug: string;
    name: string;
    background_color: string;
  } | null;
};

// Ambient music tracks for relaxation
const AMBIENT_TRACKS = [
  { name: 'Peaceful Dreams', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { name: 'Calm Waters', url: 'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3' },
];

export default function RelaxingCorner() {
  const [topRated, setTopRated] = useState<TopRatedNFT[]>([]);
  const [nfts, setNfts] = useState<(NFT & { rating: number; ratingCount: number; gallery: TopRatedNFT['gallery'] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Load top-rated NFTs
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ratings/top?limit=20&min_ratings=1');
        const data = await res.json();

        if (data.topRated && data.topRated.length > 0) {
          setTopRated(data.topRated);

          // Fetch NFT details
          const nftPromises = data.topRated.map(async (item: TopRatedNFT) => {
            const nft = await fetchNFTById(item.contract, item.tokenId);
            if (nft) {
              return {
                ...nft,
                rating: item.average,
                ratingCount: item.count,
                gallery: item.gallery,
              };
            }
            return null;
          });

          const results = await Promise.all(nftPromises);
          setNfts(results.filter((n): n is NonNullable<typeof n> => n !== null));
        }
      } catch (error) {
        console.error('Error loading top rated:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // Initialize audio
  useEffect(() => {
    const randomTrack = AMBIENT_TRACKS[Math.floor(Math.random() * AMBIENT_TRACKS.length)];
    const audio = new Audio(randomTrack.url);
    audio.loop = true;
    audio.volume = 0.3;
    setAudioElement(audio);

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const toggleAudio = useCallback(() => {
    if (!audioElement) return;

    if (audioPlaying) {
      audioElement.pause();
      setAudioPlaying(false);
    } else {
      audioElement.play().catch(() => {});
      setAudioPlaying(true);
    }
  }, [audioElement, audioPlaying]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % nfts.length);
  }, [nfts.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + nfts.length) % nfts.length);
  }, [nfts.length]);

  // Auto-advance every 10 seconds
  useEffect(() => {
    if (nfts.length <= 1) return;

    const interval = setInterval(goToNext, 10000);
    return () => clearInterval(interval);
  }, [nfts.length, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === ' ' || e.key === 'm') {
        e.preventDefault();
        toggleAudio();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext, toggleAudio]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <Star className="w-12 h-12 text-yellow-400/50 mb-4" />
        <h1 className="text-2xl font-light mb-2">Relaxing Corner</h1>
        <p className="text-white/50 mb-6">No rated NFTs yet</p>
        <Link
          href="/explore"
          className="px-4 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20 transition-colors"
        >
          Explore Galleries
        </Link>
      </div>
    );
  }

  const currentNft = nfts[currentIndex];

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden">
      {/* Ambient background blur from current image */}
      <div
        className="absolute inset-0 scale-110 blur-3xl opacity-30"
        style={{
          backgroundImage: `url(${currentNft.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70"
          >
            <Home size={18} />
          </Link>
          <div className="flex items-center gap-2 text-white/70">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-light">Relaxing Corner</span>
          </div>
        </div>

        <button
          onClick={toggleAudio}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70"
          title={audioPlaying ? 'Mute' : 'Play ambient music'}
        >
          {audioPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8 pt-20 pb-32">
        <div className="relative max-w-4xl w-full">
          {/* Image */}
          <div className="relative rounded-xl overflow-hidden shadow-2xl">
            <img
              src={currentNft.image}
              alt={currentNft.name}
              className="w-full h-auto max-h-[70vh] object-contain bg-black"
            />

            {/* Navigation arrows */}
            {nfts.length > 1 && (
              <>
                <button
                  onClick={goToPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white/80 hover:bg-black/70 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end justify-between gap-4">
            {/* NFT info */}
            <div className="text-white">
              <h2 className="text-xl font-light mb-1">{currentNft.name}</h2>
              <p className="text-sm text-white/50 mb-2">{currentNft.collection.name}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-white/80">
                    {currentNft.rating.toFixed(1)} ({currentNft.ratingCount})
                  </span>
                </div>
                {currentNft.gallery && (
                  <Link
                    href={`/g/${currentNft.gallery.slug}`}
                    className="flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    <span>from {currentNft.gallery.name}</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>

            {/* Pagination dots */}
            {nfts.length > 1 && (
              <div className="flex items-center gap-1.5">
                {nfts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentIndex
                        ? 'bg-white w-4'
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
