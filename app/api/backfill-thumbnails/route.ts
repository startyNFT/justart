import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const STARGAZE_API = 'https://graphql.mainnet.stargaze-apis.com/graphql';

async function fetchNFTImage(contract: string, tokenId: string): Promise<{ image: string | null; mediaType: string | null }> {
  const query = `
    query Token($collectionAddr: String!, $tokenId: String!) {
      token(collectionAddr: $collectionAddr, tokenId: $tokenId) {
        media { url type }
        image { baseUrl }
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
    if (!token) return { image: null, mediaType: null };

    const mediaType = token.media?.type || 'image';
    const image = token.media?.url || token.image?.baseUrl;

    return { image, mediaType };
  } catch {
    return { image: null, mediaType: null };
  }
}

export async function POST() {
  // Fetch all galleries without cached_thumbnails
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('id, nft_ids, cached_thumbnails')
    .or('cached_thumbnails.is.null,cached_thumbnails.eq.{}');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!galleries || galleries.length === 0) {
    return NextResponse.json({ message: 'No galleries to update', updated: 0 });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const gallery of galleries) {
    try {
      const nftIds = gallery.nft_ids as { contract: string; token_id: string }[];
      if (!nftIds || nftIds.length === 0) continue;

      // Fetch first 8 NFTs to find 4 images (skip audio)
      const cachedThumbnails: string[] = [];

      for (const nftId of nftIds.slice(0, 8)) {
        if (cachedThumbnails.length >= 4) break;

        const { image, mediaType } = await fetchNFTImage(nftId.contract, nftId.token_id);

        // Skip audio NFTs
        if (mediaType === 'audio') continue;

        if (image) {
          cachedThumbnails.push(image);
        }
      }

      if (cachedThumbnails.length > 0) {
        const { error: updateError } = await supabase
          .from('galleries')
          .update({ cached_thumbnails: cachedThumbnails })
          .eq('id', gallery.id);

        if (updateError) {
          errors.push(`Gallery ${gallery.id}: ${updateError.message}`);
        } else {
          updated++;
        }
      }
    } catch (e) {
      errors.push(`Gallery ${gallery.id}: ${e}`);
    }
  }

  return NextResponse.json({
    message: `Backfill complete`,
    total: galleries.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
