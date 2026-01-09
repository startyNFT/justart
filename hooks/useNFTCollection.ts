import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchNFTPage, PAGE_SIZE, FAST_INITIAL_SIZE, type NFT } from '@/lib/stargaze'
import { CONCURRENT_REQUESTS } from '@/lib/constants'

interface UseNFTCollectionOptions {
  walletAddress: string | undefined
  enabled?: boolean
}

interface UseNFTCollectionResult {
  nfts: NFT[]
  allLoadedNfts: NFT[]
  audioNfts: NFT[]
  loading: boolean
  total: number
  progress: string
  loadCollection: () => Promise<void>
}

/**
 * Hook to load and manage NFT collections with background loading
 * Handles progressive loading for instant UI + background fetching
 */
export function useNFTCollection({
  walletAddress,
  enabled = true,
}: UseNFTCollectionOptions): UseNFTCollectionResult {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [allLoadedNfts, setAllLoadedNfts] = useState<NFT[]>([])
  const [audioNfts, setAudioNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [progress, setProgress] = useState('')

  const loadingRef = useRef(false)

  const loadCollection = useCallback(async () => {
    if (!walletAddress || !enabled || loadingRef.current) return

    loadingRef.current = true
    setLoading(true)
    setProgress('Loading NFTs...')

    try {
      // Fast initial load
      const fastResult = await fetchNFTPage(walletAddress, 0, FAST_INITIAL_SIZE)

      if (fastResult.nfts.length === 0) {
        setNfts([])
        setAllLoadedNfts([])
        setAudioNfts([])
        setTotal(0)
        return
      }

      setNfts(fastResult.nfts)
      setTotal(fastResult.total)

      // Load rest of first page
      if (fastResult.total > FAST_INITIAL_SIZE) {
        const remainingResult = await fetchNFTPage(
          walletAddress,
          FAST_INITIAL_SIZE,
          PAGE_SIZE - FAST_INITIAL_SIZE
        )
        const fullFirstPage = [...fastResult.nfts, ...remainingResult.nfts]
        setNfts(fullFirstPage)

        // Start background loading for remaining pages
        backgroundLoadAllNfts(walletAddress, fastResult.total, fullFirstPage)
      } else {
        setAllLoadedNfts(fastResult.nfts)
        const audioFromPage = fastResult.nfts.filter(
          (nft) => nft.mediaType === 'audio' || nft.mediaType === 'video'
        )
        setAudioNfts(audioFromPage)
      }
    } catch (error) {
      console.error('Error loading NFT collection:', error)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [walletAddress, enabled])

  const backgroundLoadAllNfts = async (
    wallet: string,
    totalCount: number,
    firstPageNfts: NFT[]
  ) => {
    setAllLoadedNfts(firstPageNfts)

    // Extract audio NFTs from first page
    const firstPageAudio = firstPageNfts.filter(
      (nft) => nft.mediaType === 'audio' || nft.mediaType === 'video'
    )
    setAudioNfts(firstPageAudio)

    const pagesToLoad = Math.ceil(totalCount / PAGE_SIZE)
    let loadedNfts = [...firstPageNfts]
    let loadedAudioNfts = [...firstPageAudio]

    const offsets: number[] = []
    for (let page = 2; page <= pagesToLoad; page++) {
      offsets.push((page - 1) * PAGE_SIZE)
    }

    for (let i = 0; i < offsets.length; i += CONCURRENT_REQUESTS) {
      const batch = offsets.slice(i, i + CONCURRENT_REQUESTS)
      setProgress(`Loading: ${loadedNfts.length} / ${totalCount}`)

      const results = await Promise.all(
        batch.map((offset) => fetchNFTPage(wallet, offset, PAGE_SIZE))
      )

      for (const result of results) {
        loadedNfts = [...loadedNfts, ...result.nfts]
        const newAudio = result.nfts.filter(
          (nft) => nft.mediaType === 'audio' || nft.mediaType === 'video'
        )
        loadedAudioNfts = [...loadedAudioNfts, ...newAudio]
      }

      setAllLoadedNfts(loadedNfts)
      setAudioNfts(loadedAudioNfts)
    }

    setProgress('')
  }

  // Auto-load when wallet address changes and enabled
  useEffect(() => {
    if (walletAddress && enabled) {
      loadCollection()
    }
  }, [walletAddress, enabled, loadCollection])

  return {
    nfts,
    allLoadedNfts,
    audioNfts,
    loading,
    total,
    progress,
    loadCollection,
  }
}
