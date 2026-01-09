'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { SortableNFTGrid } from '@/components/SortableNFTGrid';
import { SizePicker, ArrangementPicker } from '@/components/LayoutPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { MusicPicker } from '@/components/MusicPicker';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { CustomRowEditor, type RowConfig, rowConfigsToRowCounts } from '@/components/CustomRowEditor';
import { fetchNFTPage, PAGE_SIZE, FAST_INITIAL_SIZE, type NFT } from '@/lib/stargaze';
import { supabase, GALLERY_CATEGORIES, type GalleryCategory } from '@/lib/supabase';
import { generateSlug } from '@/lib/utils';
import { TREASURY_WALLET, CONCURRENT_REQUESTS, LARGE_COLLECTION_THRESHOLD } from '@/lib/constants';
import { fetchPaymentsToTreasury, calculateEffectivePrice, PUREART_MEMO_PREFIX } from '@/lib/cosmos';
import type { SizeType, ArrangementType, MusicTrack } from '@/lib/constants';
import { Wallet, Loader2, ArrowRight, ArrowLeft, Layers, Gift, Lock, Unlock, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLoadingProgress } from '@/hooks/useLoadingProgress';
import { useNFTFilters } from '@/hooks/useNFTFilters';
import { useGalleryForm } from '@/hooks/useGalleryForm';

type Step = 'customize' | 'select' | 'arrange' | 'create';

// Skeleton grid for loading state
function SkeletonGrid({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square bg-neutral-100 rounded-lg animate-pulse">
          <div className="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
        </div>
      ))}
    </div>
  );
}

export default function CreateGallery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isWalletConnected, getSigningStargateClient } = useChain('stargaze');

  const [step, setStep] = useState<Step>('customize');
  const [pageNfts, setPageNfts] = useState<NFT[]>([]); // Current page NFTs
  const [allLoadedNfts, setAllLoadedNfts] = useState<NFT[]>([]); // All loaded NFTs for search
  const [loading, setLoading] = useState(false);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [total, setTotal] = useState(0);
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [audioNfts, setAudioNfts] = useState<NFT[]>([]);

  // Use shared gallery form hook
  const form = useGalleryForm({
    initialState: {
      backgroundColor: '#0A0A0A',
      showInfo: true,
      lockLayout: false,
    },
  });

  // Use shared NFT filters hook for search and filtering
  const filters = useNFTFilters({
    nfts: allLoadedNfts.length > 0 ? allLoadedNfts : pageNfts,
    hideDuplicates: true,
  });

  // Use shared loading progress hook
  const initialProgress = useLoadingProgress(loading);

  const [galleryCount, setGalleryCount] = useState(0);
  const [paidSlots, setPaidSlots] = useState(1);
  const [checkingPayments, setCheckingPayments] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [backgroundLoadingProgress, setBackgroundLoadingProgress] = useState('');

  // Background loading ref to prevent duplicate loads
  const backgroundLoadingRef = useRef(false);
  const nftCollectionLoaded = useRef(false);

  // Page from URL
  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const effectivePrice = calculateEffectivePrice(galleryCount, paidSlots);
  const hasCredit = paidSlots > galleryCount;

  const selectedIds = new Set(
    form.form.selectedNfts.map((nft) => `${nft.collection.contractAddress}-${nft.tokenId}`)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load NFT collection with progressive loading
  const loadNftCollection = useCallback(async (walletAddress: string) => {
    if (nftCollectionLoaded.current) return;
    nftCollectionLoaded.current = true;
    setLoadingCollection(true);

    // First: Quick fetch of 12 NFTs to show immediately
    const fastResult = await fetchNFTPage(walletAddress, 0, FAST_INITIAL_SIZE);
    if (fastResult.nfts.length > 0) {
      setPageNfts(fastResult.nfts);
      setTotal(fastResult.total);
      setLoadingCollection(false); // Hide skeleton immediately
    }

    // Then: Fetch the rest of the first page
    if (fastResult.total > FAST_INITIAL_SIZE) {
      const remainingResult = await fetchNFTPage(walletAddress, FAST_INITIAL_SIZE, PAGE_SIZE - FAST_INITIAL_SIZE);
      const fullFirstPage = [...fastResult.nfts, ...remainingResult.nfts];
      setPageNfts(fullFirstPage);

      // Start background loading for remaining pages
      if (fastResult.total > PAGE_SIZE && !backgroundLoadingRef.current) {
        backgroundLoadingRef.current = true;
        backgroundLoadAllNfts(walletAddress, fastResult.total, fullFirstPage);
      } else {
        setAllLoadedNfts(fullFirstPage);
        const audioFromPage = fullFirstPage.filter(nft => nft.mediaType === 'audio' || nft.mediaType === 'video');
        setAudioNfts(audioFromPage);
      }
    } else {
      setAllLoadedNfts(fastResult.nfts);
      const audioFromPage = fastResult.nfts.filter(nft => nft.mediaType === 'audio' || nft.mediaType === 'video');
      setAudioNfts(audioFromPage);
    }
  }, []);

  // Start loading NFTs in background on mount
  useEffect(() => {
    if (!address) return;
    loadNftCollection(address);
  }, [address, loadNftCollection]);

  // Load page when navigating pagination
  useEffect(() => {
    if (!address || !nftCollectionLoaded.current || currentPage === 1) return;

    let cancelled = false;

    async function loadPage() {
      const offset = (currentPage - 1) * PAGE_SIZE;

      // Check cache first (instant load, no progress bar)
      const cachedKey = `pureart_nfts_page_${address}_${offset}`;
      try {
        const cached = localStorage.getItem(cachedKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 5 * 60 * 1000 && data.length > 0) {
            if (cancelled) return;
            setPageNfts(data);
            return; // Instant load from cache
          }
        }
      } catch { /* ignore cache errors */ }

      // No cache hit - show loading progress bar
      setInitialProgress(0);
      setLoading(true);

      const result = await fetchNFTPage(address!, offset, PAGE_SIZE);

      if (cancelled) return;

      setPageNfts(result.nfts);
      if (result.total > 0) {
        setTotal(result.total);
      }

      // Complete progress bar to 100%, then hide
      setInitialProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));
      setLoading(false);
    }

    loadPage();

    return () => { cancelled = true; };
  }, [address, currentPage]);

  // Background load all NFTs for search - parallel loading for speed
  const backgroundLoadAllNfts = async (walletAddress: string, totalCount: number, firstPageNfts: NFT[]) => {
    setAllLoadedNfts(firstPageNfts);
    // Extract audio NFTs from first page
    const firstPageAudio = firstPageNfts.filter(nft => nft.mediaType === 'audio' || nft.mediaType === 'video');
    setAudioNfts(firstPageAudio);

    const pagesToLoad = Math.ceil(totalCount / PAGE_SIZE);
    let loadedNfts = [...firstPageNfts];
    let loadedAudioNfts = [...firstPageAudio];

    const offsets: number[] = [];
    for (let page = 2; page <= pagesToLoad; page++) {
      offsets.push((page - 1) * PAGE_SIZE);
    }

    for (let i = 0; i < offsets.length; i += CONCURRENT_REQUESTS) {
      const batch = offsets.slice(i, i + CONCURRENT_REQUESTS);
      setBackgroundLoadingProgress(`Loading: ${loadedNfts.length} / ${totalCount}`);

      const results = await Promise.all(
        batch.map(offset => fetchNFTPage(walletAddress, offset, PAGE_SIZE))
      );

      results.forEach(result => {
        loadedNfts = [...loadedNfts, ...result.nfts];
        // Extract audio NFTs
        const audioFromBatch = result.nfts.filter(nft => nft.mediaType === 'audio' || nft.mediaType === 'video');
        loadedAudioNfts = [...loadedAudioNfts, ...audioFromBatch];
      });
      setAllLoadedNfts(loadedNfts);
      setAudioNfts(loadedAudioNfts);
    }

    setBackgroundLoadingProgress(`Loading: ${totalCount} / ${totalCount}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    setBackgroundLoadingProgress('');
  };

  // Check payments on mount
  useEffect(() => {
    if (!address) return;

    async function checkPayments() {
      setCheckingPayments(true);
      try {
        const [userResult, paymentInfo] = await Promise.all([
          supabase
            .from('users')
            .select('id')
            .eq('wallet_address', address!)
            .single(),
          fetchPaymentsToTreasury(address!).catch(() => ({ paidSlots: 1 }))
        ]);

        if (userResult.data) {
          const { count } = await supabase
            .from('galleries')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userResult.data.id);
          setGalleryCount(count || 0);
        }

        setPaidSlots(paymentInfo.paidSlots);
      } finally {
        setCheckingPayments(false);
      }
    }

    checkPayments();
  }, [address]);

  // Pagination - show when no search/filter active
  const showPagination = !filters.searchQuery.trim() && !filters.selectedCollection && totalPages > 1;

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      router.push(page === 1 ? '/create' : `/create?page=${page}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [totalPages, router]);

  // Page numbers
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

  const handleSelectNft = (nft: NFT) => {
    form.toggleNftSelection(nft);
  };

  const handleRemoveNft = (nft: NFT) => {
    form.toggleNftSelection(nft);
  };

  const handleCreate = async () => {
    if (!address || form.form.selectedNfts.length === 0 || !form.name.trim()) return;

    setCreating(true);

    try {
      let txHash: string | null = null;

      if (effectivePrice > 0) {
        const client = await getSigningStargateClient();
        const amount = { denom: 'ustars', amount: String(effectivePrice * 1_000_000) };
        const memo = `${PUREART_MEMO_PREFIX}-${Date.now()}`;
        const result = await client.sendTokens(
          address,
          TREASURY_WALLET,
          [amount],
          { amount: [{ denom: 'ustars', amount: '0' }], gas: '200000' },
          memo
        );
        txHash = result.transactionHash;
      }

      let userId: string;
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', address)
        .single();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({ wallet_address: address })
          .select('id')
          .single();

        if (error || !newUser) throw new Error('Failed to create user');
        userId = newUser.id;
      }

      const nftIds = form.form.selectedNfts.map((nft) => {
        const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
        const desc = form.nftDescriptions[key];
        return {
          contract: nft.collection.contractAddress,
          token_id: nft.tokenId,
          ...(desc ? { description: desc } : {}),
        };
      });

      // Cache first 4 image URLs for instant gallery preview (skip audio NFTs)
      // Use full image URL (not thumbnail) for high-res display on homepage
      const cachedThumbnails: string[] = [];
      for (const nft of form.selectedNfts) {
        if (nft.mediaType === 'audio') continue;
        const url = nft.image || nft.thumbnail; // Prefer full image
        if (url) {
          cachedThumbnails.push(url);
          if (cachedThumbnails.length >= 4) break;
        }
      }

      const slug = generateSlug();
      const layout = `${form.size}-${form.arrangement}`;

      // Base insert data (columns that always exist)
      const baseData: Record<string, unknown> = {
        user_id: userId,
        slug,
        name: form.name.trim(),
        description: form.description.trim() || null,
        background_color: form.backgroundColor,
        layout,
        nft_ids: nftIds,
        payment_tx_hash: txHash,
        show_info: form.showInfo,
        cached_thumbnails: cachedThumbnails.length > 0 ? cachedThumbnails : null,
        ...(form.musicTrack ? { music_track: JSON.stringify(form.musicTrack) } : {}),
        ...(form.rowConfigs ? { custom_row_counts: rowConfigsToRowCounts(form.rowConfigs) } : {}),
      };

      // Optional columns that may not exist in the database
      const optionalColumns: Record<string, unknown> = {
        lock_layout: form.lockLayout,
        category: form.category,
      };

      // Try with all columns first
      let result = await supabase.from('galleries').insert({ ...baseData, ...optionalColumns });

      // If error mentions a missing column, retry without optional columns
      if (result.error?.message?.includes('column') || result.error?.message?.includes('schema cache')) {
        console.log('Retrying insert without optional columns...');
        result = await supabase.from('galleries').insert(baseData);
      }

      if (result.error) {
        console.error('Supabase error:', result.error);
        throw result.error;
      }

      router.push(`/g/${slug}`);
    } catch (error) {
      console.error('Error creating gallery:', error);
      alert('Failed to create gallery. Please try again.');
    } finally {
      setCreating(false);
    }
  };

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
        <p className="text-neutral-400 mb-4">Connect your wallet to create a gallery</p>
        <ConnectWalletButton />
      </div>
    );
  }

  const selectedCollectionName = filters.selectedCollection
    ? filters.collections.find((c) => c.addr === filters.selectedCollection)?.name
    : null;

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Step tabs - horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 mb-6 md:mb-8">
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg w-fit min-w-max">
          {(['customize', 'select', 'arrange', 'create'] as Step[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                // Only allow navigating to create if NFTs are selected
                if (s === 'create' && form.selectedNfts.length === 0) return;
                // Only allow select/arrange/create if coming from a valid state
                if ((s === 'arrange' || s === 'create') && form.selectedNfts.length === 0) return;
                setStep(s);
              }}
              disabled={(s === 'arrange' || s === 'create') && form.selectedNfts.length === 0}
              className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                step === s
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : (s === 'arrange' || s === 'create') && form.selectedNfts.length === 0
                  ? 'text-neutral-300 cursor-not-allowed'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {step === 'customize' && (
        <div className="flex flex-col lg:flex-row gap-8 lg:items-start">
          {/* Left column - Form */}
          <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Gallery Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => form.setName(e.target.value)}
                placeholder="My Collection"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => form.setDescription(e.target.value)}
                placeholder="A collection of my favorite pieces..."
                rows={3}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Size</label>
              <SizePicker value={form.size} onChange={form.setSize} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Arrangement</label>
              <ArrangementPicker value={form.arrangement} onChange={form.setArrangement} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Background Color</label>
              <ColorPicker value={form.backgroundColor} onChange={form.setBackgroundColor} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Gallery Info Visibility
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => form.setShowInfo(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.showInfo
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Always Show
                </button>
                <button
                  onClick={() => form.setShowInfo(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !form.showInfo
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Show on Hover
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Controls whether gallery title, owner, and stats are visible by default or only on hover
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Layout Lock</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => form.setLockLayout(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !form.lockLayout
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Unlock size={14} />
                  Unlocked
                </button>
                <button
                  onClick={() => form.setLockLayout(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.lockLayout
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Lock size={14} />
                  Locked
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                When locked, visitors cannot change the size or arrangement of your gallery
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Background Music</label>
              <MusicPicker value={form.musicTrack} onChange={form.setMusicTrack} audioNfts={audioNfts} loading={loadingCollection} />
              <p className="text-xs text-neutral-400 mt-2">
                Optional ambient music that plays when visitors view your gallery
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {GALLERY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => form.setCategory(form.category === cat.value ? null : cat.value)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      form.category === cat.value
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Help others discover your gallery by selecting a category
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Next: Select NFTs
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {/* Right column - Preview */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-500 mb-3">Preview</p>
            <div
              className="p-4 rounded-lg overflow-hidden"
              style={{ backgroundColor: form.backgroundColor }}
            >
              {(() => {
                // Use selected NFTs if any, otherwise show sample from user's collection
                const previewNfts = form.selectedNfts.length > 0 ? form.selectedNfts : (allLoadedNfts.length > 0 ? allLoadedNfts : pageNfts);
                const isSample = form.selectedNfts.length === 0;

                if (previewNfts.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-[200px] text-neutral-400 text-sm">
                      {loadingCollection ? 'Loading preview...' : 'No NFTs to preview'}
                    </div>
                  );
                }

                return (
                  <>
                    {form.arrangement === 'presentation' ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <img
                          src={previewNfts[0].image}
                          alt={previewNfts[0].name}
                          className="max-h-[500px] max-w-full object-contain rounded-lg"
                        />
                        <p className="mt-4 text-sm text-neutral-500">(Fullscreen slideshow mode)</p>
                      </div>
                    ) : form.arrangement === 'justified' ? (
                      // Custom justified preview - 3 rows with increasing items
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const firstRowCount = form.size === 'large' ? 2 : form.size === 'medium' ? 4 : 5;
                          const secondRowCount = form.size === 'large' ? 3 : form.size === 'medium' ? 5 : 6;
                          const thirdRowCount = form.size === 'large' ? 4 : form.size === 'medium' ? 6 : 7;
                          const rows = [
                            previewNfts.slice(0, firstRowCount),
                            previewNfts.slice(firstRowCount, firstRowCount + secondRowCount),
                            previewNfts.slice(firstRowCount + secondRowCount, firstRowCount + secondRowCount + thirdRowCount),
                          ];
                          return rows.map((rowNfts, rowIdx) => {
                            if (rowNfts.length === 0) return null;
                            return (
                              <div key={rowIdx} className="flex gap-1">
                                {rowNfts.map((nft, i) => (
                                  <div
                                    key={`${nft.collection.contractAddress}-${nft.tokenId}-${i}`}
                                    className="flex-1 aspect-square overflow-hidden rounded"
                                  >
                                    <img
                                      src={nft.thumbnail || nft.image}
                                      alt={nft.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <NFTGrid
                        nfts={previewNfts.slice(0, (() => {
                          // Vertical: 3 rows based on column count
                          if (form.arrangement === 'vertical') {
                            if (form.size === 'large') return 6;   // 2 cols × 3 rows
                            if (form.size === 'medium') return 9;  // 3 cols × 3 rows
                            return 15;                         // 5 cols × 3 rows
                          }
                          // Grid: ensure 3 full rows based on size
                          if (form.size === 'large') return 9;   // 3 cols × 3 rows
                          if (form.size === 'medium') return 15; // 5 cols × 3 rows
                          return 24;                         // 8 cols × 3 rows
                        })())}
                        size={size}
                        arrangement={arrangement}
                      />
                    )}
                    {isSample && (
                      <p className="text-center text-xs text-neutral-400 mt-3">Sample preview using your NFTs</p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {step === 'select' && (
        <>
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

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <p className="text-sm text-neutral-400">
                {loadingCollection ? 'Loading NFTs...' : total > 0 ? `${total} NFTs` : 'No NFTs found'}
                {form.selectedNfts.length > 0 && ` • ${form.selectedNfts.length} selected`}
              </p>
              {(loading || loadingCollection) && <Loader2 size={14} className="text-neutral-400 animate-spin" />}
            </div>
            <button
              onClick={() => setHideDuplicates(!hideDuplicates)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                hideDuplicates
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
              title={hideDuplicates ? 'Show all NFTs' : 'Hide duplicate open editions'}
            >
              <Layers size={14} />
              <span className="hidden sm:inline">{hideDuplicates ? 'Unique' : 'All'}</span>
            </button>
          </div>

          {/* Search and filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => filters.setSearchQuery(e.target.value)}
                placeholder="Search by name or token ID..."
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => filters.setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters || filters.selectedCollection
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              <Filter size={18} />
              Collections
              {filters.selectedCollection && (
                <span className="bg-white text-neutral-900 text-xs px-2 py-0.5 rounded-full">1</span>
              )}
            </button>
          </div>

          {/* Collection filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-neutral-700">Filter by Collection</span>
                {filters.selectedCollection && (
                  <button
                    onClick={() => filters.setSelectedCollection(null)}
                    className="text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.collections.map((collection) => (
                  <button
                    key={collection.addr}
                    onClick={() => filters.setSelectedCollection(
                      filters.selectedCollection === collection.addr ? null : collection.addr
                    )}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      filters.selectedCollection === collection.addr
                        ? 'bg-neutral-900 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {collection.name}
                    <span className="ml-1 opacity-60">({collection.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active filter badge */}
          {selectedCollectionName && !showFilters && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-neutral-500">Filtered by:</span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 rounded-full text-sm">
                {selectedCollectionName}
                <button
                  onClick={() => filters.setSelectedCollection(null)}
                  className="ml-1 text-neutral-400 hover:text-neutral-600"
                >
                  <X size={14} />
                </button>
              </span>
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-neutral-500 text-sm">
              {filters.displayNfts.length} NFTs
              {(filters.searchQuery || filters.selectedCollection) && ` found`}
            </p>
            <p className="text-neutral-500 text-sm">{selectedIds.size} selected</p>
          </div>

          {/* NFT Grid */}
          {(loading || loadingCollection) && pageNfts.length === 0 ? (
            <SkeletonGrid count={20} />
          ) : displayNfts.length > 0 ? (
            <NFTGrid
              nfts={filters.displayNfts}
              size="medium"
              arrangement="grid"
              selectable
              selectedIds={selectedIds}
              onSelect={handleSelectNft}
              useThumbnails
            />
          ) : (
            <div className="py-20 text-center text-neutral-400">
              {searchQuery || selectedCollection ? 'No NFTs match your filters' : 'No NFTs found'}
            </div>
          )}

          {/* Pagination */}
          {showPagination && (
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

      {step === 'arrange' && (
        <>
          <p className="text-neutral-500 text-sm mb-6">
            Drag to reorder{form.arrangement === 'justified' && ', adjust row sizes'}.
            {form.arrangement === 'presentation' && ' Add descriptions for presentation mode.'}
          </p>

          {/* Custom row editor for justified layout - replaces SortableNFTGrid */}
          {form.arrangement === 'justified' ? (
            <div className="space-y-6">
              <div className="p-4 bg-neutral-50 rounded-xl">
                <CustomRowEditor
                  nfts={selectedNfts}
                  rowConfigs={form.rowConfigs}
                  onChange={form.setRowConfigs}
                  onReorder={setSelectedNfts}
                  onRemove={handleRemoveNft}
                  size={size}
                />
              </div>

              {/* Preview */}
              {form.selectedNfts.length > 0 && (
                <div>
                  <p className="text-sm text-neutral-500 mb-3">Preview</p>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: form.backgroundColor }}>
                    <NFTGrid
                      nfts={selectedNfts}
                      size={size}
                      arrangement="justified"
                      customRowCounts={rowConfigsToRowCounts(form.rowConfigs)}
                      rowHeights={undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <SortableNFTGrid
              nfts={selectedNfts}
              onReorder={setSelectedNfts}
              onRemove={handleRemoveNft}
            />
          )}

          {form.arrangement === 'presentation' && form.selectedNfts.length > 0 && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-lg font-medium mb-4">NFT Descriptions</h3>
              <p className="text-sm text-neutral-500 mb-6">
                Add personal descriptions or stories for each NFT. These will appear during the presentation.
              </p>
              <div className="space-y-4">
                {form.selectedNfts.map((nft, index) => {
                  const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
                  return (
                    <div key={key} className="flex gap-4 items-start p-4 bg-neutral-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <span className="text-sm text-neutral-400 mr-2">{index + 1}.</span>
                        <img
                          src={nft.thumbnail || nft.image}
                          alt=""
                          className="w-16 h-16 object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">{nft.collection.name}</p>
                        <textarea
                          value={form.nftDescriptions[key] || ''}
                          onChange={(e) => form.updateNftDescription(key, e.target.value)}
                          placeholder="Add a description, story, or context for this NFT..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {step === 'create' && (
        <div className="max-w-4xl mx-auto">
          {/* Preview - first 2 rows */}
          <div className="p-6 rounded-xl mb-8" style={{ backgroundColor: form.backgroundColor }}>
            <p className="text-sm text-neutral-500 mb-4">Preview</p>
            <NFTGrid
              nfts={form.selectedNfts.slice(0, form.size === 'small' ? 12 : form.size === 'medium' ? 8 : 4)}
              size={size}
              arrangement={arrangement}
              customRowCounts={form.arrangement === 'justified' ? rowConfigsToRowCounts(form.rowConfigs) : undefined}
              rowHeights={undefined}
            />
            {form.selectedNfts.length > (form.size === 'small' ? 12 : form.size === 'medium' ? 8 : 4) && (
              <p className="text-center text-neutral-400 text-sm mt-4">
                + {form.selectedNfts.length - (form.size === 'small' ? 12 : form.size === 'medium' ? 8 : 4)} more NFTs
              </p>
            )}
          </div>

          {/* Gallery info summary */}
          <div className="bg-neutral-50 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Name</span>
                <p className="font-medium">{name || 'Untitled'}</p>
              </div>
              <div>
                <span className="text-neutral-500">NFTs</span>
                <p className="font-medium">{form.selectedNfts.length}</p>
              </div>
              <div>
                <span className="text-neutral-500">Layout</span>
                <p className="font-medium capitalize">{size} / {arrangement}</p>
              </div>
              <div>
                <span className="text-neutral-500">Background</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border border-neutral-200"
                    style={{ backgroundColor: form.backgroundColor }}
                  />
                  <span className="font-medium">{form.backgroundColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cost and create button */}
          <div className="max-w-md mx-auto">
            {effectivePrice === 0 && galleryCount === 0 && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg text-green-700">
                <Gift size={18} />
                <span className="text-sm">
                  Your first gallery is free to create!
                </span>
              </div>
            )}
            {hasCredit && galleryCount > 0 && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg text-green-700">
                <Gift size={18} />
                <span className="text-sm">
                  You have credit from a previous payment - this gallery is free!
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <span className="text-neutral-600">Cost</span>
              <div className="text-right">
                {checkingPayments ? (
                  <span className="text-neutral-400 text-sm">Checking payments...</span>
                ) : effectivePrice === 0 ? (
                  <span className="font-medium text-green-600">Free</span>
                ) : (
                  <span className="font-medium">{effectivePrice} STARS</span>
                )}
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating || checkingPayments || form.selectedNfts.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : checkingPayments ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Checking payments...
                </>
              ) : (
                <>
                  Create Gallery
                  {effectivePrice === 0 ? (
                    <span className="text-green-400">- Free!</span>
                  ) : (
                    <span className="text-neutral-400">({effectivePrice} STARS)</span>
                  )}
                </>
              )}
            </button>
            {!name.trim() && (
              <p className="text-center text-amber-600 text-sm mt-2">
                Please add a gallery name in the Customize tab
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
