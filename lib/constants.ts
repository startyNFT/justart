// Stargaze Blockchain Configuration
export const STARGAZE_CHAIN_ID = 'stargaze-1';
export const STARGAZE_RPC = 'https://rpc.stargaze-apis.com';
export const STARGAZE_REST = 'https://rest.stargaze-apis.com';
export const STARGAZE_GRAPHQL = 'https://graphql.mainnet.stargaze-apis.com/graphql';
export const STARGAZE_NFT_URL = 'https://www.stargaze.zone/m';

// Payment Configuration
export const TREASURY_WALLET = 'stars1xd9qpmc8lga96cz5e24lfurx4f3sy22x5gxv7r';
export const GALLERY_PRICE_INCREMENT = 1000; // STARS per gallery
export const MINIMUM_PAYMENT_AMOUNT = 1000; // Minimum STARS to count as gallery payment

// NFT Loading Configuration
export const PAGE_SIZE = 75; // NFTs per page from Stargaze API
export const FAST_INITIAL_SIZE = 12; // Quick first load for instant UI feedback
export const CONCURRENT_REQUESTS = 6; // Parallel API requests for background loading

// API Retry Configuration
export const MAX_RETRIES = 3; // Maximum retry attempts for failed API calls
export const RETRY_DELAY_BASE = 500; // Base delay in ms for exponential backoff
export const FETCH_RETRY_ATTEMPTS = 3; // Retry attempts for fetch operations
export const FETCH_RETRY_DELAY = 1000; // Delay between fetch retries in ms

// CDN Configuration
export const CDN_BATCH_SIZE = 10; // Number of URLs to batch for CDN processing
export const CDN_MAX_RETRIES = 2; // Maximum retries for CDN URL fetching

// Slug Configuration
export const SLUG_LENGTH = 8; // Length of generated gallery slugs (nanoid)

// Size options - how big the images are
export const SIZE_OPTIONS = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
] as const;

// Arrangement options - how images are laid out
export const ARRANGEMENT_OPTIONS = [
  { id: 'grid', label: 'Grid' },
  { id: 'vertical', label: 'Vertical' },
  { id: 'justified', label: 'Justified' },
  { id: 'presentation', label: 'Presentation' },
] as const;

export type SizeType = typeof SIZE_OPTIONS[number]['id'];
export type ArrangementType = typeof ARRANGEMENT_OPTIONS[number]['id'];

// Legacy support
export const LAYOUT_OPTIONS = [
  { id: 'small', label: 'Small Grid', cols: 6 },
  { id: 'medium', label: 'Medium Grid', cols: 4 },
  { id: 'large', label: 'Large Grid', cols: 2 },
  { id: 'horizontal', label: 'Horizontal', cols: 1 },
  { id: 'vertical', label: 'Vertical', cols: 1 },
  { id: 'grid', label: 'Masonry', cols: 3 },
] as const;

export type LayoutType = typeof LAYOUT_OPTIONS[number]['id'];

// Music track type for NFT audio/video
export type MusicTrack = {
  url: string;
  name: string;
  collection: string;
};
