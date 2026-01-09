import { createCdnUrl, isCdnConfigured, type ImageSize } from '@/lib/image-cdn';
import { NextRequest, NextResponse } from 'next/server';
import { lenientRateLimiter, getClientIdentifier, createRateLimitHeaders } from '@/lib/rate-limit';
import { RATE_LIMIT_IMAGE_ENDPOINT } from '@/lib/constants';

// API route to get signed image URL
// Keys never leave the server - client calls this endpoint to get signed URLs
// Rate limited to 1000 requests per minute for seamless background NFT loading
export async function GET(request: NextRequest) {
  // Apply rate limiting - high limit to support users with large NFT collections
  const identifier = getClientIdentifier(request);
  const rateLimit = lenientRateLimiter.check(identifier, RATE_LIMIT_IMAGE_ENDPOINT);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          ...createRateLimitHeaders(rateLimit),
          'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const size = (searchParams.get('size') || 'md') as ImageSize;
  const format = (searchParams.get('format') || 'jpg') as 'jpg' | 'webp';

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  if (!isCdnConfigured()) {
    // Fallback to ipfs.io if CDN not configured
    let fallbackUrl = url;
    if (url.startsWith('ipfs://')) {
      fallbackUrl = `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`;
    }
    return NextResponse.json({ url: fallbackUrl });
  }

  const signedUrl = createCdnUrl(url, size, format);

  return NextResponse.json(
    {
      url: signedUrl,
      cached: true,
    },
    {
      headers: createRateLimitHeaders(rateLimit),
    }
  );
}
