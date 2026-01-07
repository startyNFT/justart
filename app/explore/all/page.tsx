'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, GALLERY_CATEGORIES, type Gallery, type GalleryCategory } from '@/lib/supabase';
import { ArrowLeft, Loader2, Eye, Heart, Search, Grid, List, Calendar } from 'lucide-react';
import { formatNumber, formatDate } from '@/lib/utils';
import { GalleryThumbnail } from '@/components/GalleryThumbnail';

type GalleryWithLikes = Gallery & { likes_count: number; users?: { wallet_address: string } };

type SortOption = 'views' | 'likes' | 'newest';
type ViewMode = 'grid' | 'list';

export default function AllGalleriesPage() {
  const [loading, setLoading] = useState(true);
  const [galleries, setGalleries] = useState<GalleryWithLikes[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('views');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Build query
      let query = supabase
        .from('galleries')
        .select('*, users!inner(wallet_address)')
        .limit(200);

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data: galleriesData } = await query;

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
  }, [selectedCategory]);

  // Filter and sort galleries
  const filteredGalleries = galleries
    .filter(g => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        g.name.toLowerCase().includes(query) ||
        g.description?.toLowerCase().includes(query) ||
        (g.users as { wallet_address: string })?.wallet_address?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'likes':
          return b.likes_count - a.likes_count;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'views':
        default:
          return b.views - a.views;
      }
    });

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
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/explore"
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">All Galleries</h1>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search galleries..."
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value as GalleryCategory || null)}
          className="px-4 py-2 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200"
        >
          <option value="">All Categories</option>
          {GALLERY_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2 border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-neutral-200"
        >
          <option value="views">Most Viewed</option>
          <option value="likes">Most Liked</option>
          <option value="newest">Newest</option>
        </select>

        {/* View toggle */}
        <div className="flex border border-neutral-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-neutral-500 mb-4">{filteredGalleries.length} galleries found</p>

      {/* Gallery display */}
      {filteredGalleries.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGalleries.map((gallery) => (
              <Link key={gallery.id} href={`/g/${gallery.slug}`} className="group">
                <div
                  className="aspect-square rounded-lg overflow-hidden relative"
                  style={{ backgroundColor: gallery.background_color }}
                >
                  <GalleryThumbnail
                    nftIds={gallery.nft_ids as { contract: string; token_id: string }[]}
                    backgroundColor={gallery.background_color}
                    cachedThumbnails={gallery.cached_thumbnails}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900 truncate">{gallery.name}</h3>
                  <div className="flex items-center gap-2 text-neutral-400 text-sm">
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      {formatNumber(gallery.views)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart size={14} />
                      {formatNumber(gallery.likes_count)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {/* List header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-neutral-500 border-b">
              <div className="col-span-5">Gallery</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2 text-right">Views</div>
              <div className="col-span-1 text-right">Likes</div>
              <div className="col-span-2 text-right">Created</div>
            </div>

            {/* List items */}
            {filteredGalleries.map((gallery) => (
              <Link
                key={gallery.id}
                href={`/g/${gallery.slug}`}
                className="grid grid-cols-12 gap-4 px-4 py-3 rounded-lg hover:bg-neutral-50 transition-colors items-center"
              >
                <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: gallery.background_color }}
                  >
                    <GalleryThumbnail
                      nftIds={(gallery.nft_ids as { contract: string; token_id: string }[]).slice(0, 1)}
                      backgroundColor={gallery.background_color}
                      cachedThumbnails={gallery.cached_thumbnails?.slice(0, 1)}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-neutral-900 truncate">{gallery.name}</h3>
                    <p className="text-sm text-neutral-400 truncate">
                      {(gallery.users as { wallet_address: string })?.wallet_address?.slice(0, 12)}...
                    </p>
                  </div>
                </div>
                <div className="hidden md:block col-span-2 text-sm text-neutral-600">
                  {GALLERY_CATEGORIES.find(c => c.value === gallery.category)?.label || '-'}
                </div>
                <div className="hidden md:flex col-span-2 items-center justify-end gap-1 text-neutral-600">
                  <Eye size={14} />
                  {formatNumber(gallery.views)}
                </div>
                <div className="hidden md:flex col-span-1 items-center justify-end gap-1 text-neutral-600">
                  <Heart size={14} />
                  {formatNumber(gallery.likes_count)}
                </div>
                <div className="hidden md:flex col-span-2 items-center justify-end gap-1 text-neutral-400 text-sm">
                  <Calendar size={14} />
                  {formatDate(gallery.created_at)}
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div className="py-12 text-center text-neutral-400">
          No galleries found
        </div>
      )}
    </div>
  );
}
