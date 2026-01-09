-- Initial schema for JustArt NFT Gallery Platform
-- Created: 2026-01-09

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on wallet_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Galleries table
CREATE TABLE IF NOT EXISTS galleries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  background_color TEXT NOT NULL DEFAULT '#000000',
  layout TEXT NOT NULL DEFAULT 'medium-grid',
  nft_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_tx_hash TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  show_info BOOLEAN NOT NULL DEFAULT true,
  lock_layout BOOLEAN NOT NULL DEFAULT false,
  music_track TEXT,
  custom_row_counts INTEGER[],
  row_heights INTEGER[],
  category TEXT,
  cached_thumbnails TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for galleries
CREATE INDEX IF NOT EXISTS idx_galleries_user_id ON galleries(user_id);
CREATE INDEX IF NOT EXISTS idx_galleries_slug ON galleries(slug);
CREATE INDEX IF NOT EXISTS idx_galleries_created_at ON galleries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_galleries_views ON galleries(views DESC);
CREATE INDEX IF NOT EXISTS idx_galleries_category ON galleries(category) WHERE category IS NOT NULL;

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gallery_id, wallet_address)
);

-- Create indexes for likes
CREATE INDEX IF NOT EXISTS idx_likes_gallery_id ON likes(gallery_id);
CREATE INDEX IF NOT EXISTS idx_likes_wallet_address ON likes(wallet_address);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at DESC);

-- NFT Ratings table
CREATE TABLE IF NOT EXISTS nft_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  nft_contract TEXT NOT NULL,
  nft_token_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gallery_id, nft_contract, nft_token_id, wallet_address)
);

-- Create indexes for NFT ratings
CREATE INDEX IF NOT EXISTS idx_nft_ratings_gallery_id ON nft_ratings(gallery_id);
CREATE INDEX IF NOT EXISTS idx_nft_ratings_nft ON nft_ratings(nft_contract, nft_token_id);
CREATE INDEX IF NOT EXISTS idx_nft_ratings_wallet_address ON nft_ratings(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nft_ratings_stars ON nft_ratings(stars DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for NFT ratings updated_at
CREATE TRIGGER update_nft_ratings_updated_at BEFORE UPDATE ON nft_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment gallery views
CREATE OR REPLACE FUNCTION increment_gallery_views(gallery_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE galleries SET views = views + 1 WHERE slug = gallery_slug;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_ratings ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read, only service role can insert/update
CREATE POLICY "Anyone can view users" ON users FOR SELECT USING (true);
CREATE POLICY "Service role can insert users" ON users FOR INSERT WITH CHECK (true);

-- Galleries: anyone can read, authenticated users can create/update their own
CREATE POLICY "Anyone can view galleries" ON galleries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert galleries" ON galleries FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own galleries" ON galleries FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own galleries" ON galleries FOR DELETE USING (true);

-- Likes: anyone can read/insert/delete
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert likes" ON likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete likes" ON likes FOR DELETE USING (true);

-- NFT Ratings: anyone can read/insert/update
CREATE POLICY "Anyone can view ratings" ON nft_ratings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ratings" ON nft_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ratings" ON nft_ratings FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete ratings" ON nft_ratings FOR DELETE USING (true);
