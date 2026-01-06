'use client';

import { useEffect, useState } from 'react';
import { GalleryCard } from '@/components/GalleryCard';
import { supabase, type Gallery } from '@/lib/supabase';

type GalleryWithMeta = Gallery & { likes_count: number; preview_image?: string };

export default function Home() {
  const [galleries, setGalleries] = useState<GalleryWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGalleries() {
      const { data, error } = await supabase
        .from('galleries')
        .select('*, likes(count)')
        .order('created_at', { ascending: false })
        .limit(24);

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

    fetchGalleries();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] bg-neutral-100 rounded-lg" />
              <div className="mt-2 h-4 bg-neutral-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (galleries.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-400">No galleries yet. Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {galleries.map((gallery) => (
          <GalleryCard key={gallery.id} gallery={gallery} />
        ))}
      </div>
    </div>
  );
}
