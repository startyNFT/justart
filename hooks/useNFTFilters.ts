import { useMemo, useState } from 'react'
import type { NFT } from '@/lib/stargaze'

interface Collection {
  addr: string
  name: string
  count: number
}

interface UseNFTFiltersOptions {
  nfts: NFT[]
  hideDuplicates?: boolean
}

interface UseNFTFiltersResult {
  displayNfts: NFT[]
  duplicateCounts: Map<string, number>
  collections: Collection[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCollection: string | null
  setSelectedCollection: (collection: string | null) => void
  filteredCount: number
  totalCount: number
}

/**
 * Hook to filter and search NFTs
 * Handles search by name/collection, collection filtering, and deduplication
 */
export function useNFTFilters({
  nfts,
  hideDuplicates = true,
}: UseNFTFiltersOptions): UseNFTFiltersResult {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)

  // Get unique collections for filter dropdown
  const collections = useMemo(() => {
    const collectionMap = new Map<string, { name: string; count: number }>()
    for (const nft of nfts) {
      const addr = nft.collection.contractAddress
      const existing = collectionMap.get(addr)
      if (existing) {
        existing.count++
      } else {
        collectionMap.set(addr, { name: nft.collection.name, count: 1 })
      }
    }
    return Array.from(collectionMap.entries())
      .map(([addr, { name, count }]) => ({ addr, name, count }))
      .sort((a, b) => b.count - a.count)
  }, [nfts])

  // Deduplicate and filter NFTs
  const { displayNfts, duplicateCounts } = useMemo(() => {
    // First filter by search and collection
    let filtered = nfts

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (nft) =>
          nft.name.toLowerCase().includes(query) ||
          nft.collection.name.toLowerCase().includes(query)
      )
    }

    if (selectedCollection) {
      filtered = filtered.filter(
        (nft) => nft.collection.contractAddress === selectedCollection
      )
    }

    // Then deduplicate if enabled
    if (!hideDuplicates) {
      return { displayNfts: filtered, duplicateCounts: new Map<string, number>() }
    }

    const seen = new Map<string, NFT>() // key -> first NFT
    const counts = new Map<string, number>() // key -> count

    for (const nft of filtered) {
      // Key by collection + image URL (open editions have same image)
      const key = `${nft.collection.contractAddress}-${nft.image}`
      const existing = seen.get(key)

      if (existing) {
        counts.set(key, (counts.get(key) || 1) + 1)
      } else {
        seen.set(key, nft)
        counts.set(key, 1)
      }
    }

    return {
      displayNfts: Array.from(seen.values()),
      duplicateCounts: counts,
    }
  }, [nfts, hideDuplicates, searchQuery, selectedCollection])

  return {
    displayNfts,
    duplicateCounts,
    collections,
    searchQuery,
    setSearchQuery,
    selectedCollection,
    setSelectedCollection,
    filteredCount: displayNfts.length,
    totalCount: nfts.length,
  }
}
