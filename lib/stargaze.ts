import { GraphQLClient, gql } from 'graphql-request';
import { STARGAZE_GRAPHQL } from './constants';

const client = new GraphQLClient(STARGAZE_GRAPHQL);

// Fetch Stargaze Name for a wallet address
const NAME_QUERY = gql`
  query Name($address: String!) {
    names(ownerAddr: $address) {
      names {
        name
      }
    }
  }
`;

export async function fetchStargazeName(walletAddress: string): Promise<string | null> {
  try {
    const data = await client.request<{
      names: {
        names: Array<{ name: string }>;
      };
    }>(NAME_QUERY, { address: walletAddress });

    if (data.names.names.length > 0) {
      return data.names.names[0].name;
    }
    return null;
  } catch (error) {
    console.error('Error fetching Stargaze name:', error);
    return null;
  }
}

// Image size options
export type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

// Transform Stargaze IPFS URLs to use IPFS gateway
function transformIpfsUrl(url: string): string {
  if (!url) return '';

  let ipfsHash = '';

  // Extract IPFS hash from various URL formats
  if (url.includes('ipfs-gw.stargaze-apis.com/ipfs/')) {
    ipfsHash = url.split('ipfs-gw.stargaze-apis.com/ipfs/')[1]?.split('?')[0] || '';
  } else if (url.startsWith('ipfs://')) {
    ipfsHash = url.replace('ipfs://', '');
  } else if (url.includes('/ipfs/')) {
    ipfsHash = url.split('/ipfs/')[1]?.split('?')[0] || '';
  }

  if (ipfsHash) {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }

  return url;
}

// Get image URL (size param kept for API compatibility but not used)
export function getOptimizedImageUrl(url: string, _size: ImageSize = 'md'): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  return transformIpfsUrl(url);
}

export type NFT = {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  thumbnail?: string; // Optimized smaller image for grid views
  animationUrl?: string;
  audioUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  collection: {
    contractAddress: string;
    name: string;
  };
};


// Helper to map token data to NFT type
function mapTokenToNFT(token: {
  tokenId: string;
  name: string;
  description?: string;
  media: {
    url: string;
    type: string;
    visualAssets?: {
      lg?: { url: string };
      md?: { url: string };
      sm?: { url: string };
    };
  } | null;
  metadata: Record<string, unknown> | null;
  collection: { contractAddress: string; name: string };
}): NFT {
  const rawMediaType = token.media?.type || '';
  const animationUrl = token.metadata?.animation_url as string | undefined;

  // Determine media type
  let mediaType: 'image' | 'video' | 'audio' = 'image';
  let audioUrl: string | undefined;
  let videoUrl: string | undefined;

  if (rawMediaType.includes('audio')) {
    mediaType = 'audio';
    audioUrl = token.media?.url;
  } else if (rawMediaType.includes('video')) {
    mediaType = 'video';
    videoUrl = token.media?.url || animationUrl;
  } else if (animationUrl?.includes('.mp4') || animationUrl?.includes('.webm')) {
    mediaType = 'video';
    videoUrl = animationUrl;
  }

  // Get image URL - check multiple sources
  let imageUrl = '';

  // For audio/html/unknown types, media.url is not the image - check metadata first
  const isNonImageMedia = rawMediaType.includes('audio') || rawMediaType.includes('html') || rawMediaType === 'unknown';
  if (isNonImageMedia) {
    // Try metadata image sources first for non-image media types
    if (token.metadata?.image) {
      imageUrl = token.metadata.image as string;
    } else if (token.metadata?.image_data) {
      imageUrl = token.metadata.image_data as string;
    }
  }

  // Standard image from media.url (only for actual image types)
  if (!imageUrl && token.media?.url && !isNonImageMedia) {
    imageUrl = token.media.url;
  }

  // Fallbacks for any type
  if (!imageUrl && token.metadata?.image) {
    imageUrl = token.metadata.image as string;
  }
  if (!imageUrl && token.metadata?.image_data) {
    imageUrl = token.metadata.image_data as string;
  }

  // Final fallback: use visualAssets if available
  if (!imageUrl && token.media?.visualAssets) {
    const va = token.media.visualAssets;
    imageUrl = va.lg?.url || va.md?.url || va.sm?.url || '';
  }

  // Check if this is an animated image (GIF, APNG, animated WebP)
  const lowerImageUrl = imageUrl.toLowerCase();
  const lowerMediaType = rawMediaType.toLowerCase();
  const isAnimatedImage =
    lowerImageUrl.includes('.gif') ||
    lowerMediaType.includes('gif') ||
    lowerImageUrl.includes('.apng') ||
    lowerMediaType.includes('apng') ||
    // Check if animation_url is a GIF (not video)
    (animationUrl && (animationUrl.toLowerCase().includes('.gif') || animationUrl.toLowerCase().includes('.apng')));

  // Get optimized thumbnail from visualAssets (use medium size - 512px)
  // Skip thumbnail for animated images to preserve animation
  // Skip thumbnail for audio NFTs - visualAssets would be audio waveform, not cover art
  const skipThumbnail = isAnimatedImage || isNonImageMedia;
  const thumbnail = skipThumbnail ? undefined : (token.media?.visualAssets?.md?.url || token.media?.visualAssets?.lg?.url);

  // For GIF animation_url, use it as the image instead
  let finalImageUrl = imageUrl;
  if (animationUrl && (animationUrl.toLowerCase().includes('.gif') || animationUrl.toLowerCase().includes('.apng'))) {
    finalImageUrl = animationUrl;
  }

  return {
    tokenId: token.tokenId,
    name: token.name || `#${token.tokenId}`,
    description: token.description || '',
    image: finalImageUrl.startsWith('data:') ? finalImageUrl : transformIpfsUrl(finalImageUrl),
    thumbnail: thumbnail || undefined,
    animationUrl: videoUrl ? transformIpfsUrl(videoUrl) : (animationUrl && !animationUrl.toLowerCase().includes('.gif') && !animationUrl.toLowerCase().includes('.apng') ? transformIpfsUrl(animationUrl) : undefined),
    audioUrl: audioUrl ? transformIpfsUrl(audioUrl) : undefined,
    mediaType,
    collection: token.collection,
  };
}

// Cache helpers - use sessionStorage for session-based caching
const CACHE_KEY_PREFIX = 'pureart_nfts_page_';

function getCachedPage(walletAddress: string, offset: number): NFT[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${walletAddress}_${offset}`);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function setCachedPage(walletAddress: string, offset: number, data: NFT[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${CACHE_KEY_PREFIX}${walletAddress}_${offset}`, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export const PAGE_SIZE = 75; // NFTs per page
export const FAST_INITIAL_SIZE = 12; // Quick first load for instant UI

const nftQuery = `
  query TokensOwned($owner: String!, $limit: Int, $offset: Int) {
    tokens(ownerAddrOrName: $owner, limit: $limit, offset: $offset) {
      tokens {
        tokenId
        name
        media {
          url
          type
          visualAssets {
            lg { url }
            md { url }
            sm { url }
          }
        }
        metadata
        collection { contractAddress name }
      }
      pageInfo { total }
    }
  }
`;

// Helper to fetch with retries
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      // If not ok, throw to trigger retry
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

// Fetch a single page of NFTs with caching
export async function fetchNFTPage(
  walletAddress: string,
  offset: number = 0,
  limit: number = PAGE_SIZE
): Promise<{ nfts: NFT[]; total: number; hasMore: boolean }> {
  // Check cache first for non-first pages
  const cached = getCachedPage(walletAddress, offset);
  if (cached && cached.length > 0 && offset > 0) {
    // Try to get cached total
    let cachedTotal = 0;
    if (typeof window !== 'undefined') {
      try {
        const totalData = sessionStorage.getItem(`pureart_nfts_total_${walletAddress}`);
        if (totalData) {
          cachedTotal = parseInt(totalData, 10) || 0;
        }
      } catch { /* ignore */ }
    }
    return { nfts: cached, total: cachedTotal, hasMore: true };
  }

  try {
    const response = await fetchWithRetry(STARGAZE_GRAPHQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: nftQuery,
        variables: { owner: walletAddress, limit, offset }
      })
    });
    const data = await response.json();

    if (!data?.data?.tokens?.tokens) {
      // Empty response - retry once more after delay
      console.warn('Empty response from API, retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const retryResponse = await fetchWithRetry(STARGAZE_GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: nftQuery,
          variables: { owner: walletAddress, limit, offset }
        })
      });
      const retryData = await retryResponse.json();

      if (!retryData?.data?.tokens?.tokens) {
        return { nfts: [], total: 0, hasMore: false };
      }

      const total = retryData.data.tokens.pageInfo.total;
      const nfts = retryData.data.tokens.tokens.map(mapTokenToNFT);
      setCachedPage(walletAddress, offset, nfts);
      return { nfts, total, hasMore: offset + nfts.length < total };
    }

    const total = data.data.tokens.pageInfo.total;
    const nfts = data.data.tokens.tokens.map(mapTokenToNFT);

    // Cache the results
    setCachedPage(walletAddress, offset, nfts);

    // Cache the total count
    if (typeof window !== 'undefined' && total > 0) {
      try {
        sessionStorage.setItem(`pureart_nfts_total_${walletAddress}`, String(total));
      } catch { /* ignore */ }
    }

    return { nfts, total, hasMore: offset + nfts.length < total };
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return { nfts: [], total: 0, hasMore: false };
  }
}

// Fetch multiple pages in parallel for faster loading
export async function fetchNFTsParallel(
  walletAddress: string,
  total: number,
  startOffset: number = 0,
  concurrency: number = 3
): Promise<NFT[]> {
  const allNfts: NFT[] = [];
  const pageOffsets: number[] = [];

  // Generate offsets for remaining pages
  for (let offset = startOffset; offset < total; offset += PAGE_SIZE) {
    pageOffsets.push(offset);
  }

  // Fetch in parallel batches
  for (let i = 0; i < pageOffsets.length; i += concurrency) {
    const batch = pageOffsets.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(offset => fetchNFTPage(walletAddress, offset, PAGE_SIZE))
    );
    results.forEach(result => {
      allNfts.push(...result.nfts);
    });
  }

  return allNfts;
}

// Prefetch next pages aggressively
export function prefetchNFTPages(walletAddress: string, currentOffset: number, total: number) {
  // Prefetch next 3 pages
  const pagesToPrefetch = [1, 2, 3];
  pagesToPrefetch.forEach(i => {
    const nextOffset = currentOffset + (i * PAGE_SIZE);
    if (nextOffset < total) {
      // Check if already cached
      if (!getCachedPage(walletAddress, nextOffset)) {
        // Fetch in background
        fetchNFTPage(walletAddress, nextOffset);
      }
    }
  });
}

const TOKEN_BY_ID_QUERY = gql`
  query Token($collectionAddr: String!, $tokenId: String!) {
    token(collectionAddr: $collectionAddr, tokenId: $tokenId) {
      tokenId
      name
      description
      media {
        url
        type
        visualAssets {
          lg { url }
          md { url }
          sm { url }
        }
      }
      metadata
      collection {
        contractAddress
        name
      }
    }
  }
`;

// Cache for individual NFT fetches
const nftCache = new Map<string, { nft: NFT; timestamp: number }>();
const NFT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedNFT(contract: string, tokenId: string): NFT | null {
  const key = `${contract}-${tokenId}`;
  const cached = nftCache.get(key);
  if (cached && Date.now() - cached.timestamp < NFT_CACHE_TTL) {
    return cached.nft;
  }
  return null;
}

function setCachedNFT(contract: string, tokenId: string, nft: NFT) {
  const key = `${contract}-${tokenId}`;
  nftCache.set(key, { nft, timestamp: Date.now() });
}

export async function fetchNFTById(
  contractAddress: string,
  tokenId: string
): Promise<NFT | null> {
  // Check cache first
  const cached = getCachedNFT(contractAddress, tokenId);
  if (cached) return cached;

  try {
    const data = await client.request<{
      token: {
        tokenId: string;
        name: string;
        description: string;
        media: {
          url: string;
          type: string;
          visualAssets?: {
            lg?: { url: string };
            md?: { url: string };
            sm?: { url: string };
          };
        } | null;
        metadata: Record<string, unknown> | null;
        collection: { contractAddress: string; name: string };
      } | null;
    }>(TOKEN_BY_ID_QUERY, { collectionAddr: contractAddress, tokenId });

    if (!data.token) return null;

    const rawMediaType = data.token.media?.type || '';
    const animationUrl = data.token.metadata?.animation_url as string | undefined;

    // Determine media type
    let mediaType: 'image' | 'video' | 'audio' = 'image';
    let audioUrl: string | undefined;
    let videoUrl: string | undefined;

    if (rawMediaType.includes('audio')) {
      mediaType = 'audio';
      audioUrl = data.token.media?.url;
    } else if (rawMediaType.includes('video')) {
      mediaType = 'video';
      videoUrl = data.token.media?.url || animationUrl;
    } else if (animationUrl?.includes('.mp4') || animationUrl?.includes('.webm')) {
      mediaType = 'video';
      videoUrl = animationUrl;
    }

    // Get image URL - check multiple sources
    let imageUrl = '';

    // For audio/html/unknown types, media.url is not the image
    const isNonImageMedia = rawMediaType.includes('audio') || rawMediaType.includes('html') || rawMediaType === 'unknown';
    if (isNonImageMedia) {
      if (data.token.metadata?.image) {
        imageUrl = data.token.metadata.image as string;
      } else if (data.token.metadata?.image_data) {
        imageUrl = data.token.metadata.image_data as string;
      }
    }

    // Standard image from media.url (only for actual image types)
    if (!imageUrl && data.token.media?.url && !isNonImageMedia) {
      imageUrl = data.token.media.url;
    }

    // Fallbacks
    if (!imageUrl && data.token.metadata?.image) {
      imageUrl = data.token.metadata.image as string;
    }
    if (!imageUrl && data.token.metadata?.image_data) {
      imageUrl = data.token.metadata.image_data as string;
    }

    // Final fallback: use visualAssets if available
    if (!imageUrl && data.token.media?.visualAssets) {
      const va = data.token.media.visualAssets;
      imageUrl = va.lg?.url || va.md?.url || va.sm?.url || '';
    }

    // Check if this is an animated image (GIF, APNG, animated WebP)
    const lowerImageUrl = imageUrl.toLowerCase();
    const lowerMediaType = rawMediaType.toLowerCase();
    const isAnimatedImage =
      lowerImageUrl.includes('.gif') ||
      lowerMediaType.includes('gif') ||
      lowerImageUrl.includes('.apng') ||
      lowerMediaType.includes('apng') ||
      (animationUrl && (animationUrl.toLowerCase().includes('.gif') || animationUrl.toLowerCase().includes('.apng')));

    // Get optimized thumbnail from visualAssets - skip for animated images and audio NFTs
    const skipThumbnail = isAnimatedImage || isNonImageMedia;
    const thumbnail = skipThumbnail ? undefined : (data.token.media?.visualAssets?.sm?.url || data.token.media?.visualAssets?.md?.url);

    // For GIF animation_url, use it as the image instead
    let finalImageUrl = imageUrl;
    if (animationUrl && (animationUrl.toLowerCase().includes('.gif') || animationUrl.toLowerCase().includes('.apng'))) {
      finalImageUrl = animationUrl;
    }

    const nft: NFT = {
      tokenId: data.token.tokenId,
      name: data.token.name || `#${data.token.tokenId}`,
      description: data.token.description || '',
      image: finalImageUrl.startsWith('data:') ? finalImageUrl : transformIpfsUrl(finalImageUrl),
      thumbnail: thumbnail || undefined,
      animationUrl: videoUrl ? transformIpfsUrl(videoUrl) : (animationUrl && !animationUrl.toLowerCase().includes('.gif') && !animationUrl.toLowerCase().includes('.apng') ? transformIpfsUrl(animationUrl) : undefined),
      audioUrl: audioUrl ? transformIpfsUrl(audioUrl) : undefined,
      mediaType,
      collection: data.token.collection,
    };

    // Cache the result
    setCachedNFT(contractAddress, tokenId, nft);
    return nft;
  } catch (error) {
    console.error('Error fetching NFT:', error);
    return null;
  }
}

// Fetch multiple NFTs in parallel (for gallery thumbnails)
export async function fetchNFTsById(
  nftIds: { contract: string; token_id: string }[]
): Promise<(NFT | null)[]> {
  return Promise.all(
    nftIds.map(({ contract, token_id }) => fetchNFTById(contract, token_id))
  );
}
