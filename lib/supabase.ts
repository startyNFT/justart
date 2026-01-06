import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  wallet_address: string;
  created_at: string;
};

export type Gallery = {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
  background_color: string;
  layout: string;
  nft_ids: { contract: string; token_id: string }[];
  payment_tx_hash: string | null;
  views: number;
  created_at: string;
};

export type Like = {
  id: string;
  gallery_id: string;
  wallet_address: string;
  created_at: string;
};
