'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { PresentationView } from '@/components/PresentationView';
import { SizePicker, ArrangementPicker } from '@/components/LayoutPicker';
import { supabase, type Gallery, type NFTItem } from '@/lib/supabase';
import { fetchNFTById, fetchStargazeName, type NFT } from '@/lib/stargaze';
import { formatNumber, isDarkColor } from '@/lib/utils';
import type { SizeType, ArrangementType } from '@/lib/constants';
import { Eye, Heart, Share2, Loader2, Pencil, Home, Image, LayoutGrid, Plus, Lock } from 'lucide-react';
import Link from 'next/link';

export default function GalleryView() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { address } = useChain('stargaze');

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [nftDescriptions, setNftDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [size, setSize] = useState<SizeType>('medium');
  const [arrangement, setArrangement] = useState<ArrangementType>('grid');
  const [isOwner, setIsOwner] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lockLayout, setLockLayout] = useState(false);

  const isDark = gallery ? isDarkColor(gallery.background_color) : false;
  const textColor = isDark ? 'text-white' : 'text-neutral-900';
  const textMuted = isDark ? 'text-white/70' : 'text-neutral-500';
  const bgPanel = isDark ? 'bg-black/70' : 'bg-white/70';
  const borderColor = isDark ? 'border-white/10' : 'border-black/10';

  useEffect(() => {
    async function load() {
      const { data: galleryData, error } = await supabase
        .from('galleries')
        .select('*, users(wallet_address)')
        .eq('slug', slug)
        .single();

      if (error || !galleryData) {
        console.error('Error loading gallery:', error);
        setLoading(false);
        return;
      }

      setGallery(galleryData);

      // Fetch owner's Stargaze name
      const ownerAddress = galleryData.users?.wallet_address;
      if (ownerAddress) {
        const name = await fetchStargazeName(ownerAddress);
        setOwnerName(name);

        if (address && ownerAddress === address) {
          setIsOwner(true);
        }
      }

      // Parse stored layout
      const storedLayout = galleryData.layout || 'medium-grid';
      if (storedLayout.includes('-')) {
        const [s, a] = storedLayout.split('-');
        setSize(s as SizeType);
        setArrangement(a as ArrangementType);
      } else {
        if (['small', 'medium', 'large'].includes(storedLayout)) {
          setSize(storedLayout as SizeType);
          setArrangement('grid');
        } else if (storedLayout === 'horizontal' || storedLayout === 'vertical') {
          setArrangement('vertical');
        } else if (storedLayout === 'grid') {
          setArrangement('grid');
        }
      }

      await supabase
        .from('galleries')
        .update({ views: galleryData.views + 1 })
        .eq('id', galleryData.id);

      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('gallery_id', galleryData.id);
      setLikesCount(count || 0);

      if (address) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('gallery_id', galleryData.id)
          .eq('wallet_address', address)
          .single();
        setHasLiked(!!likeData);
      }

      // Extract per-NFT descriptions
      const descriptions: Record<string, string> = {};
      galleryData.nft_ids.forEach((item: NFTItem) => {
        if (item.description) {
          descriptions[`${item.contract}-${item.token_id}`] = item.description;
        }
      });
      setNftDescriptions(descriptions);

      // Set lock_layout (default to false if not set)
      setLockLayout(galleryData.lock_layout ?? false);

      const nftPromises = galleryData.nft_ids.map(
        (item: NFTItem) =>
          fetchNFTById(item.contract, item.token_id)
      );
      const nftResults = await Promise.all(nftPromises);
      setNfts(nftResults.filter((n): n is NFT => n !== null));

      setLoading(false);
    }

    load();
  }, [slug, address]);

  const handleLike = async () => {
    if (!address || !gallery || liking) return;

    setLiking(true);

    try {
      if (hasLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('gallery_id', gallery.id)
          .eq('wallet_address', address);
        setLikesCount((c) => c - 1);
        setHasLiked(false);
      } else {
        await supabase.from('likes').insert({
          gallery_id: gallery.id,
          wallet_address: address,
        });
        setLikesCount((c) => c + 1);
        setHasLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-400">Gallery not found</p>
      </div>
    );
  }

  const showInfoByDefault = gallery.show_info ?? true;

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: gallery.background_color }}
    >
      {/* Fixed control bar */}
      <div
        className={`
          fixed top-0 left-0 right-0 z-50
          flex items-center justify-between gap-4 px-4 py-3
          ${bgPanel} border-b ${borderColor}
          group
        `}
      >
        {/* Left side - Home always visible, info based on setting */}
        <div className="flex items-center gap-3">
          {/* Home icon - always visible */}
          <Link href="/" className={`p-1.5 rounded-full hover:bg-black/10 ${textMuted}`} title="Home">
            <Home size={18} />
          </Link>

          {/* Gallery info - visible based on show_info setting OR on hover */}
          <div className={`
            flex items-center gap-3
            ${showInfoByDefault ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            transition-opacity duration-500
          `}>
            <div className={`w-px h-5 ${isDark ? 'bg-white/20' : 'bg-black/10'}`} />
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${textColor} max-w-[300px] truncate`}>
                {gallery.name}
              </span>
              {ownerName && (
                <span className={`text-xs ${textMuted}`}>by {ownerName}</span>
              )}
            </div>
            <div className={`w-px h-5 ${isDark ? 'bg-white/20' : 'bg-black/10'}`} />
            <div className={`flex items-center gap-3 text-sm ${textMuted}`}>
              <span className="flex items-center gap-1">
                <Eye size={14} />
                {formatNumber(gallery.views + 1)}
              </span>
              <button
                onClick={handleLike}
                disabled={!address || liking}
                className={`flex items-center gap-1 transition-colors ${hasLiked ? 'text-red-500' : ''} disabled:opacity-50`}
              >
                <Heart size={14} fill={hasLiked ? 'currentColor' : 'none'} />
                {formatNumber(likesCount)}
              </button>
            </div>
          </div>
        </div>

        {/* Right side - All hover only */}
        <div className={`
          flex items-center gap-2
          opacity-0 group-hover:opacity-100
          transition-opacity duration-500
        `}>
          {/* Navigation */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
            isDark
              ? 'bg-white/15 ring-1 ring-white/30'
              : 'bg-black/10 ring-1 ring-black/15'
          }`}>
            <Link href="/my-nfts" className={`p-1.5 rounded-full hover:bg-black/10 ${textMuted}`} title="My NFTs">
              <Image size={18} />
            </Link>
            <Link href="/my-galleries" className={`p-1.5 rounded-full hover:bg-black/10 ${textMuted}`} title="My Galleries">
              <LayoutGrid size={18} />
            </Link>
            <Link href="/create" className={`p-1.5 rounded-full hover:bg-black/10 ${textMuted}`} title="Create Gallery">
              <Plus size={18} />
            </Link>
          </div>

          <div className={`w-px h-5 mx-4 ${isDark ? 'bg-white/30' : 'bg-black/20'}`} />

          {/* Layout controls - hidden if locked */}
          {lockLayout ? (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${textMuted}`} title="Layout locked by owner">
              <Lock size={14} />
              <span className="text-xs">Layout locked</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SizePicker value={size} onChange={setSize} variant={isDark ? 'dark' : 'transparent'} />
              <ArrangementPicker value={arrangement} onChange={setArrangement} variant={isDark ? 'dark' : 'transparent'} />
            </div>
          )}

          <div className={`w-px h-5 mx-4 ${isDark ? 'bg-white/30' : 'bg-black/20'}`} />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={() => router.push(`/edit/${slug}`)}
                className={`p-1.5 rounded-full hover:bg-black/10 ${textMuted}`}
                title="Edit Gallery"
              >
                <Pencil size={18} />
              </button>
            )}
            <button
              onClick={handleShare}
              className={`h-8 px-3 rounded-full transition-all flex items-center justify-center ${
                isDark
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
              title="Copy Link"
            >
              {copied ? (
                <span className="text-xs font-medium">Copied!</span>
              ) : (
                <Share2 size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content - clean art display */}
      {arrangement === 'presentation' ? (
        <PresentationView
          nfts={nfts}
          descriptions={nftDescriptions}
          backgroundColor={gallery.background_color}
        />
      ) : (
        <div className="min-h-screen p-4 pt-16 md:p-8 md:pt-16">
          <NFTGrid nfts={nfts} size={size} arrangement={arrangement} />
        </div>
      )}
    </div>
  );
}
