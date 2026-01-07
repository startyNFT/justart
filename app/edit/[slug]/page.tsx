'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { NFTSelector } from '@/components/NFTSelector';
import { SortableNFTGrid } from '@/components/SortableNFTGrid';
import { SizePicker, ArrangementPicker } from '@/components/LayoutPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { fetchNFTPage, fetchNFTById, prefetchNFTPages, PAGE_SIZE, type NFT } from '@/lib/stargaze';
import { supabase, type Gallery } from '@/lib/supabase';
import type { SizeType, ArrangementType } from '@/lib/constants';
import { Loader2, ArrowLeft, Save, Trash2 } from 'lucide-react';

type Step = 'select' | 'arrange' | 'customize';

export default function EditGallery() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { address, isWalletConnected } = useChain('stargaze');

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [step, setStep] = useState<Step>('customize');
  const [allNfts, setAllNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedNfts, setSelectedNfts] = useState<NFT[]>([]);
  const [size, setSize] = useState<SizeType>('medium');
  const [arrangement, setArrangement] = useState<ArrangementType>('grid');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showInfo, setShowInfo] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const currentOffset = useRef(0);

  const selectedIds = new Set(
    selectedNfts.map((nft) => `${nft.collection.contractAddress}-${nft.tokenId}`)
  );

  useEffect(() => {
    async function load() {
      if (!address) return;

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

      // Parse layout
      const storedLayout = galleryData.layout || 'medium-grid';
      if (storedLayout.includes('-')) {
        const [s, a] = storedLayout.split('-');
        setSize(s as SizeType);
        setArrangement(a as ArrangementType);
      }

      // Fetch first page of user's NFTs
      const nftResult = await fetchNFTPage(address, 0);
      setAllNfts(nftResult.nfts);
      setTotal(nftResult.total);
      setHasMore(nftResult.hasMore);
      currentOffset.current = PAGE_SIZE;

      if (nftResult.hasMore) {
        prefetchNFTPages(address, 0, nftResult.total);
      }

      // Fetch selected NFTs from gallery (these might not be in the first page)
      const galleryNftIds = galleryData.nft_ids as Array<{ contract: string; token_id: string }>;
      const selectedNftPromises = galleryNftIds.map((item) =>
        fetchNFTById(item.contract, item.token_id)
      );
      const selectedResults = await Promise.all(selectedNftPromises);
      const selected = selectedResults.filter((nft): nft is NFT => nft !== null);

      setSelectedNfts(selected);
      setLoading(false);
    }

    load();
  }, [address, slug, router]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (!address || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const result = await fetchNFTPage(address, currentOffset.current);

    setAllNfts(prev => [...prev, ...result.nfts]);
    setHasMore(result.hasMore);
    currentOffset.current += PAGE_SIZE;

    if (result.hasMore) {
      prefetchNFTPages(address, currentOffset.current, result.total);
    }

    setLoadingMore(false);
  }, [address, loadingMore, hasMore]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || step !== 'select') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore, step]);

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
      const nftIds = selectedNfts.map((nft) => ({
        contract: nft.collection.contractAddress,
        token_id: nft.tokenId,
      }));

      const layout = `${size}-${arrangement}`;

      const { error } = await supabase
        .from('galleries')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          background_color: backgroundColor,
          layout,
          nft_ids: nftIds,
          show_info: showInfo,
        })
        .eq('id', gallery.id);

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push(`/g/${slug}`)}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700"
        >
          <ArrowLeft size={18} />
          Back to Gallery
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            Delete
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || selectedNfts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg w-fit mb-8">
        {(['customize', 'select', 'arrange'] as Step[]).map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              step === s
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {step === 'customize' && (
        <div className="max-w-2xl">
          <div className="space-y-6">
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

            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor }}
            >
              <p className="text-sm text-neutral-500 mb-3">Preview</p>
              <NFTGrid nfts={selectedNfts.slice(0, 6)} size={size} arrangement={arrangement} />
            </div>
          </div>
        </div>
      )}

      {step === 'select' && (
        <>
          <div className="mb-4">
            <p className="text-sm text-neutral-400">
              {allNfts.length > 0
                ? `${allNfts.length}${total > allNfts.length ? ` / ${total}` : ''} NFTs`
                : 'No NFTs found'}
              {selectedNfts.length > 0 && ` • ${selectedNfts.length} selected`}
            </p>
          </div>
          <NFTSelector
            nfts={allNfts}
            selectedIds={selectedIds}
            onSelect={handleSelectNft}
            useThumbnails
          />
          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
            {loadingMore && (
              <Loader2 size={24} className="text-neutral-400 animate-spin" />
            )}
          </div>
        </>
      )}

      {step === 'arrange' && (
        <>
          <p className="text-neutral-500 text-sm mb-6">
            Drag to reorder
          </p>
          <SortableNFTGrid
            nfts={selectedNfts}
            onReorder={setSelectedNfts}
            onRemove={handleRemoveNft}
          />
        </>
      )}
    </div>
  );
}
