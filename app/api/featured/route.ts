import { createCdnUrl } from '@/lib/image-cdn';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const STARGAZE_API = 'https://graphql.mainnet.stargaze-apis.com/graphql';

// Fetch NFT image from Stargaze GraphQL
async function fetchNFTImage(contract: string, tokenId: string): Promise<string | null> {
  const query = `
    query Token($collectionAddr: String!, $tokenId: String!) {
      token(collectionAddr: $collectionAddr, tokenId: $tokenId) {
        name
        imageUrl
        media { url type visualAssets { lg { url } md { url } } }
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

    // Try multiple sources for image (updated for new schema)
    const image = token.imageUrl
      || token.media?.visualAssets?.lg?.url
      || token.media?.visualAssets?.md?.url
      || token.media?.url;

    return image || null;
  } catch (err) {
    console.error('Error fetching NFT image:', err);
    return null;
  }
}

export const dynamic = 'force-dynamic'; // Prevent static generation at build time

type FeaturedImage = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
};

export async function GET() {
  try {
    // Get all galleries (with or without cached_thumbnails)
    const { data: galleries, error } = await supabase
      .from('galleries')
      .select('id, slug, name, cached_thumbnails, nft_ids, background_color')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error fetching galleries:', error);
      return NextResponse.json({ featured: [], error: error.message }, { status: 500 });
    }

    if (!galleries || galleries.length === 0) {
      return NextResponse.json({ featured: [] });
    }

    // Collect ALL images from all galleries into a pool
    const imagePool: FeaturedImage[] = [];

    for (const gallery of galleries) {
      const thumbnails = gallery.cached_thumbnails || [];

      // Add first 4 cached thumbnails to the pool (limit for performance)
      for (const rawUrl of thumbnails.slice(0, 4)) {
        if (!rawUrl) continue;
        try {
          const imageUrl = createCdnUrl(rawUrl, 'xl');
          imagePool.push({
            id: gallery.id,
            slug: gallery.slug,
            name: gallery.name,
            imageUrl,
          });
        } catch {
          // Use raw URL as fallback
          imagePool.push({
            id: gallery.id,
            slug: gallery.slug,
            name: gallery.name,
            imageUrl: rawUrl,
          });
        }
      }

      // If no cached thumbnails, fetch from Stargaze (up to 4 images per gallery)
      if (thumbnails.length === 0 && gallery.nft_ids && Array.isArray(gallery.nft_ids) && gallery.nft_ids.length > 0) {
        const fetchedImages: string[] = [];

        for (const nftId of gallery.nft_ids.slice(0, 4)) {
          if (!nftId || !nftId.contract || !nftId.token_id) continue;

          const img = await fetchNFTImage(nftId.contract, nftId.token_id);
          if (img) {
            fetchedImages.push(img);
            try {
              const imageUrl = createCdnUrl(img, 'xl');
              imagePool.push({
                id: gallery.id,
                slug: gallery.slug,
                name: gallery.name,
                imageUrl,
              });
            } catch {
              imagePool.push({
                id: gallery.id,
                slug: gallery.slug,
                name: gallery.name,
                imageUrl: img,
              });
            }
          }
        }

        // Cache fetched images for future (fire and forget)
        if (fetchedImages.length > 0) {
          supabase
            .from('galleries')
            .update({ cached_thumbnails: fetchedImages })
            .eq('id', gallery.id)
            .then(() => {});
        }
      }
    }

    // Shuffle the entire pool and pick 6 random images
    const shuffled = [...imagePool].sort(() => Math.random() - 0.5);
    const featured = shuffled.slice(0, 6);

    return NextResponse.json(
      { featured },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=5',
        },
      }
    );
  } catch (err) {
    console.error('Featured API error:', err);
    return NextResponse.json({ featured: [], error: String(err) }, { status: 500 });
  }
}
