import { createCdnUrl, isCdnConfigured, type ImageSize } from '@/lib/image-cdn';
import { NextRequest, NextResponse } from 'next/server';

// API route to get signed image URL
// Keys never leave the server - client calls this endpoint to get signed URLs
export async function GET(request: NextRequest) {
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

  return NextResponse.json({
    url: signedUrl,
    cached: true
  });
}
