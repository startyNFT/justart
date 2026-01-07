'use client';

import { useState, useMemo, useCallback } from 'react';
import { NFTGrid } from './NFTGrid';
import type { NFT } from '@/lib/stargaze';
import { Search, Filter, X, Loader2 } from 'lucide-react';

type NFTSelectorProps = {
  nfts: NFT[];
  selectedIds: Set<string>;
  onSelect: (nft: NFT) => void;
  useThumbnails?: boolean;
  onFilterActive?: (hasFilter: boolean) => void;
  loading?: boolean;
  loadingProgress?: string;
};

export function NFTSelector({ nfts, selectedIds, onSelect, useThumbnails, onFilterActive, loading, loadingProgress }: NFTSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Notify parent about filter state (deferred to avoid render issues)
  const notifyFilterChange = useCallback((hasFilter: boolean) => {
    // Use setTimeout to defer the callback to avoid React state batching issues
    setTimeout(() => onFilterActive?.(hasFilter), 0);
  }, [onFilterActive]);

  // Helper to update search and notify parent
  const updateSearch = (query: string) => {
    setSearchQuery(query);
    notifyFilterChange(query.trim() !== '' || selectedCollection !== null);
  };

  // Helper to update collection filter and notify parent
  const updateCollection = (collection: string | null) => {
    setSelectedCollection(collection);
    notifyFilterChange(searchQuery.trim() !== '' || collection !== null);
  };

  // Get unique collections
  const collections = useMemo(() => {
    const collectionMap = new Map<string, { address: string; name: string; count: number }>();
    nfts.forEach((nft) => {
      const addr = nft.collection.contractAddress;
      if (collectionMap.has(addr)) {
        collectionMap.get(addr)!.count++;
      } else {
        collectionMap.set(addr, {
          address: addr,
          name: nft.collection.name,
          count: 1,
        });
      }
    });
    return Array.from(collectionMap.values()).sort((a, b) => b.count - a.count);
  }, [nfts]);

  // Filter NFTs
  const filteredNfts = useMemo(() => {
    let result = nfts;

    // Filter by collection
    if (selectedCollection) {
      result = result.filter(
        (nft) => nft.collection.contractAddress === selectedCollection
      );
    }

    // Filter by search query (name, description, tokenId, collection name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (nft) =>
          nft.name.toLowerCase().includes(query) ||
          (nft.description && nft.description.toLowerCase().includes(query)) ||
          nft.tokenId.toLowerCase().includes(query) ||
          nft.collection.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [nfts, selectedCollection, searchQuery]);

  const selectedCollectionName = selectedCollection
    ? collections.find((c) => c.address === selectedCollection)?.name
    : null;

  return (
    <div>
      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search input */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search by name or token ID..."
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
          />
          {searchQuery && (
            <button
              onClick={() => updateSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
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
          {selectedCollection && (
            <span className="bg-white text-neutral-900 text-xs px-2 py-0.5 rounded-full">
              1
            </span>
          )}
        </button>
      </div>

      {/* Collection filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neutral-700">
              Filter by Collection
            </span>
            {selectedCollection && (
              <button
                onClick={() => updateCollection(null)}
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
                onClick={() =>
                  updateCollection(
                    selectedCollection === collection.address
                      ? null
                      : collection.address
                  )
                }
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

      {/* Active filter badge */}
      {selectedCollectionName && !showFilters && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-neutral-500">Filtered by:</span>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-100 rounded-full text-sm">
            {selectedCollectionName}
            <button
              onClick={() => updateCollection(null)}
              className="ml-1 text-neutral-400 hover:text-neutral-600"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-neutral-500 text-sm">
            {filteredNfts.length} NFTs
            {filteredNfts.length !== nfts.length && ` (${nfts.length} total)`}
          </p>
          {loading && (
            <div className="flex items-center gap-1.5 text-neutral-400 text-sm">
              <Loader2 size={12} className="animate-spin" />
              {loadingProgress && <span>{loadingProgress}</span>}
            </div>
          )}
        </div>
        <p className="text-neutral-500 text-sm">
          {selectedIds.size} selected
        </p>
      </div>

      {/* NFT Grid */}
      {filteredNfts.length > 0 ? (
        <NFTGrid
          nfts={filteredNfts}
          size="medium"
          arrangement="grid"
          selectable
          selectedIds={selectedIds}
          onSelect={onSelect}
          useThumbnails={useThumbnails}
        />
      ) : (
        <div className="py-20 text-center text-neutral-400">
          {searchQuery || selectedCollection
            ? 'No NFTs match your filters'
            : 'No NFTs found'}
        </div>
      )}
    </div>
  );
}
