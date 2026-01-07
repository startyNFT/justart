# JustArt Project Notes

## Overview
JustArt is a Stargaze NFT gallery creator built with Next.js, Supabase, and dnd-kit.

## Recent Work (Jan 2025)

### Explore Page Features
- `/explore` - Main explore page with search, categories, sections
- `/explore/most-liked` - All galleries sorted by likes
- `/explore/trending` - Galleries from this week sorted by views
- `/explore/all` - Full gallery list with filters, search, grid/list view
- Search by gallery name, creator name, or wallet address
- Category filter chips
- "Most Liked", "Most Viewed This Week", "Random Galleries" sections
- Categories: photography, digital-art, 3d-art, generative, pixel-art, illustration, abstract, nature, portraits, mixed

### Gallery Categories
- Added category selector to create and edit pages
- Categories stored in `galleries.category` column
- Can filter by category in explore page

### Row Layout Customization
- Changed from simple `number[]` row counts to `RowConfig[]` with `count` and `height` properties
- Added row height resizing via drag handles in custom mode
- Updated CustomRowEditor, NFTGrid, create page, and edit page
- Database schema updated with `row_heights` column alongside existing `custom_row_counts`

### Drag and Drop Fixes
- Using `rectIntersection` collision detection for more accurate row-to-row dragging
- Added `DragOverlay` for smoother visual feedback during drag
- Using `rectSortingStrategy` instead of `horizontalListSortingStrategy`
- NFTs can be dragged within rows (reorder) and between rows (move)
- Row configs update automatically when NFTs are moved between rows

### Image Loading Optimization (CDN)
- Using i.rscdn.art CDN with imgproxy for fast, cached image delivery
- Server-side signing to keep keys secure (keys never leave backend)
- Signing uses HMAC SHA256 with hex-decoded key/salt
- Components integrated: GalleryThumbnail, NFTCard, NFTGrid (SimpleCard, JustifiedItem)
- Client uses `/api/image` endpoint to get signed URLs, with in-memory caching
- Size options: xs (128px), sm (256px), md (512px), lg (1024px), xl (2048px)

## Key Files
- `components/CustomRowEditor.tsx` - Row editor with drag/drop and height controls
- `components/NFTGrid.tsx` - Main grid display with justified layout support
- `components/NFTCard.tsx` - Individual NFT card with CDN integration
- `components/GalleryThumbnail.tsx` - Gallery thumbnail grid with CDN integration
- `app/create/page.tsx` - Gallery creation page
- `app/edit/[slug]/page.tsx` - Gallery editing page
- `app/explore/page.tsx` - Explore galleries page
- `app/api/image/route.ts` - API endpoint for signed CDN URLs
- `lib/image-cdn.ts` - Server-side CDN URL signing
- `hooks/useCdnUrl.ts` - Client hook for CDN URLs with caching
- `lib/supabase.ts` - Database types and client
- `lib/stargaze.ts` - NFT fetching and image URL handling

## Database Schema (relevant)
```typescript
type Gallery = {
  custom_row_counts: number[] | null;  // NFTs per row
  row_heights: number[] | null;        // Height in pixels per row
  category: GalleryCategory | null;    // Gallery category
}
```

## CDN Configuration (i.rscdn.art)
Set these env vars in `.env.local`:
- `SERVICES_IMAGE_ENDPOINT` - CDN endpoint (https://i.rscdn.art)
- `SERVICES_IMAGE_KEY` - hex-encoded secret key
- `SERVICES_IMAGE_SALT` - hex-encoded salt
Keys stay on server side only. Client calls /api/image to get signed URLs.
