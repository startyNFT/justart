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
  created_at: string;
};

export type Like = {
  id: string;
  gallery_id: string;
  wallet_address: string;
  created_at: string;
};
