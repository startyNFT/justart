# Shared Utilities and Hooks

This document describes the shared utilities and hooks extracted from create/edit pages to reduce code duplication and improve maintainability.

## Overview

Previously, create (`1,191 lines`) and edit (`1,102 lines`) pages had extensive code duplication (~70% similar code). The shared functionality has been extracted into reusable hooks and utilities.

**Before:** 2,293 lines of duplicated code
**After:** ~500 lines of shared utilities + simplified pages

## Shared Hooks

### 1. useNFTCollection

**Location:** `hooks/useNFTCollection.ts`

Manages NFT collection loading with progressive loading and background fetching.

**Features:**
- Fast initial load (first 12 NFTs)
- Background loading of remaining NFTs
- Audio/video NFT extraction
- Progress reporting
- Automatic retry on failure

**Usage:**
```tsx
import { useNFTCollection } from '@/hooks/useNFTCollection'

function MyComponent() {
  const { address } = useChain('stargaze')

  const {
    nfts,           // Currently displayed NFTs
    allLoadedNfts,  // All loaded NFTs (for search)
    audioNfts,      // Audio/video NFTs only
    loading,        // Loading state
    total,          // Total NFT count
    progress,       // Progress message
    loadCollection, // Manual reload function
  } = useNFTCollection({
    walletAddress: address,
    enabled: true,
  })

  return (
    <div>
      {loading && <p>{progress}</p>}
      <div>Total: {total} NFTs</div>
      {nfts.map(nft => <NFTCard key={nft.tokenId} nft={nft} />)}
    </div>
  )
}
```

**Benefits:**
- Single source of truth for NFT loading logic
- Automatic background loading
- Handles edge cases (empty collections, errors)
- Progress tracking built-in

---

### 2. useNFTFilters

**Location:** `hooks/useNFTFilters.ts`

Handles NFT search, filtering, and deduplication.

**Features:**
- Search by NFT name or collection name
- Filter by collection
- Deduplication of open editions
- Collection list with counts
- Filtered/total counts

**Usage:**
```tsx
import { useNFTFilters } from '@/hooks/useNFTFilters'

function MyComponent({ nfts }: { nfts: NFT[] }) {
  const {
    displayNfts,        // Filtered & deduplicated NFTs
    duplicateCounts,    // Map of duplicate counts
    collections,        // Available collections
    searchQuery,        // Current search query
    setSearchQuery,     // Update search
    selectedCollection, // Current filter
    setSelectedCollection, // Update filter
    filteredCount,      // Number shown
    totalCount,         // Total available
  } = useNFTFilters({
    nfts,
    hideDuplicates: true,
  })

  return (
    <div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search NFTs..."
      />

      <select
        value={selectedCollection || ''}
        onChange={(e) => setSelectedCollection(e.target.value || null)}
      >
        <option value="">All Collections</option>
        {collections.map(col => (
          <option key={col.addr} value={col.addr}>
            {col.name} ({col.count})
          </option>
        ))}
      </select>

      <p>Showing {filteredCount} of {totalCount}</p>

      {displayNfts.map(nft => (
        <NFTCard key={nft.tokenId} nft={nft} />
      ))}
    </div>
  )
}
```

**Benefits:**
- Centralized search/filter logic
- Automatic collection extraction
- Deduplication built-in
- Efficient memoization

---

### 3. useLoadingProgress

**Location:** `hooks/useLoadingProgress.ts`

Animates loading progress smoothly for better UX.

**Features:**
- Smooth 0-75% animation over 5 seconds
- Random increments toward 99%
- Automatic reset
- Organic feel with variable timing

**Usage:**
```tsx
import { useLoadingProgress } from '@/hooks/useLoadingProgress'

function MyComponent() {
  const [loading, setLoading] = useState(false)
  const progress = useLoadingProgress(loading)

  return (
    <div>
      {loading && (
        <div className="progress-bar">
          <div style={{ width: `${progress}%` }} />
          <span>{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}
```

**Benefits:**
- Smooth, organic animation
- No manual state management
- Consistent UX across app
- Automatic cleanup

---

### 4. useGalleryForm

**Location:** `hooks/useGalleryForm.ts`

Manages all gallery form state (settings, NFT selection, descriptions).

**Features:**
- All gallery settings (name, description, colors, etc.)
- NFT selection management
- Per-NFT descriptions
- Row configuration
- Helper functions for common operations

**Usage:**
```tsx
import { useGalleryForm } from '@/hooks/useGalleryForm'

function MyComponent() {
  const form = useGalleryForm({
    initialState: {
      name: 'My Gallery',
      size: 'medium',
      arrangement: 'grid',
    },
  })

  return (
    <div>
      <input
        value={form.name}
        onChange={(e) => form.setName(e.target.value)}
      />

      <SizePicker value={form.size} onChange={form.setSize} />

      <button onClick={() => form.toggleNftSelection(nft)}>
        {form.isNftSelected(nft) ? 'Remove' : 'Add'}
      </button>

      <p>Selected: {form.selectedNfts.length} NFTs</p>
    </div>
  )
}
```

**Benefits:**
- Single state object for entire form
- Type-safe with TypeScript
- Helper functions for common tasks
- Easy to initialize from existing gallery

---

## Shared Utilities

### 1. Pagination Utilities

**Location:** `lib/pagination.ts`

Functions for pagination logic.

**Functions:**

#### generatePagination
```ts
const { pageNumbers, totalPages, currentPage, hasNext, hasPrev } =
  generatePagination(5, 20)
// pageNumbers: [1, '...', 4, 5, 6, '...', 20]
```

#### getPageOffset
```ts
const offset = getPageOffset(3, 75) // 150 (page 3, 75 per page)
```

#### isValidPage
```ts
const valid = isValidPage(5, 10) // true
const invalid = isValidPage(15, 10) // false
```

#### getPageUrl
```ts
const url = getPageUrl('/my-nfts', 2)
// '/my-nfts?page=2'
```

#### formatNumber
```ts
const formatted = formatNumber(1000) // "1,000"
```

**Benefits:**
- Consistent pagination logic
- No magic numbers
- Tested and reliable
- Easy to use

---

## Migration Guide

### Before (Duplicated Code)

**create/page.tsx** and **edit/[slug]/page.tsx** both had:

```tsx
// 100+ lines of NFT loading logic
const [nfts, setNfts] = useState<NFT[]>([])
const [loading, setLoading] = useState(false)
// ... complex loading logic ...

// 80+ lines of search/filter logic
const [searchQuery, setSearchQuery] = useState('')
// ... complex filter logic ...

// 50+ lines of progress animation
const [progress, setProgress] = useState(0)
// ... animation logic ...

// 100+ lines of form state
const [name, setName] = useState('')
const [description, setDescription] = useState('')
// ... 20+ more state variables ...
```

### After (Shared Utilities)

```tsx
// Simple, clean, reusable
const { nfts, loading, progress } = useNFTCollection({
  walletAddress: address,
})

const { displayNfts, searchQuery, setSearchQuery } = useNFTFilters({
  nfts,
  hideDuplicates: true,
})

const loadingProgress = useLoadingProgress(loading)

const form = useGalleryForm({
  initialState: existingGallery,
})
```

---

## Code Reduction

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| create/page.tsx | 1,191 lines | ~700 lines | 41% |
| edit/[slug]/page.tsx | 1,102 lines | ~650 lines | 41% |
| **Total** | **2,293 lines** | **~1,850 lines** | **~450 lines saved** |

Plus: **+500 lines** of shared, tested, reusable code

Net benefit: More maintainable, less duplication, better tested

---

## Testing

All shared hooks have test coverage:

```bash
# Run tests for shared utilities
npm test -- hooks/
npm test -- lib/pagination
```

Example test:
```tsx
import { renderHook } from '@testing-library/react'
import { useNFTFilters } from '@/hooks/useNFTFilters'

test('filters NFTs by search query', () => {
  const { result } = renderHook(() =>
    useNFTFilters({ nfts: mockNfts })
  )

  act(() => {
    result.current.setSearchQuery('dragon')
  })

  expect(result.current.displayNfts.length).toBe(2)
})
```

---

## Best Practices

### 1. Use Hooks at Top Level
```tsx
// ✅ Good
function MyComponent() {
  const { nfts } = useNFTCollection({ walletAddress })
  return <div>{nfts.length}</div>
}

// ❌ Bad
function MyComponent() {
  if (condition) {
    const { nfts } = useNFTCollection({ walletAddress }) // Can't be conditional!
  }
}
```

### 2. Pass Dependencies Correctly
```tsx
// ✅ Good - stable reference
const { nfts } = useNFTCollection({
  walletAddress: address,
  enabled: isWalletConnected,
})

// ❌ Bad - new object every render
const { nfts } = useNFTCollection({
  walletAddress: address,
  options: { enabled: true }, // Creates new object each time
})
```

### 3. Memoize Expensive Operations
```tsx
const form = useGalleryForm()

// ✅ Good - memoized
const selectedIds = useMemo(
  () => new Set(form.selectedNfts.map(nft => nft.tokenId)),
  [form.selectedNfts]
)

// ❌ Bad - computed every render
const selectedIds = new Set(form.selectedNfts.map(nft => nft.tokenId))
```

---

## Future Enhancements

Potential additions:
1. **useGalleryPersistence** - Auto-save drafts to localStorage
2. **useNFTSelection** - Bulk selection, select all, deselect all
3. **useGalleryValidation** - Form validation rules
4. **usePaymentFlow** - Handle gallery payment logic
5. **useGalleryPublish** - Publish/save/update logic

---

## Contributing

When adding new shared functionality:

1. **Extract common patterns** - If 2+ files have similar code, extract it
2. **Write tests** - All shared code should have test coverage
3. **Document usage** - Add examples to this file
4. **Type everything** - Use TypeScript for all parameters and returns
5. **Keep focused** - Each hook should do one thing well

---

## Questions?

- Check hook source code for inline documentation
- Run tests to see usage examples
- Look at create/edit pages for real-world usage
- Ask in Discord: #dev-questions
