'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { SortableNFTGrid } from '@/components/SortableNFTGrid';
import { SizePicker, ArrangementPicker } from '@/components/LayoutPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { MusicPicker } from '@/components/MusicPicker';
import { CustomRowEditor } from '@/components/CustomRowEditor';
import { fetchNFTPage, fetchNFTById, PAGE_SIZE, type NFT } from '@/lib/stargaze';
import { supabase, type Gallery } from '@/lib/supabase';
import type { SizeType, ArrangementType, MusicTrack } from '@/lib/constants';
import { Loader2, ArrowLeft, Save, Trash2, Lock, Unlock, Search, Filter, X, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

type Step = 'select' | 'arrange' | 'customize';

export default function EditGallery() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { address, isWalletConnected } = useChain('stargaze');

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [step, setStep] = useState<Step>('customize');
  const [pageNfts, setPageNfts] = useState<NFT[]>([]);
  const [allLoadedNfts, setAllLoadedNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hideDuplicates, setHideDuplicates] = useState(true);

  const [selectedNfts, setSelectedNfts] = useState<NFT[]>([]);
  const [size, setSize] = useState<SizeType>('medium');
  const [arrangement, setArrangement] = useState<ArrangementType>('grid');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showInfo, setShowInfo] = useState(true);
  const [lockLayout, setLockLayout] = useState(false);
  const [musicTrack, setMusicTrack] = useState<MusicTrack | null>(null);
  const [nftDescriptions, setNftDescriptions] = useState<Record<string, string>>({});
  const [audioNfts, setAudioNfts] = useState<NFT[]>([]);
  const [customRowCounts, setCustomRowCounts] = useState<number[] | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [backgroundLoadingProgress, setBackgroundLoadingProgress] = useState('');
  const [initialProgress, setInitialProgress] = useState(0);

  const backgroundLoadingRef = useRef(false);
  const initialLoadDone = useRef(false);
  const nftCollectionLoaded = useRef(false);
  const initialProgressRef = useRef<NodeJS.Timeout | null>(null);

  // Page from URL
  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selectedIds = new Set(
    selectedNfts.map((nft) => `${nft.collection.contractAddress}-${nft.tokenId}`)
  );

  // Animate progress: 0-75% over 5 seconds, then smooth random increments up to 99%
  useEffect(() => {
    if (!loading) return;

    const startTime = Date.now();
    const duration = 5000;
    let currentProgress = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < duration) {
        // Phase 1: 0-75% over 5 seconds (smooth)
        currentProgress = (elapsed / duration) * 75;
      } else if (currentProgress < 99) {
        // Phase 2: smooth random increments toward 99%
        const remaining = 99 - currentProgress;
        const increment = Math.random() * Math.min(0.5, remaining * 0.1) + 0.05;
        currentProgress = Math.min(currentProgress + increment, 99);
      }

      setInitialProgress(currentProgress);

      if (currentProgress < 99 && loading) {
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

  // Background load all NFTs for search
  const backgroundLoadAllNfts = useCallback(async (walletAddress: string, totalCount: number, firstPageNfts: NFT[]) => {
    if (backgroundLoadingRef.current) return;
    backgroundLoadingRef.current = true;

    setAllLoadedNfts(firstPageNfts);
    // Extract audio NFTs from first page
    const firstPageAudio = firstPageNfts.filter(nft => nft.mediaType === 'audio' || nft.mediaType === 'video');
    setAudioNfts(firstPageAudio);

    const pagesToLoad = Math.ceil(totalCount / PAGE_SIZE);
    const CONCURRENT_REQUESTS = 6;
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
  }, []);

  // Load NFT collection (called after initial load, runs in background)
  const loadNftCollection = useCallback(async (walletAddress: string) => {
    if (nftCollectionLoaded.current) return;
    nftCollectionLoaded.current = true;
    setLoadingCollection(true);

    const nftResult = await fetchNFTPage(walletAddress, 0);
    setPageNfts(nftResult.nfts);
    if (nftResult.total > 0) {
      setTotal(nftResult.total);
    }
    setLoadingCollection(false);

    // Start background loading for remaining pages
    if (nftResult.total > PAGE_SIZE) {
      backgroundLoadAllNfts(walletAddress, nftResult.total, nftResult.nfts);
    } else {
      setAllLoadedNfts(nftResult.nfts);
      // Extract audio NFTs when only one page
      const audioFromPage = nftResult.nfts.filter(nft => nft.mediaType === 'audio' || nft.mediaType === 'video');
      setAudioNfts(audioFromPage);
    }
  }, [backgroundLoadAllNfts]);

  // Initial load - gallery data and selected NFTs only (fast)
  useEffect(() => {
    async function load() {
      if (!address || initialLoadDone.current) return;

      // Fetch gallery data
      const { data: galleryData, error } = await supabase
        .from('galleries')
        .select('*, users!inner(wallet_address)')
        .eq('slug', slug)
        .single();

      if (error || !galleryData) {
        setLoading(false);
        return;
      }

      // Check ownership
      if (galleryData.users?.wallet_address !== address) {
        router.push(`/g/${slug}`);
        return;
      }

      setGallery(galleryData);
      setName(galleryData.name);
      setDescription(galleryData.description || '');
      setBackgroundColor(galleryData.background_color);
      setShowInfo(galleryData.show_info ?? true);
      setLockLayout(galleryData.lock_layout ?? false);
      // Parse music track (can be JSON string or null)
      if (galleryData.music_track) {
        try {
          const parsed = JSON.parse(galleryData.music_track);
          setMusicTrack(parsed);
        } catch {
          // Old format - ignore
          setMusicTrack(null);
        }
      }

      // Extract per-NFT descriptions
      const descriptions: Record<string, string> = {};
      (galleryData.nft_ids as Array<{ contract: string; token_id: string; description?: string }>).forEach((item) => {
        if (item.description) {
          descriptions[`${item.contract}-${item.token_id}`] = item.description;
        }
      });
      setNftDescriptions(descriptions);

      // Parse layout
      const storedLayout = galleryData.layout || 'medium-grid';
      if (storedLayout.includes('-')) {
        const [s, a] = storedLayout.split('-');
        setSize(s as SizeType);
        setArrangement(a as ArrangementType);
      }

      // Load custom row counts if available
      if (galleryData.custom_row_counts) {
        setCustomRowCounts(galleryData.custom_row_counts);
      }

      // Fetch selected NFTs from gallery
      const galleryNftIds = galleryData.nft_ids as Array<{ contract: string; token_id: string }>;
      const selectedNftPromises = galleryNftIds.map((item) =>
        fetchNFTById(item.contract, item.token_id)
      );
      const selectedResults = await Promise.all(selectedNftPromises);
      const selected = selectedResults.filter((nft): nft is NFT => nft !== null);

      setSelectedNfts(selected);
      setLoading(false);
      initialLoadDone.current = true;

      // Start loading NFT collection in background (for select tab)
      loadNftCollection(address);
    }

    load();
  }, [address, slug, router, loadNftCollection]);

  // Load page when navigating
  useEffect(() => {
    if (!address || !initialLoadDone.current || currentPage === 1) return;

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

      // No cache hit - show loading
      setInitialProgress(0);
      setLoadingPage(true);

      const result = await fetchNFTPage(address!, offset, PAGE_SIZE);

      if (cancelled) return;

      setPageNfts(result.nfts);
      if (result.total > 0) {
        setTotal(result.total);
      }

      setInitialProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));
      setLoadingPage(false);
    }

    loadPage();

    return () => { cancelled = true; };
  }, [address, currentPage]);

  // Get unique collections
  const collections = useMemo(() => {
    const source = allLoadedNfts.length > 0 ? allLoadedNfts : pageNfts;
    const collectionMap = new Map<string, { address: string; name: string; count: number }>();
    source.forEach((nft) => {
      const addr = nft.collection.contractAddress;
      if (collectionMap.has(addr)) {
        collectionMap.get(addr)!.count++;
      } else {
        collectionMap.set(addr, { address: addr, name: nft.collection.name, count: 1 });
      }
    });
    return Array.from(collectionMap.values()).sort((a, b) => b.count - a.count);
  }, [allLoadedNfts, pageNfts]);

  // Deduplicate
  const deduplicateNfts = useCallback((nfts: NFT[]) => {
    if (!hideDuplicates) return nfts;
    const seen = new Map<string, NFT>();
    for (const nft of nfts) {
      const key = `${nft.collection.contractAddress}-${nft.image}`;
      if (!seen.has(key)) seen.set(key, nft);
    }
    return Array.from(seen.values());
  }, [hideDuplicates]);

  // Filter and deduplicate display NFTs
  const displayNfts = useMemo(() => {
    const source = (searchQuery.trim() || selectedCollection) && allLoadedNfts.length > 0
      ? allLoadedNfts
      : pageNfts;

    let result = source;

    if (selectedCollection) {
      result = result.filter((nft) => nft.collection.contractAddress === selectedCollection);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (nft) =>
          nft.name.toLowerCase().includes(query) ||
          nft.tokenId.toLowerCase().includes(query) ||
          nft.collection.name.toLowerCase().includes(query)
      );
    }

    return deduplicateNfts(result);
  }, [pageNfts, allLoadedNfts, searchQuery, selectedCollection, deduplicateNfts]);

  // Pagination
  const showPagination = !searchQuery.trim() && !selectedCollection && totalPages > 1;

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      router.push(page === 1 ? `/edit/${slug}` : `/edit/${slug}?page=${page}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [totalPages, router, slug]);

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
    const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
    if (selectedIds.has(key)) {
      setSelectedNfts(selectedNfts.filter(
        (n) => `${n.collection.contractAddress}-${n.tokenId}` !== key
      ));
    } else {
      setSelectedNfts([...selectedNfts, nft]);
    }
  };

  const handleRemoveNft = (nft: NFT) => {
    const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
    setSelectedNfts(selectedNfts.filter(
      (n) => `${n.collection.contractAddress}-${n.tokenId}` !== key
    ));
  };

  const handleSave = async () => {
    if (!gallery || !name.trim() || selectedNfts.length === 0) return;

    setSaving(true);

    try {
      // Build nft_ids with descriptions
      const nftIds = selectedNfts.map((nft) => {
        const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
        const desc = nftDescriptions[key];
        return {
          contract: nft.collection.contractAddress,
          token_id: nft.tokenId,
          ...(desc ? { description: desc } : {}),
        };
      });

      const layout = `${size}-${arrangement}`;

      // Try with lock_layout first, fallback without if column doesn't exist
      let error;
      const updateData: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        background_color: backgroundColor,
        layout,
        nft_ids: nftIds,
        show_info: showInfo,
        music_track: musicTrack ? JSON.stringify(musicTrack) : null,
        custom_row_counts: customRowCounts,
      };

      // Try with lock_layout
      const result = await supabase
        .from('galleries')
        .update({ ...updateData, lock_layout: lockLayout })
        .eq('id', gallery.id);

      if (result.error?.message?.includes('lock_layout')) {
        // Column doesn't exist, try without it
        const fallbackResult = await supabase
          .from('galleries')
          .update(updateData)
          .eq('id', gallery.id);
        error = fallbackResult.error;
      } else {
        error = result.error;
      }

      if (error) throw error;

      router.push(`/g/${slug}`);
    } catch (error) {
      console.error('Error saving gallery:', error);
      alert('Failed to save gallery. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!gallery) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this gallery? This action cannot be undone.'
    );
    if (!confirmed) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('galleries')
        .delete()
        .eq('id', gallery.id);

      if (error) throw error;

      router.push('/my-galleries');
    } catch (error) {
      console.error('Error deleting gallery:', error);
      alert('Failed to delete gallery. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isWalletConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-400">Please connect your wallet to edit galleries</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 size={32} className="mx-auto text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-400">Gallery not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8 gap-2">
        <button
          onClick={() => router.push(`/g/${slug}`)}
          className="flex items-center gap-1 md:gap-2 text-neutral-500 hover:text-neutral-700 text-sm md:text-base"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back to Gallery</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            <span className="hidden sm:inline">Delete</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || selectedNfts.length === 0}
            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 text-sm md:text-base"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span className="hidden sm:inline">Save Changes</span>
            <span className="sm:hidden">Save</span>
          </button>
        </div>
      </div>

      {/* Step tabs - horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 mb-6 md:mb-8">
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg w-fit min-w-max">
          {(['customize', 'select', 'arrange'] as Step[]).map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                step === s
                ? 'bg-white text-neutral-900 shadow-sm'
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
          <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6" id="customize-form">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Gallery Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Collection"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A collection of my favorite pieces..."
                rows={3}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Size
              </label>
              <SizePicker value={size} onChange={setSize} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Arrangement
              </label>
              <ArrangementPicker value={arrangement} onChange={setArrangement} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Background Color
              </label>
              <ColorPicker value={backgroundColor} onChange={setBackgroundColor} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Gallery Info Visibility
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowInfo(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showInfo
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Always Show
                </button>
                <button
                  onClick={() => setShowInfo(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !showInfo
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
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Layout Lock
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLockLayout(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !lockLayout
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Unlock size={14} />
                  Unlocked
                </button>
                <button
                  onClick={() => setLockLayout(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    lockLayout
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
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Background Music
              </label>
              <MusicPicker value={musicTrack} onChange={setMusicTrack} audioNfts={audioNfts} loading={loadingCollection} />
              <p className="text-xs text-neutral-400 mt-2">
                Optional ambient music that plays when visitors view your gallery
              </p>
            </div>
          </div>

          {/* Right column - Preview */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-500 mb-3">Preview</p>
            <div
              className="p-4 rounded-lg overflow-hidden"
              style={{ backgroundColor }}
            >
              {(() => {
                // Use selected NFTs if any, otherwise show sample from user's collection
                const previewNfts = selectedNfts.length > 0 ? selectedNfts : (allLoadedNfts.length > 0 ? allLoadedNfts : pageNfts);
                const isSample = selectedNfts.length === 0;

                if (previewNfts.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-[200px] text-neutral-400 text-sm">
                      {loadingCollection ? 'Loading preview...' : 'No NFTs to preview'}
                    </div>
                  );
                }

                return (
                  <>
                    {arrangement === 'presentation' ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <img
                          src={previewNfts[0].image}
                          alt={previewNfts[0].name}
                          className="max-h-[500px] max-w-full object-contain rounded-lg"
                        />
                        <p className="mt-4 text-sm text-neutral-500">(Fullscreen slideshow mode)</p>
                      </div>
                    ) : arrangement === 'justified' ? (
                      // Custom justified preview - 3 rows with increasing items
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const firstRowCount = size === 'large' ? 2 : size === 'medium' ? 4 : 5;
                          const secondRowCount = size === 'large' ? 3 : size === 'medium' ? 5 : 6;
                          const thirdRowCount = size === 'large' ? 4 : size === 'medium' ? 6 : 7;
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
                          if (arrangement === 'vertical') {
                            if (size === 'large') return 6;   // 2 cols × 3 rows
                            if (size === 'medium') return 9;  // 3 cols × 3 rows
                            return 15;                         // 5 cols × 3 rows
                          }
                          // Grid: ensure 3 full rows based on size
                          if (size === 'large') return 9;   // 3 cols × 3 rows
                          if (size === 'medium') return 15; // 5 cols × 3 rows
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
          {loadingPage && (
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
                {selectedNfts.length > 0 && ` • ${selectedNfts.length} selected`}
              </p>
              {(loadingPage || loadingCollection) && <Loader2 size={14} className="text-neutral-400 animate-spin" />}
            </div>
            <button
              onClick={() => setHideDuplicates(!hideDuplicates)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                hideDuplicates
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or token ID..."
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters || selectedCollection
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              <Filter size={18} />
              Collections
            </button>
          </div>

          {/* Collection filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-neutral-700">Filter by Collection</span>
                {selectedCollection && (
                  <button
                    onClick={() => setSelectedCollection(null)}
                    className="text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {collections.map((collection) => (
                  <button
                    key={collection.address}
                    onClick={() => setSelectedCollection(
                      selectedCollection === collection.address ? null : collection.address
                    )}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedCollection === collection.address
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

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-neutral-500 text-sm">
              {displayNfts.length} NFTs
              {(searchQuery || selectedCollection) && ` found`}
            </p>
            <p className="text-neutral-500 text-sm">{selectedIds.size} selected</p>
          </div>

          {/* NFT Grid */}
          {(loadingPage || loadingCollection) && pageNfts.length === 0 ? (
            <div className="py-20 text-center">
              <Loader2 size={32} className="mx-auto text-neutral-400 animate-spin mb-4" />
              <p className="text-neutral-400">Loading NFTs...</p>
            </div>
          ) : displayNfts.length > 0 ? (
            <NFTGrid
              nfts={displayNfts}
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
            Drag to reorder{arrangement === 'justified' && ', adjust row sizes'}.
            {arrangement === 'presentation' && ' Add descriptions for presentation mode.'}
          </p>

          {/* Custom row editor for justified layout - replaces SortableNFTGrid */}
          {arrangement === 'justified' ? (
            <div className="space-y-6">
              <div className="p-4 bg-neutral-50 rounded-xl">
                <CustomRowEditor
                  nfts={selectedNfts}
                  rowCounts={customRowCounts}
                  onChange={setCustomRowCounts}
                  onReorder={setSelectedNfts}
                  onRemove={handleRemoveNft}
                  size={size}
                />
              </div>

              {/* Preview */}
              {selectedNfts.length > 0 && (
                <div>
                  <p className="text-sm text-neutral-500 mb-3">Preview</p>
                  <div className="p-4 rounded-xl" style={{ backgroundColor }}>
                    <NFTGrid
                      nfts={selectedNfts}
                      size={size}
                      arrangement="justified"
                      customRowCounts={customRowCounts}
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

          {/* Per-NFT descriptions for presentation mode */}
          {arrangement === 'presentation' && selectedNfts.length > 0 && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-lg font-medium mb-4">NFT Descriptions</h3>
              <p className="text-sm text-neutral-500 mb-6">
                Add personal descriptions or stories for each NFT. These will appear during the presentation.
              </p>
              <div className="space-y-4">
                {selectedNfts.map((nft, index) => {
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
                          value={nftDescriptions[key] || ''}
                          onChange={(e) => setNftDescriptions(prev => ({
                            ...prev,
                            [key]: e.target.value
                          }))}
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
    </div>
  );
}
