'use client';

import { useEffect, useState } from 'react';
import { useChain } from '@cosmos-kit/react';
import Link from 'next/link';
import { GalleryCard } from '@/components/GalleryCard';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { supabase, type Gallery } from '@/lib/supabase';
import { Wallet, Plus } from 'lucide-react';
import { calculateGalleryPrice } from '@/lib/utils';

type GalleryWithMeta = Gallery & { likes_count: number };

export default function MyGalleries() {
  const { address, isWalletConnected } = useChain('stargaze');
  const [galleries, setGalleries] = useState<GalleryWithMeta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;

    async function loadGalleries() {
      setLoading(true);

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', address)
        .single();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('galleries')
        .select('*, likes(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching galleries:', error);
        setLoading(false);
        return;
      }

      const galleriesWithMeta = (data || []).map((g: Gallery & { likes: { count: number }[] }) => ({
        ...g,
        likes_count: g.likes?.[0]?.count || 0,
      }));

      setGalleries(galleriesWithMeta);
      setLoading(false);
    }

    loadGalleries();
  }, [address]);

  if (!isWalletConnected) {
    return (
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-12 md:py-20 text-center">
        <Wallet size={48} className="mx-auto text-neutral-300 mb-4" strokeWidth={1} />
        <p className="text-neutral-400 mb-4">Connect your wallet to see your galleries</p>
        <ConnectWalletButton />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] bg-neutral-100 rounded-lg" />
              <div className="mt-2 h-4 bg-neutral-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const nextPrice = calculateGalleryPrice(galleries.length);

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
      <div className="flex justify-end mb-4 md:mb-6">
        <Link
          href="/create"
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm md:text-base"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Create Gallery</span>
          <span className="sm:hidden">Create</span>
          {nextPrice > 0 && (
            <span className="text-neutral-400 text-sm hidden sm:inline">({nextPrice} STARS)</span>
          )}
        </Link>
      </div>

      {galleries.length === 0 ? (
        <div className="py-12 md:py-20 text-center">
          <p className="text-neutral-400">You haven't created any galleries yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {galleries.map((gallery) => (
            <GalleryCard key={gallery.id} gallery={gallery} mode="edit" />
          ))}
        </div>
      )}
    </div>
  );
}
