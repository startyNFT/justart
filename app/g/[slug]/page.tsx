'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { LayoutPicker } from '@/components/LayoutPicker';
import { supabase, type Gallery } from '@/lib/supabase';
import { fetchNFTById, type NFT } from '@/lib/stargaze';
import { formatNumber } from '@/lib/utils';
import type { LayoutType } from '@/lib/constants';
import { Eye, Heart, Share2, Loader2 } from 'lucide-react';

export default function GalleryView() {
  const params = useParams();
  const slug = params.slug as string;
  const { address } = useChain('stargaze');

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [layout, setLayout] = useState<LayoutType>('medium');

  useEffect(() => {
    async function load() {
      const { data: galleryData, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !galleryData) {
        setLoading(false);
        return;
      }

      setGallery(galleryData);
      setLayout(galleryData.layout as LayoutType);

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

      const nftPromises = galleryData.nft_ids.map(
        (item: { contract: string; token_id: string }) =>
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
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: gallery?.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
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

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: gallery.background_color }}
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium text-neutral-900">
              {gallery.name}
            </h1>
            {gallery.description && (
              <p className="mt-1 text-neutral-500 max-w-xl">
                {gallery.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-neutral-500 text-sm">
              <span className="flex items-center gap-1">
                <Eye size={16} />
                {formatNumber(gallery.views + 1)}
              </span>
              <button
                onClick={handleLike}
                disabled={!address || liking}
                className={`flex items-center gap-1 transition-colors ${
                  hasLiked ? 'text-red-500' : 'hover:text-red-500'
                } disabled:opacity-50`}
              >
                <Heart size={16} fill={hasLiked ? 'currentColor' : 'none'} />
                {formatNumber(likesCount)}
              </button>
            </div>

            <LayoutPicker value={layout} onChange={setLayout} />

            <button
              onClick={handleShare}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-white/50 rounded-lg transition-colors"
              title="Share"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <NFTGrid nfts={nfts} layout={layout} />
      </div>
    </div>
  );
}
