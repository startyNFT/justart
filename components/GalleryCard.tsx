'use client';

import Link from 'next/link';
import { Eye, Heart, Pencil, ExternalLink } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { GalleryThumbnail } from './GalleryThumbnail';
import type { Gallery } from '@/lib/supabase';

type GalleryCardProps = {
  gallery: Gallery & { likes_count?: number; preview_image?: string };
  mode?: 'view' | 'edit'; // Default to view mode
};

export function GalleryCard({ gallery, mode = 'view' }: GalleryCardProps) {
  const linkHref = mode === 'edit' ? `/edit/${gallery.slug}` : `/g/${gallery.slug}`;

  // Safely parse nft_ids - handle various formats
  let nftIds: { contract: string; token_id: string }[] = [];
  try {
    if (Array.isArray(gallery.nft_ids)) {
      nftIds = gallery.nft_ids as { contract: string; token_id: string }[];
    } else if (typeof gallery.nft_ids === 'string') {
      nftIds = JSON.parse(gallery.nft_ids);
    }
  } catch {
    nftIds = [];
  }

  return (
    <div className="group relative">
      <Link href={linkHref} className="block">
        {/* Horizontal card with golden ratio (approx 16:10) */}
        <div className="aspect-[16/10] rounded-xl overflow-hidden relative bg-neutral-100 dark:bg-neutral-800">
          <GalleryThumbnail
            nftIds={nftIds}
            cachedThumbnails={gallery.cached_thumbnails}
            horizontal
          />

          {/* Hover overlay with gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Mode indicator */}
          {mode === 'edit' && (
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil size={11} />
              Edit
            </div>
          )}

          {/* Stats on hover */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <h3 className="font-medium text-white text-sm truncate max-w-[70%]">
              {gallery.name}
            </h3>
            <div className="flex items-center gap-2.5 text-white/90 text-xs">
              <span className="flex items-center gap-1">
                <Eye size={12} />
                {formatNumber(gallery.views)}
              </span>
              <span className="flex items-center gap-1">
                <Heart size={12} />
                {formatNumber(gallery.likes_count || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Title below card */}
        <div className="mt-2 px-0.5">
          <h3 className="font-medium text-neutral-900 dark:text-white text-sm truncate">
            {gallery.name}
          </h3>
          <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500 text-xs mt-0.5">
            <span className="flex items-center gap-1">
              <Eye size={11} />
              {formatNumber(gallery.views)}
            </span>
            <span className="flex items-center gap-1">
              <Heart size={11} />
              {formatNumber(gallery.likes_count || 0)}
            </span>
          </div>
        </div>
      </Link>

      {/* View gallery button when in edit mode */}
      {mode === 'edit' && (
        <Link
          href={`/g/${gallery.slug}`}
          className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-neutral-700"
          title="View gallery"
        >
          <ExternalLink size={14} className="text-neutral-600 dark:text-neutral-300" />
        </Link>
      )}
    </div>
  );
}
