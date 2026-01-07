'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GalleryCard } from '@/components/GalleryCard';
import { supabase, type Gallery } from '@/lib/supabase';
import { ArrowLeft, Loader2, TrendingUp } from 'lucide-react';

type GalleryWithLikes = Gallery & { likes_count: number };

export default function TrendingPage() {
  const [loading, setLoading] = useState(true);
  const [galleries, setGalleries] = useState<GalleryWithLikes[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Get one week ago
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get galleries created in the last week, sorted by views
      const { data: galleriesData } = await supabase
        .from('galleries')
        .select('*, users!inner(wallet_address)')
        .gte('created_at', weekAgo.toISOString())
        .order('views', { ascending: false })
        .limit(100);

      if (!galleriesData) {
        setLoading(false);
        return;
      }

      // Get likes for all galleries
      const ids = galleriesData.map(g => g.id);
      const { data: likesData } = await supabase
        .from('likes')
        .select('gallery_id')
        .in('gallery_id', ids);

      // Count likes per gallery
      const likesMap = new Map<string, number>();
      (likesData || []).forEach(like => {
        likesMap.set(like.gallery_id, (likesMap.get(like.gallery_id) || 0) + 1);
      });

      // Add likes count
      const galleriesWithLikes = galleriesData.map(g => ({
        ...g,
        likes_count: likesMap.get(g.id) || 0,
      }));

      setGalleries(galleriesWithLikes);
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 size={32} className="mx-auto text-neutral-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/explore"
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <TrendingUp size={24} className="text-green-500" />
          <h1 className="text-2xl font-bold">Trending This Week</h1>
        </div>
      </div>

      {/* Gallery grid */}
      {galleries.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleries.map((gallery) => (
            <GalleryCard key={gallery.id} gallery={gallery} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-neutral-400">
          No trending galleries this week
        </div>
      )}
    </div>
  );
}
