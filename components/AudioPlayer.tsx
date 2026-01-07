'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { MusicTrack } from '@/lib/constants';

type AudioPlayerProps = {
  track: MusicTrack | null;
  externalPause?: boolean; // When true, pause playback (e.g., when video is playing)
};

export function AudioPlayer({ track, externalPause = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [wasPlayingBeforePause, setWasPlayingBeforePause] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasTrack = track && track.url;

  useEffect(() => {
    if (!hasTrack || !track?.url) {
      audioRef.current?.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }

    // Create audio element
    audioRef.current = new Audio(track.url);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;

    // Check if user previously enabled audio for this session
    const audioEnabled = sessionStorage.getItem('gallery-audio-enabled');
    if (audioEnabled === 'true') {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked, wait for user interaction
      });
    }

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [hasTrack, track?.url]);

  // Handle external pause (e.g., when video starts playing)
  useEffect(() => {
    if (!audioRef.current) return;

    if (externalPause && isPlaying) {
      // Remember we were playing and pause
      setWasPlayingBeforePause(true);
      audioRef.current.pause();
    } else if (!externalPause && wasPlayingBeforePause) {
      // Resume if we were playing before
      audioRef.current.play().catch(() => {});
      setWasPlayingBeforePause(false);
    }
  }, [externalPause, isPlaying, wasPlayingBeforePause]);

  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      sessionStorage.setItem('gallery-audio-enabled', 'false');
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        sessionStorage.setItem('gallery-audio-enabled', 'true');
      }).catch(console.error);
    }
  };

  // Don't render if no track
  if (!hasTrack) {
    return null;
  }

  return (
    <button
      onClick={toggleAudio}
      className={`fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
        isPlaying
          ? 'bg-neutral-900 text-white'
          : 'bg-white/90 backdrop-blur-sm text-neutral-600 hover:bg-white'
      }`}
      title={isPlaying ? 'Mute music' : 'Play music'}
    >
      {isPlaying ? (
        <>
          <Volume2 size={18} className="animate-pulse" />
          <span className="text-sm font-medium">{track?.name}</span>
        </>
      ) : (
        <>
          <VolumeX size={18} />
          <span className="text-sm font-medium">Play Music</span>
        </>
      )}
    </button>
  );
}
