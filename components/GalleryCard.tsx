'use client';

import Link from 'next/link';
import { Eye, Heart } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { Gallery } from '@/lib/supabase';

type GalleryCardProps = {
  gallery: Gallery & { likes_count?: number; preview_image?: string };
};

export function GalleryCard({ gallery }: GalleryCardProps) {
  return (
    <Link
      href={`/g/${gallery.slug}`}
      className="block group"
    >
      <div
        className="aspect-[4/3] rounded-lg overflow-hidden relative"
        style={{ backgroundColor: gallery.background_color }}
      >
        {gallery.preview_image ? (
          <img
            src={gallery.preview_image}
            alt={gallery.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="grid grid-cols-2 gap-1 p-4 opacity-50">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 bg-neutral-300 rounded"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <h3 className="font-medium text-neutral-900 truncate">
          {gallery.name}
        </h3>
        <div className="flex items-center gap-3 text-neutral-400 text-sm">
          <span className="flex items-center gap-1">
            <Eye size={14} />
            {formatNumber(gallery.views)}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={14} />
            {formatNumber(gallery.likes_count || 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}
