'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GalleryCard } from '@/components/GalleryCard';
import { supabase, GALLERY_CATEGORIES, type Gallery, type GalleryCategory } from '@/lib/supabase';
import { Search, ChevronRight, Loader2, Shuffle, X, Filter } from 'lucide-react';

type GalleryWithLikes = Gallery & { likes_count: number; users?: { wallet_address: string } };

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GalleryWithLikes[]>([]);
  const [searching, setSearching] = useState(false);
  const [mostLiked, setMostLiked] = useState<GalleryWithLikes[]>([]);
  const [mostViewedWeek, setMostViewedWeek] = useState<GalleryWithLikes[]>([]);
  const [randomGalleries, setRandomGalleries] = useState<GalleryWithLikes[]>([]);
  const [categoryGalleries, setCategoryGalleries] = useState<Record<string, GalleryWithLikes[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory | null>(null);

  // Check if we're in a filtered view
  const viewMode = searchParams.get('view');
  const categoryFilter = searchParams.get('category') as GalleryCategory | null;

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Get one week ago
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Parallel fetch
      const [likedResult, viewedResult, randomResult, ...categoryResults] = await Promise.all([
        // Most liked of all time
        supabase
          .from('galleries')
          .select('*, users!inner(wallet_address)')
          .order('views', { ascending: false })
          .limit(6),
        // Most viewed this week (approximated by recent + high views)
        supabase
          .from('galleries')
          .select('*, users!inner(wallet_address)')
          .gte('created_at', weekAgo.toISOString())
          .order('views', { ascending: false })
          .limit(6),
        // Random galleries
        supabase
          .from('galleries')
          .select('*, users!inner(wallet_address)')
          .limit(20),
        // Galleries by category
        ...GALLERY_CATEGORIES.slice(0, 4).map(cat =>
          supabase
            .from('galleries')
            .select('*, users!inner(wallet_address)')
            .eq('category', cat.value)
            .order('views', { ascending: false })
            .limit(3)
        ),
      ]);

      // Get likes counts for all galleries
      const allGalleries = [
        ...(likedResult.data || []),
        ...(viewedResult.data || []),
        ...(randomResult.data || []),
        ...categoryResults.flatMap(r => r.data || []),
      ];

      const uniqueIds = [...new Set(allGalleries.map(g => g.id))];
      const likesResult = await supabase
        .from('likes')
        .select('gallery_id')
        .in('gallery_id', uniqueIds);

      const likesMap = new Map<string, number>();
      (likesResult.data || []).forEach(like => {
        likesMap.set(like.gallery_id, (likesMap.get(like.gallery_id) || 0) + 1);
      });

      const addLikes = (galleries: Gallery[]): GalleryWithLikes[] =>
        galleries.map(g => ({ ...g, likes_count: likesMap.get(g.id) || 0 }));

      // Actually sort by likes for most liked
      const likedGalleries = addLikes(likedResult.data || [])
        .sort((a, b) => b.likes_count - a.likes_count)
        .slice(0, 3);
      setMostLiked(likedGalleries);

      setMostViewedWeek(addLikes(viewedResult.data || []).slice(0, 3));

      // Random shuffle
      const shuffled = [...(randomResult.data || [])].sort(() => Math.random() - 0.5);
      setRandomGalleries(addLikes(shuffled.slice(0, 3)));

      // Category galleries
      const catMap: Record<string, GalleryWithLikes[]> = {};
      GALLERY_CATEGORIES.slice(0, 4).forEach((cat, i) => {
        catMap[cat.value] = addLikes(categoryResults[i].data || []);
      });
      setCategoryGalleries(catMap);

      setLoading(false);
    }

    loadData();
  }, []);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      const query = searchQuery.toLowerCase();

      // Search by gallery name, description, or wallet address
      const result = await supabase
        .from('galleries')
        .select('*, users!inner(wallet_address)')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,users.wallet_address.ilike.%${query}%`)
        .limit(20);

      // Get likes for results
      const ids = (result.data || []).map(g => g.id);
      const likesResult = await supabase
        .from('likes')
        .select('gallery_id')
        .in('gallery_id', ids);

      const likesMap = new Map<string, number>();
      (likesResult.data || []).forEach(like => {
        likesMap.set(like.gallery_id, (likesMap.get(like.gallery_id) || 0) + 1);
      });

      setSearchResults(
        (result.data || []).map(g => ({
          ...g,
          likes_count: likesMap.get(g.id) || 0,
        }))
      );
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Refresh random galleries
  const shuffleRandom = async () => {
    const result = await supabase
      .from('galleries')
      .select('*, users!inner(wallet_address)')
      .limit(20);

    const ids = (result.data || []).map(g => g.id);
    const likesResult = await supabase
      .from('likes')
      .select('gallery_id')
      .in('gallery_id', ids);

    const likesMap = new Map<string, number>();
    (likesResult.data || []).forEach(like => {
      likesMap.set(like.gallery_id, (likesMap.get(like.gallery_id) || 0) + 1);
    });

    const shuffled = [...(result.data || [])].sort(() => Math.random() - 0.5);
    setRandomGalleries(
      shuffled.slice(0, 3).map(g => ({
        ...g,
        likes_count: likesMap.get(g.id) || 0,
      }))
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 animate-spin" />
      </div>
    );
  }

  // Show search results if searching
  if (searchQuery.trim()) {
    return (
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Search bar */}
        <div className="relative mb-8">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search galleries by name, creator, or wallet..."
            className="w-full pl-12 pr-12 py-3 text-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-600"
            autoFocus
          />
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
          >
            <X size={20} />
          </button>
        </div>

        {searching ? (
          <div className="py-12 text-center">
            <Loader2 size={24} className="mx-auto text-neutral-400 dark:text-neutral-500 animate-spin" />
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{searchResults.length} galleries found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {searchResults.map((gallery) => (
                <GalleryCard key={gallery.id} gallery={gallery} />
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-neutral-400 dark:text-neutral-500">
            No galleries found for "{searchQuery}"
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Search bar */}
      <div className="relative mb-8">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search galleries by name, creator, or wallet..."
          className="w-full pl-12 pr-4 py-3 text-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-600"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            !selectedCategory
              ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
          }`}
        >
          All
        </button>
        {GALLERY_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              selectedCategory === cat.value
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Most Liked of All Time */}
      {!selectedCategory && mostLiked.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-white">Most Liked of All Time</h2>
            <Link
              href="/explore/most-liked"
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              View All
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {mostLiked.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
        </section>
      )}

      {/* Most Viewed This Week */}
      {!selectedCategory && mostViewedWeek.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-medium text-neutral-900 dark:text-white">Most Viewed This Week</h2>
            <Link
              href="/explore/trending"
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              View All
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {mostViewedWeek.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
        </section>
      )}

      {/* Random Galleries */}
      {!selectedCategory && randomGalleries.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-neutral-900 dark:text-white">Random Galleries</h2>
              <button
                onClick={shuffleRandom}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Shuffle"
              >
                <Shuffle size={16} className="text-neutral-400 dark:text-neutral-500" />
              </button>
            </div>
            <Link
              href="/explore/all"
              className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              View All
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {randomGalleries.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
        </section>
      )}

      {/* Category sections or filtered view */}
      {selectedCategory ? (
        <section>
          <h2 className="text-lg font-medium mb-5 text-neutral-900 dark:text-white">
            {GALLERY_CATEGORIES.find(c => c.value === selectedCategory)?.label} Galleries
          </h2>
          {categoryGalleries[selectedCategory]?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {categoryGalleries[selectedCategory].map((gallery) => (
                <GalleryCard key={gallery.id} gallery={gallery} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-neutral-400 dark:text-neutral-500">
              No galleries in this category yet
            </div>
          )}
        </section>
      ) : (
        // Show category previews
        GALLERY_CATEGORIES.slice(0, 4).map((cat) => {
          const galleries = categoryGalleries[cat.value] || [];
          if (galleries.length === 0) return null;

          return (
            <section key={cat.value} className="mb-12">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-medium text-neutral-900 dark:text-white">{cat.label}</h2>
                <button
                  onClick={() => setSelectedCategory(cat.value)}
                  className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  View All
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {galleries.map((gallery) => (
                  <GalleryCard key={gallery.id} gallery={gallery} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
