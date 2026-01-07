import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Database features will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  wallet_address: string;
  created_at: string;
};

export type NFTItem = {
  contract: string;
  token_id: string;
  description?: string; // Optional per-NFT description for presentation mode
};

export type GalleryCategory =
  | 'photography'
  | 'digital-art'
  | '3d-art'
  | 'generative'
  | 'pixel-art'
  | 'illustration'
  | 'abstract'
  | 'nature'
  | 'portraits'
  | 'mixed';

export const GALLERY_CATEGORIES: { value: GalleryCategory; label: string }[] = [
  { value: 'photography', label: 'Photography' },
  { value: 'digital-art', label: 'Digital Art' },
  { value: '3d-art', label: '3D Art' },
  { value: 'generative', label: 'Generative' },
  { value: 'pixel-art', label: 'Pixel Art' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'nature', label: 'Nature' },
  { value: 'portraits', label: 'Portraits' },
  { value: 'mixed', label: 'Mixed' },
];

export type Gallery = {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
  background_color: string;
  layout: string;
  nft_ids: NFTItem[];
  payment_tx_hash: string | null;
  views: number;
  show_info: boolean;
  lock_layout: boolean; // If true, viewers cannot change size/arrangement
  music_track: string | null; // ID of curated music track to play
  custom_row_counts: number[] | null; // Custom row layout for justified arrangement
  row_heights: number[] | null; // Custom row heights for justified arrangement
  category: GalleryCategory | null; // Gallery category
  cached_thumbnails: string[] | null; // Cached thumbnail URLs for instant gallery preview
  created_at: string;
};

export type Like = {
  id: string;
  gallery_id: string;
  wallet_address: string;
  created_at: string;
};

// NFT star rating (1-5) within a gallery context
// Only visitors can rate, not the gallery owner
export type NFTRating = {
  id: string;
  gallery_id: string;
  nft_contract: string;
  nft_token_id: string;
  wallet_address: string; // who rated
  stars: number; // 1-5
  created_at: string;
  updated_at: string;
};
