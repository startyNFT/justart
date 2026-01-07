'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { SizePicker, ArrangementPicker } from '@/components/LayoutPicker';
import { fetchNFTPage, PAGE_SIZE, FAST_INITIAL_SIZE, type NFT } from '@/lib/stargaze';
import type { SizeType, ArrangementType } from '@/lib/constants';
import { Wallet, Loader2, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

const ITEMS_PER_PAGE = PAGE_SIZE;

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div className="aspect-square bg-neutral-100 rounded-lg animate-pulse">
      <div className="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
    </div>
  );
}

// Skeleton grid that shows while loading
function SkeletonGrid({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default function MyNFTs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isWalletConnected } = useChain('stargaze');
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState<SizeType>('medium');
  const [arrangement, setArrangement] = useState<ArrangementType>('grid');
  const [hideDuplicates, setHideDuplicates] = useState(true);

  // Background loading state
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [initialProgress, setInitialProgress] = useState(0);
  const backgroundLoadingRef = useRef(false);
  const initialProgressRef = useRef<NodeJS.Timeout | null>(null);

  // Get page from URL, default to 1
  const currentPage = Number(searchParams.get('page')) || 1;

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animate progress: 0-75% over 5 seconds, then smooth random increments up to 99%
  useEffect(() => {
    if (!loading) return;

    const startTime = Date.now();
    const duration = 5000; // 5 seconds to reach 75%
    let currentProgress = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < duration) {
        // Phase 1: 0-75% over 5 seconds (smooth)
        currentProgress = (elapsed / duration) * 75;
      } else if (currentProgress < 99) {
        // Phase 2: smooth random increments toward 99%
        // Smaller increments as we get closer to 99%
        const remaining = 99 - currentProgress;
        const increment = Math.random() * Math.min(0.5, remaining * 0.1) + 0.05;
        currentProgress = Math.min(currentProgress + increment, 99);
      }

      setInitialProgress(currentProgress);

      if (currentProgress < 99 && loading) {
        // Random interval between 50-150ms for organic feel
        const nextInterval = 50 + Math.random() * 100;
        initialProgressRef.current = setTimeout(animate, nextInterval);
      }
    };

    animate();

    return () => {
      if (initialProgressRef.current) {
        clearTimeout(initialProgressRef.current);
      }
    };
  }, [loading]);

  // Background load all pages for faster navigation
  const backgroundLoadAllPages = useCallback(async (walletAddress: string, totalCount: number) => {
    if (backgroundLoadingRef.current) return;
    backgroundLoadingRef.current = true;

    const pagesToLoad = Math.ceil(totalCount / PAGE_SIZE);
    const CONCURRENT_REQUESTS = 6;

    // Generate all page offsets (skip first page, already loaded)
    const offsets: number[] = [];
    for (let page = 2; page <= pagesToLoad; page++) {
      offsets.push((page - 1) * PAGE_SIZE);
    }

    let loadedCount = PAGE_SIZE; // First page already loaded

    // Fetch in parallel batches
    for (let i = 0; i < offsets.length; i += CONCURRENT_REQUESTS) {
      const batch = offsets.slice(i, i + CONCURRENT_REQUESTS);
      setLoadingProgress({ loaded: loadedCount, total: totalCount });

      await Promise.all(
        batch.map(offset => fetchNFTPage(walletAddress, offset, PAGE_SIZE))
      );

      loadedCount += batch.length * PAGE_SIZE;
    }

    setLoadingProgress({ loaded: totalCount, total: totalCount });
    // Brief delay to show 100% before hiding
    await new Promise(resolve => setTimeout(resolve, 300));
    setLoadingProgress({ loaded: 0, total: 0 });
  }, []);

  // Load page with progressive loading
  useEffect(() => {
    if (!address) return;

    async function loadPage(retryCount = 0) {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      // For non-first pages, check cache first (instant load, no progress bar)
      if (currentPage > 1) {
        const cachedKey = `pureart_nfts_page_${address}_${offset}`;
        const cachedTotalKey = `pureart_nfts_total_${address}`;
        try {
          const cached = localStorage.getItem(cachedKey);
          const cachedTotal = localStorage.getItem(cachedTotalKey);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 5 * 60 * 1000 && data.length > 0) {
              setNfts(data);
              // Restore total from cache
              if (cachedTotal) {
                const { total: savedTotal, timestamp: totalTs } = JSON.parse(cachedTotal);
                if (Date.now() - totalTs < 5 * 60 * 1000) {
                  setTotal(savedTotal);
                }
              }
              return; // Instant load from cache, no progress bar needed
            }
          }
        } catch { /* ignore cache errors */ }
      }

      // Progressive loading for first page - show something fast
      if (currentPage === 1) {
        setInitialProgress(0);
        setLoading(true);

        // First: Quick fetch of 12 NFTs to show immediately
        const fastResult = await fetchNFTPage(address!, 0, FAST_INITIAL_SIZE);

        if (fastResult.nfts.length > 0) {
          setNfts(fastResult.nfts);
          setTotal(fastResult.total);
          setLoading(false); // Hide skeleton immediately

          // Cache the total for other pages
          try {
            localStorage.setItem(`pureart_nfts_total_${address}`, JSON.stringify({
              total: fastResult.total,
              timestamp: Date.now()
            }));
          } catch { /* ignore */ }
        }

        // Then: Fetch the rest of the page in background
        if (fastResult.total > FAST_INITIAL_SIZE) {
          const remainingResult = await fetchNFTPage(address!, FAST_INITIAL_SIZE, ITEMS_PER_PAGE - FAST_INITIAL_SIZE);
          setNfts(prev => [...prev.slice(0, FAST_INITIAL_SIZE), ...remainingResult.nfts]);
        }

        // Start background loading for other pages
        if (fastResult.total > PAGE_SIZE && !backgroundLoadingRef.current) {
          backgroundLoadAllPages(address!, fastResult.total);
        }
        return;
      }

      // Non-first pages - normal loading
      setInitialProgress(0);
      setLoading(true);

      const result = await fetchNFTPage(address!, offset, ITEMS_PER_PAGE);

      // Retry if no results
      if (result.nfts.length === 0 && retryCount < 3) {
        console.warn(`Got 0 NFTs, retrying (attempt ${retryCount + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return loadPage(retryCount + 1);
      }

      setNfts(result.nfts);
      if (result.total > 0) {
        setTotal(result.total);
        // Cache the total
        try {
          localStorage.setItem(`pureart_nfts_total_${address}`, JSON.stringify({
            total: result.total,
            timestamp: Date.now()
          }));
        } catch { /* ignore */ }
      }

      // Complete progress bar to 100%, then hide
      setInitialProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));
      setLoading(false);
    }

    loadPage();
  }, [address, currentPage, backgroundLoadAllPages]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      router.push(page === 1 ? '/my-nfts' : `/my-nfts?page=${page}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [totalPages, router]);

  // Deduplicate open editions (same collection + same image = duplicate)
  const { displayNfts, duplicateCounts } = useMemo(() => {
    if (!hideDuplicates) {
      return { displayNfts: nfts, duplicateCounts: new Map<string, number>() };
    }

    const seen = new Map<string, NFT>(); // key -> first NFT
    const counts = new Map<string, number>(); // key -> count

    for (const nft of nfts) {
      // Key by collection + image URL (open editions have same image)
      const key = `${nft.collection.contractAddress}-${nft.image}`;
      const existing = seen.get(key);

      if (existing) {
        counts.set(key, (counts.get(key) || 1) + 1);
      } else {
        seen.set(key, nft);
        counts.set(key, 1);
      }
    }

    return {
      displayNfts: Array.from(seen.values()),
      duplicateCounts: counts,
    };
  }, [nfts, hideDuplicates]);

  // Generate page numbers to show - memoized
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 size={32} className="mx-auto text-neutral-300 animate-spin" />
      </div>
    );
  }

  if (!isWalletConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Wallet size={48} className="mx-auto text-neutral-300 mb-4" strokeWidth={1} />
        <p className="text-neutral-400 mb-4">Connect your wallet to see your NFTs</p>
        <ConnectWalletButton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Loading progress bar - only shows during current page load */}
      {loading && (
        <div className="mb-4">
          <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all duration-150 ease-out"
              style={{ width: `${initialProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <p className="text-sm text-neutral-400">
            {total > 0
              ? `${total} NFTs`
              : loading
              ? 'Loading...'
              : 'No NFTs found'}
          </p>
          {loading && (
            <Loader2 size={14} className="text-neutral-400 animate-spin" />
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setHideDuplicates(!hideDuplicates)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors flex-shrink-0 ${
              hideDuplicates
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
            title={hideDuplicates ? 'Show all NFTs' : 'Hide duplicate open editions'}
          >
            <Layers size={14} />
            <span className="hidden sm:inline">{hideDuplicates ? 'Unique' : 'All'}</span>
          </button>
          <SizePicker value={size} onChange={setSize} />
          <ArrangementPicker value={arrangement} onChange={setArrangement} exclude={['presentation']} />
        </div>
      </div>

      {loading && nfts.length === 0 ? (
        <SkeletonGrid count={20} />
      ) : (
        <>
          <NFTGrid nfts={displayNfts} size={size} arrangement={arrangement} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pb-8">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>

              {pageNumbers.map((page, i) => (
                typeof page === 'number' ? (
                  <button
                    key={i}
                    onClick={() => goToPage(page)}
                    className={`min-w-[40px] h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-neutral-900 text-white'
                        : 'hover:bg-neutral-100'
                    }`}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={i} className="px-2 text-neutral-400">...</span>
                )
              ))}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
