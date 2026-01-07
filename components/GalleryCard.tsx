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
        <div
          className="aspect-square rounded-lg overflow-hidden relative"
          style={{ backgroundColor: gallery.background_color }}
        >
          <GalleryThumbnail
            nftIds={nftIds}
            backgroundColor={gallery.background_color}
          />

          {/* Mode indicator */}
          {mode === 'edit' && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil size={12} />
              Edit
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

      {/* View gallery button when in edit mode */}
      {mode === 'edit' && (
        <Link
          href={`/g/${gallery.slug}`}
          className="absolute top-2 right-2 p-2 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          title="View gallery"
        >
          <ExternalLink size={16} className="text-neutral-600" />
        </Link>
      )}
    </div>
  );
}
