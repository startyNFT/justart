'use client';

import { useState, useEffect, useCallback } from 'react';

type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// In-memory cache for signed URLs (persists across component re-renders)
const urlCache = new Map<string, string>();

/**
 * Hook to get a CDN-signed URL for an image
 * Caches results to avoid repeated API calls
 */
export function useCdnUrl(
  originalUrl: string | undefined,
  size: ImageSize = 'md'
): { url: string; loading: boolean } {
  // Initialize with originalUrl so image shows immediately
  const [signedUrl, setSignedUrl] = useState<string>(originalUrl || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!originalUrl) {
      setSignedUrl('');
      return;
    }

    // Check cache first
    const cacheKey = `${originalUrl}-${size}`;
    const cached = urlCache.get(cacheKey);
    if (cached) {
      setSignedUrl(cached);
      return;
    }

    // Data URLs don't need signing
    if (originalUrl.startsWith('data:')) {
      setSignedUrl(originalUrl);
      return;
    }

    // If it's already a CDN URL, use it directly
    if (originalUrl.includes('i.rscdn.art') || originalUrl.includes('i.stargaze-apis.com')) {
      setSignedUrl(originalUrl);
      urlCache.set(cacheKey, originalUrl);
      return;
    }

    // Show original URL immediately while we fetch CDN URL
    setSignedUrl(originalUrl);

    // Convert to IPFS URL format for the API
    let ipfsUrl = originalUrl;
    if (originalUrl.includes('ipfs.io/ipfs/')) {
      ipfsUrl = 'ipfs://' + originalUrl.split('ipfs.io/ipfs/')[1];
    } else if (originalUrl.includes('/ipfs/') && !originalUrl.startsWith('ipfs://')) {
      ipfsUrl = 'ipfs://' + originalUrl.split('/ipfs/')[1];
    }

    // Fetch signed URL from API (upgrades to CDN when ready)
    setLoading(true);
    fetch(`/api/image?url=${encodeURIComponent(ipfsUrl)}&size=${size}`)
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          urlCache.set(cacheKey, data.url);
          setSignedUrl(data.url);
        }
        // Keep original URL if CDN fails (already set above)
      })
      .catch(() => {
        // Keep original URL on error (already set above)
      })
      .finally(() => {
        setLoading(false);
      });
  }, [originalUrl, size]);

  return { url: signedUrl || originalUrl || '', loading };
}

/**
 * Batch fetch CDN URLs for multiple images
 * More efficient than individual calls
 */
export async function batchGetCdnUrls(
  urls: string[],
  size: ImageSize = 'md'
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uncached: string[] = [];

  // Check cache first
  for (const url of urls) {
    const cacheKey = `${url}-${size}`;
    const cached = urlCache.get(cacheKey);
    if (cached) {
      result.set(url, cached);
    } else if (url && !url.startsWith('data:')) {
      uncached.push(url);
    }
  }

  // Fetch uncached URLs in parallel (limit concurrency)
  const BATCH_SIZE = 10;
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (url) => {
        let ipfsUrl = url;
        if (url.includes('ipfs.io/ipfs/')) {
          ipfsUrl = 'ipfs://' + url.split('ipfs.io/ipfs/')[1];
        } else if (url.includes('/ipfs/') && !url.startsWith('ipfs://')) {
          ipfsUrl = 'ipfs://' + url.split('/ipfs/')[1];
        }

        try {
          const res = await fetch(`/api/image?url=${encodeURIComponent(ipfsUrl)}&size=${size}`);
          const data = await res.json();
          if (data.url) {
            const cacheKey = `${url}-${size}`;
            urlCache.set(cacheKey, data.url);
            result.set(url, data.url);
          }
        } catch {
          result.set(url, url); // Fallback to original
        }
      })
    );
  }

  return result;
}
