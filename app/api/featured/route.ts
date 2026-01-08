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
    if (!token) {
      console.log(`No token found for ${contract}/${tokenId}`);
      return null;
    }

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
      console.log('No galleries found in database');
      return NextResponse.json({ featured: [] });
    }

    console.log(`Found ${galleries.length} galleries`);

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
          try {
            imageUrl = createCdnUrl(rawUrl, 'xl');
          } catch (err) {
            console.error('CDN URL creation failed:', err);
            // Use raw URL as fallback
            imageUrl = rawUrl;
          }
        }
      }

      // If no cached thumbnail, fetch from Stargaze
      if (!imageUrl && gallery.nft_ids && Array.isArray(gallery.nft_ids) && gallery.nft_ids.length > 0) {
        console.log(`Gallery ${gallery.slug}: Fetching images for ${gallery.nft_ids.length} NFTs`);
        // Try first few NFTs until we find an image
        for (const nftId of gallery.nft_ids.slice(0, 4)) {
          if (!nftId || !nftId.contract || !nftId.token_id) {
            console.log(`Gallery ${gallery.slug}: Skipping invalid nftId:`, nftId);
            continue;
          }

          console.log(`Gallery ${gallery.slug}: Fetching image for ${nftId.contract}/${nftId.token_id}`);
          const img = await fetchNFTImage(nftId.contract, nftId.token_id);
          console.log(`Gallery ${gallery.slug}: Got image:`, img ? img.substring(0, 50) + '...' : 'null');

          if (img) {
            try {
              imageUrl = createCdnUrl(img, 'xl');
            } catch {
              imageUrl = img; // Fallback to raw URL
            }

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

    console.log(`Returning ${validFeatured.length} featured galleries with images`);

    return NextResponse.json(
      { featured: validFeatured },
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
