'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { SizePicker, ArrangementPicker } from '@/components/LayoutPicker';
import { fetchNFTPage, PAGE_SIZE, type NFT } from '@/lib/stargaze';
import type { SizeType, ArrangementType } from '@/lib/constants';
import { Wallet, Loader2, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

const ITEMS_PER_PAGE = PAGE_SIZE; // Use larger batch for faster loading

export default function MyNFTs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isWalletConnected, openView } = useChain('stargaze');
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState<SizeType>('medium');
  const [arrangement, setArrangement] = useState<ArrangementType>('grid');
  const [hideDuplicates, setHideDuplicates] = useState(true); // Default to hiding duplicates

  // Get page from URL, default to 1
  const currentPage = Number(searchParams.get('page')) || 1;

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load page
  useEffect(() => {
    if (!address) return;

    async function loadPage(retryCount = 0) {
      setLoading(true);
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      const result = await fetchNFTPage(address!, offset, ITEMS_PER_PAGE);

      // Retry if no results on first page
      if (result.nfts.length === 0 && currentPage === 1 && retryCount < 3) {
        console.warn(`Got 0 NFTs, retrying (attempt ${retryCount + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return loadPage(retryCount + 1);
      }

      setNfts(result.nfts);
      setTotal(result.total);
      setLoading(false);
    }

    loadPage();
  }, [address, currentPage]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setNfts([]); // Clear immediately so user knows page is changing
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
        <button
          onClick={() => openView()}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
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
        <div className="flex gap-2">
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
          <SizePicker value={size} onChange={setSize} />
          <ArrangementPicker value={arrangement} onChange={setArrangement} exclude={['presentation']} />
        </div>
      </div>

      {loading && nfts.length === 0 ? (
        <div className="py-20 text-center">
          <Loader2 size={32} className="mx-auto text-neutral-400 animate-spin mb-4" />
          <p className="text-neutral-400">Loading your NFTs...</p>
        </div>
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
