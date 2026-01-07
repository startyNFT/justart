import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET - Fetch ratings for NFTs in a gallery
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const galleryId = searchParams.get('gallery_id');
  const walletAddress = searchParams.get('wallet'); // optional - to get user's own ratings

  if (!galleryId) {
    return NextResponse.json({ error: 'Missing gallery_id' }, { status: 400 });
  }

  // Get all ratings for this gallery
  const { data: ratings, error } = await supabase
    .from('nft_ratings')
    .select('nft_contract, nft_token_id, stars, wallet_address')
    .eq('gallery_id', galleryId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate averages and counts per NFT
  const nftStats: Record<string, { total: number; count: number; userRating?: number }> = {};

  for (const rating of ratings || []) {
    const key = `${rating.nft_contract}-${rating.nft_token_id}`;
    if (!nftStats[key]) {
      nftStats[key] = { total: 0, count: 0 };
    }
    nftStats[key].total += rating.stars;
    nftStats[key].count += 1;

    // Track user's own rating if wallet provided
    if (walletAddress && rating.wallet_address === walletAddress) {
      nftStats[key].userRating = rating.stars;
    }
  }

  // Convert to averages
  const result: Record<string, { average: number; count: number; userRating?: number }> = {};
  for (const [key, stats] of Object.entries(nftStats)) {
    result[key] = {
      average: Math.round((stats.total / stats.count) * 10) / 10,
      count: stats.count,
      userRating: stats.userRating,
    };
  }

  return NextResponse.json({ ratings: result });
}

// POST - Submit or update a rating
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gallery_id, nft_contract, nft_token_id, wallet_address, stars } = body;

    if (!gallery_id || !nft_contract || !nft_token_id || !wallet_address || !stars) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Stars must be between 1 and 5' }, { status: 400 });
    }

    // Check if user is the gallery owner
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('user_id, users!inner(wallet_address)')
      .eq('id', gallery_id)
      .single();

    if (galleryError || !gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
    }

    // Prevent owner from rating their own gallery NFTs
    const users = gallery.users as { wallet_address: string }[] | { wallet_address: string };
    const ownerWallet = Array.isArray(users) ? users[0]?.wallet_address : users?.wallet_address;
    if (ownerWallet === wallet_address) {
      return NextResponse.json({ error: 'Cannot rate your own gallery' }, { status: 403 });
    }

    // Upsert the rating (update if exists, insert if not)
    const { error: upsertError } = await supabase
      .from('nft_ratings')
      .upsert(
        {
          gallery_id,
          nft_contract,
          nft_token_id,
          wallet_address,
          stars,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'gallery_id,nft_contract,nft_token_id,wallet_address',
        }
      );

    if (upsertError) {
      console.error('Rating upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rating error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
