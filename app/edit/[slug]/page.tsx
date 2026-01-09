'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { SortableNFTGrid } from '@/components/SortableNFTGrid';
import { SizePicker, ArrangementPicker } from '@/components/LayoutPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { MusicPicker } from '@/components/MusicPicker';
import { CustomRowEditor, type RowConfig, rowConfigsToRowCounts } from '@/components/CustomRowEditor';
import { fetchNFTPage, fetchNFTById, PAGE_SIZE, type NFT } from '@/lib/stargaze';
import { supabase, GALLERY_CATEGORIES, type Gallery, type GalleryCategory } from '@/lib/supabase';
import { CONCURRENT_REQUESTS } from '@/lib/constants';
import type { SizeType, ArrangementType, MusicTrack } from '@/lib/constants';
import { Loader2, ArrowLeft, Save, Trash2, Lock, Unlock, Search, Filter, X, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useLoadingProgress } from '@/hooks/useLoadingProgress';
import { useNFTFilters } from '@/hooks/useNFTFilters';
import { useGalleryForm } from '@/hooks/useGalleryForm';

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
  const [audioNfts, setAudioNfts] = useState<NFT[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [backgroundLoadingProgress, setBackgroundLoadingProgress] = useState('');

  // Use shared gallery form hook
  const form = useGalleryForm({
    initialState: {
      backgroundColor: '#FFFFFF',
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

  const backgroundLoadingRef = useRef(false);
  const initialLoadDone = useRef(false);
  const nftCollectionLoaded = useRef(false);

  // Page from URL
  const currentPage = Number(searchParams.get('page')) || 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const selectedIds = new Set(
    form.form.selectedNfts.map((nft) => `${nft.collection.contractAddress}-${nft.tokenId}`)
  );

  // Background load all NFTs for search
  const backgroundLoadAllNfts = useCallback(async (walletAddress: string, totalCount: number, firstPageNfts: NFT[]) => {
    if (backgroundLoadingRef.current) return;
    backgroundLoadingRef.current = true;

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
      form.setName(galleryData.name);
      form.setDescription(galleryData.description || '');
      form.setBackgroundColor(galleryData.background_color);
      form.setShowInfo(galleryData.show_info ?? true);
      form.setLockLayout(galleryData.lock_layout ?? false);
      form.setCategory(galleryData.category as GalleryCategory | null);
      // Parse music track (can be JSON string or null)
      if (galleryData.music_track) {
        try {
          const parsed = JSON.parse(galleryData.music_track);
          form.setMusicTrack(parsed);
        } catch {
          // Old format - ignore
          form.setMusicTrack(null);
        }
      }

      // Extract per-NFT descriptions
      const descriptions: Record<string, string> = {};
      (galleryData.nft_ids as Array<{ contract: string; token_id: string; description?: string }>).forEach((item) => {
        if (item.description) {
          descriptions[`${item.contract}-${item.token_id}`] = item.description;
        }
      });
      form.setNftDescriptions(descriptions);

      // Parse layout
      const storedLayout = galleryData.layout || 'medium-grid';
      if (storedLayout.includes('-')) {
        const [s, a] = storedLayout.split('-');
        form.setSize(s as SizeType);
        form.setArrangement(a as ArrangementType);
      }

      // Load custom row counts if available - convert to RowConfig
      if (galleryData.custom_row_counts) {
        const counts = galleryData.custom_row_counts as number[];
        const heights = (galleryData.row_heights as number[]) || [];
        const defaultHeight = s === 'large' ? 200 : s === 'medium' ? 120 : 80;
        const configs: RowConfig[] = counts.map((count, i) => ({
          count,
          height: heights[i] ?? defaultHeight,
        }));
        form.setRowConfigs(configs);
      }

      // Fetch selected NFTs from gallery
      const galleryNftIds = galleryData.nft_ids as Array<{ contract: string; token_id: string }>;
      const selectedNftPromises = galleryNftIds.map((item) =>
        fetchNFTById(item.contract, item.token_id)
      );
      const selectedResults = await Promise.all(selectedNftPromises);
      const selected = selectedResults.filter((nft): nft is NFT => nft !== null);

      form.setSelectedNfts(selected);
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
      form.setSelectedNfts(selectedNfts.filter(
        (n) => `${n.collection.contractAddress}-${n.tokenId}` !== key
      ));
    } else {
      form.setSelectedNfts([...selectedNfts, nft]);
    }
  };

  const handleRemoveNft = (nft: NFT) => {
    const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
    form.setSelectedNfts(selectedNfts.filter(
      (n) => `${n.collection.contractAddress}-${n.tokenId}` !== key
    ));
  };

  const handleSave = async () => {
    if (!gallery || !form.name.trim() || form.selectedNfts.length === 0) return;

    setSaving(true);

    try {
      // Build nft_ids with descriptions
      const nftIds = form.selectedNfts.map((nft) => {
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

      const layout = `${form.size}-${form.arrangement}`;

      // Base update data (columns that always exist)
      const baseData: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        background_color: form.backgroundColor,
        layout,
        nft_ids: nftIds,
        show_info: form.showInfo,
        music_track: form.musicTrack ? JSON.stringify(form.musicTrack) : null,
        custom_row_counts: rowConfigsToRowCounts(form.rowConfigs),
        cached_thumbnails: cachedThumbnails.length > 0 ? cachedThumbnails : null,
      };

      // Optional columns that may not exist in the database
      const optionalColumns = {
        lock_layout: form.lockLayout,
        category: form.category,
      };

      // Try with all columns first
      let result = await supabase
        .from('galleries')
        .update({ ...baseData, ...optionalColumns })
        .eq('id', gallery.id);

      // If error mentions a missing column, retry without optional columns
      if (result.error?.message?.includes('column') || result.error?.message?.includes('schema cache')) {
        console.log('Retrying save without optional columns...');
        result = await supabase
          .from('galleries')
          .update(baseData)
          .eq('id', gallery.id);
      }

      if (result.error) {
        console.error('Supabase error:', result.error);
        throw new Error(result.error.message || JSON.stringify(result.error));
      }

      router.push(`/g/${slug}`);
    } catch (error: unknown) {
      console.error('Error saving gallery:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      } else {
        errorMessage = String(error);
      }
      alert(`Failed to save gallery: ${errorMessage}`);
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
            disabled={saving || !name.trim() || form.selectedNfts.length === 0}
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
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Size
              </label>
              <SizePicker value={form.size} onChange={form.setSize} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Arrangement
              </label>
              <ArrangementPicker value={form.arrangement} onChange={form.setArrangement} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Background Color
              </label>
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
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Layout Lock
              </label>
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
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Background Music
              </label>
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
                const previewNfts = form.selectedNfts.length > 0 ? selectedNfts : (allLoadedNfts.length > 0 ? allLoadedNfts : pageNfts);
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
                {form.selectedNfts.length > 0 && ` • ${form.selectedNfts.length} selected`}
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
            </button>
          </div>

          {/* Collection filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-neutral-700">Filter by Collection</span>
                {filters.selectedCollection && (
                  <button
                    onClick={() => filters.filters.setSelectedCollection(null)}
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
                      selectedCollection === collection.addr ? null : collection.addr
                    )}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedCollection === collection.addr
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
              {filters.displayNfts.length} NFTs
              {(filters.searchQuery || filters.selectedCollection) && ` found`}
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
                  onReorder={form.setSelectedNfts}
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
              onReorder={form.setSelectedNfts}
              onRemove={handleRemoveNft}
            />
          )}

          {/* Per-NFT descriptions for presentation mode */}
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
    </div>
  );
}
