import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const STARGAZE_API = 'https://graphql.mainnet.stargaze-apis.com/graphql';

async function fetchNFTImage(contract: string, tokenId: string): Promise<{ image: string | null; mediaType: string | null }> {
  const query = `
    query Token($collectionAddr: String!, $tokenId: String!) {
      token(collectionAddr: $collectionAddr, tokenId: $tokenId) {
        imageUrl
        media { url type }
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
    const image = token.imageUrl || token.media?.url;

    return { image, mediaType };
  } catch {
    return { image: null, mediaType: null };
  }
}

export async function POST() {
  // Fetch ALL galleries to force update
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('id, nft_ids, cached_thumbnails');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!galleries || galleries.length === 0) {
    return NextResponse.json({ message: 'No galleries found', updated: 0 });
  }

  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const details: { id: string; thumbnails: number }[] = [];

  for (const gallery of galleries) {
    try {
      const nftIds = gallery.nft_ids as { contract: string; token_id: string }[];
      if (!nftIds || nftIds.length === 0) {
        skipped++;
        continue;
      }

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
          details.push({ id: gallery.id, thumbnails: cachedThumbnails.length });
        }
      } else {
        errors.push(`Gallery ${gallery.id}: No images found`);
      }
    } catch (e) {
      errors.push(`Gallery ${gallery.id}: ${e}`);
    }
  }

  return NextResponse.json({
    message: `Backfill complete`,
    total: galleries.length,
    updated,
    skipped,
    details,
    errors: errors.length > 0 ? errors : undefined,
  });
}
