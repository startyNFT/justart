import { useState, useCallback } from 'react'
import type { NFT } from '@/lib/stargaze'
import type { SizeType, ArrangementType, MusicTrack } from '@/lib/constants'
import type { GalleryCategory } from '@/lib/supabase'
import type { RowConfig } from '@/components/CustomRowEditor'

interface GalleryFormState {
  name: string
  description: string
  size: SizeType
  arrangement: ArrangementType
  backgroundColor: string
  showInfo: boolean
  lockLayout: boolean
  category: GalleryCategory | null
  musicTrack: MusicTrack | null
  selectedNfts: NFT[]
  nftDescriptions: Record<string, string>
  rowConfigs: RowConfig[] | null
}

interface UseGalleryFormOptions {
  initialState?: Partial<GalleryFormState>
}

interface UseGalleryFormResult extends GalleryFormState {
  setName: (name: string) => void
  setDescription: (description: string) => void
  setSize: (size: SizeType) => void
  setArrangement: (arrangement: ArrangementType) => void
  setBackgroundColor: (color: string) => void
  setShowInfo: (show: boolean) => void
  setLockLayout: (lock: boolean) => void
  setCategory: (category: GalleryCategory | null) => void
  setMusicTrack: (track: MusicTrack | null) => void
  setSelectedNfts: (nfts: NFT[]) => void
  setNftDescriptions: (descriptions: Record<string, string>) => void
  setRowConfigs: (configs: RowConfig[] | null) => void
  updateNftDescription: (key: string, description: string) => void
  toggleNftSelection: (nft: NFT) => void
  isNftSelected: (nft: NFT) => boolean
}

/**
 * Hook to manage gallery form state
 * Handles all gallery settings and NFT selection
 */
export function useGalleryForm(options: UseGalleryFormOptions = {}): UseGalleryFormResult {
  const { initialState = {} } = options

  const [name, setName] = useState(initialState.name || '')
  const [description, setDescription] = useState(initialState.description || '')
  const [size, setSize] = useState<SizeType>(initialState.size || 'medium')
  const [arrangement, setArrangement] = useState<ArrangementType>(
    initialState.arrangement || 'grid'
  )
  const [backgroundColor, setBackgroundColor] = useState(
    initialState.backgroundColor || '#0A0A0A'
  )
  const [showInfo, setShowInfo] = useState(initialState.showInfo ?? true)
  const [lockLayout, setLockLayout] = useState(initialState.lockLayout ?? false)
  const [category, setCategory] = useState<GalleryCategory | null>(
    initialState.category || null
  )
  const [musicTrack, setMusicTrack] = useState<MusicTrack | null>(
    initialState.musicTrack || null
  )
  const [selectedNfts, setSelectedNfts] = useState<NFT[]>(initialState.selectedNfts || [])
  const [nftDescriptions, setNftDescriptions] = useState<Record<string, string>>(
    initialState.nftDescriptions || {}
  )
  const [rowConfigs, setRowConfigs] = useState<RowConfig[] | null>(
    initialState.rowConfigs || null
  )

  const updateNftDescription = useCallback((key: string, description: string) => {
    setNftDescriptions((prev) => ({
      ...prev,
      [key]: description,
    }))
  }, [])

  const toggleNftSelection = useCallback((nft: NFT) => {
    setSelectedNfts((prev) => {
      const key = `${nft.collection.contractAddress}-${nft.tokenId}`
      const isSelected = prev.some(
        (n) => `${n.collection.contractAddress}-${n.tokenId}` === key
      )

      if (isSelected) {
        return prev.filter(
          (n) => `${n.collection.contractAddress}-${n.tokenId}` !== key
        )
      } else {
        return [...prev, nft]
      }
    })
  }, [])

  const isNftSelected = useCallback(
    (nft: NFT) => {
      const key = `${nft.collection.contractAddress}-${nft.tokenId}`
      return selectedNfts.some(
        (n) => `${n.collection.contractAddress}-${n.tokenId}` === key
      )
    },
    [selectedNfts]
  )

  return {
    name,
    description,
    size,
    arrangement,
    backgroundColor,
    showInfo,
    lockLayout,
    category,
    musicTrack,
    selectedNfts,
    nftDescriptions,
    rowConfigs,
    setName,
    setDescription,
    setSize,
    setArrangement,
    setBackgroundColor,
    setShowInfo,
    setLockLayout,
    setCategory,
    setMusicTrack,
    setSelectedNfts,
    setNftDescriptions,
    setRowConfigs,
    updateNftDescription,
    toggleNftSelection,
    isNftSelected,
  }
}
