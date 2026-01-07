import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET - Fetch top-rated NFTs across all galleries
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const minRatings = parseInt(searchParams.get('min_ratings') || '2'); // Minimum ratings to be included

  try {
    // Get all ratings grouped by NFT
    const { data: ratings, error } = await supabase
      .from('nft_ratings')
      .select('gallery_id, nft_contract, nft_token_id, stars');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate averages per NFT (unique by contract+token, keeping the gallery reference)
    const nftStats: Map<string, {
      contract: string;
      tokenId: string;
      galleryId: string;
      total: number;
      count: number;
    }> = new Map();

    for (const rating of ratings || []) {
      const key = `${rating.nft_contract}-${rating.nft_token_id}`;

      if (!nftStats.has(key)) {
        nftStats.set(key, {
          contract: rating.nft_contract,
          tokenId: rating.nft_token_id,
          galleryId: rating.gallery_id,
          total: 0,
          count: 0,
        });
      }

      const stat = nftStats.get(key)!;
      stat.total += rating.stars;
      stat.count += 1;
    }

    // Filter by minimum ratings and calculate averages
    const nftsWithRatings = Array.from(nftStats.values())
      .filter(stat => stat.count >= minRatings)
      .map(stat => ({
        contract: stat.contract,
        tokenId: stat.tokenId,
        galleryId: stat.galleryId,
        average: Math.round((stat.total / stat.count) * 10) / 10,
        count: stat.count,
      }))
      .sort((a, b) => {
        // Sort by average rating, then by count
        if (b.average !== a.average) return b.average - a.average;
        return b.count - a.count;
      })
      .slice(0, limit);

    // Get gallery info for each NFT
    const galleryIds = [...new Set(nftsWithRatings.map(n => n.galleryId))];
    const { data: galleries } = await supabase
      .from('galleries')
      .select('id, slug, name, background_color')
      .in('id', galleryIds);

    const galleryMap = new Map((galleries || []).map(g => [g.id, g]));

    // Add gallery info to results
    const results = nftsWithRatings.map(nft => ({
      ...nft,
      gallery: galleryMap.get(nft.galleryId) || null,
    }));

    return NextResponse.json({ topRated: results });
  } catch (error) {
    console.error('Top rated error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
