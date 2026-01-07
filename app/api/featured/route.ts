import { createClient } from '@supabase/supabase-js';
import { createCdnUrl } from '@/lib/image-cdn';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const STARGAZE_API = 'https://graphql.mainnet.stargaze-apis.com/graphql';

// Fetch NFT image from Stargaze GraphQL
async function fetchNFTImage(contract: string, tokenId: string): Promise<string | null> {
  const query = `
    query Token($collectionAddr: String!, $tokenId: String!) {
      token(collectionAddr: $collectionAddr, tokenId: $tokenId) {
        media { url type visualAssets { lg { url } md { url } } }
        image { baseUrl }
        metadata
      }
    }
  `;

  try {
    const res = await fetch(STARGAZE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { collectionAddr: contract, tokenId },
      }),
    });

    const data = await res.json();
    const token = data?.data?.token;
    if (!token) return null;

    // Skip audio NFTs
    if (token.media?.type?.includes('audio')) return null;

    // Try multiple sources for image
    const image = token.media?.visualAssets?.lg?.url
      || token.media?.visualAssets?.md?.url
      || token.media?.url
      || token.image?.baseUrl
      || token.metadata?.image;

    return image || null;
  } catch {
    return null;
  }
}

export const revalidate = 10; // Cache for 10 seconds for fresher data

export async function GET() {
  // Get all galleries (with or without cached_thumbnails)
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('id, slug, name, cached_thumbnails, nft_ids, background_color')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !galleries || galleries.length === 0) {
    return NextResponse.json({ featured: [] });
  }

  // Shuffle and pick 6 galleries
  const shuffled = [...galleries].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 6);

  // Build featured list, fetching images if needed
  const featured = await Promise.all(selected.map(async (gallery) => {
    let imageUrl: string | null = null;

    // Try cached thumbnails first
    const thumbnails = gallery.cached_thumbnails || [];
    if (thumbnails.length > 0) {
      const randomIndex = Math.floor(Math.random() * thumbnails.length);
      const rawUrl = thumbnails[randomIndex];
      if (rawUrl) {
        imageUrl = createCdnUrl(rawUrl, 'xl');
      }
    }

    // If no cached thumbnail, fetch from Stargaze
    if (!imageUrl && gallery.nft_ids && gallery.nft_ids.length > 0) {
      // Try first few NFTs until we find an image
      for (const nftId of gallery.nft_ids.slice(0, 4)) {
        const img = await fetchNFTImage(nftId.contract, nftId.token_id);
        if (img) {
          imageUrl = createCdnUrl(img, 'xl');

          // Cache for future (fire and forget)
          supabase
            .from('galleries')
            .update({ cached_thumbnails: [img] })
            .eq('id', gallery.id)
            .then(() => {});

          break;
        }
      }
    }

    return {
      id: gallery.id,
      slug: gallery.slug,
      name: gallery.name,
      imageUrl,
    };
  }));

  // Filter out galleries without images
  const validFeatured = featured.filter(item => item.imageUrl);

  return NextResponse.json(
    { featured: validFeatured },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5',
      },
    }
  );
}
