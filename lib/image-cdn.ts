import { createHmac } from 'crypto';

const KEY = process.env.SERVICES_IMAGE_KEY || '';
const SALT = process.env.SERVICES_IMAGE_SALT || '';
const ENDPOINT = process.env.SERVICES_IMAGE_ENDPOINT || 'https://i.rscdn.art';

function hexDecode(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

function sign(salt: string, target: string, secret: string): string {
  const hmac = createHmac('sha256', hexDecode(secret));
  hmac.update(hexDecode(salt));
  hmac.update(target);
  return hmac.digest('base64url');
}

function isURIEncoded(str: string): boolean {
  return /%[0-9a-f]{2}/i.test(str);
}

function signPath(path: string): string | null {
  if (!SALT || !KEY) {
    return null;
  }

  let decodedPath = path;
  while (isURIEncoded(decodedPath)) {
    decodedPath = decodeURI(decodedPath);
  }

  const encodedPath = encodeURI(decodedPath);
  const signature = sign(SALT, encodedPath, KEY);
  return `${signature}${encodedPath}`;
}

export type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<ImageSize, number> = {
  xs: 128,
  sm: 256,
  md: 512,
  lg: 1024,
  xl: 2048,
};

/**
 * Create a signed CDN URL for an image
 * This should only be called server-side (API routes, server components, server actions)
 */
export function createCdnUrl(
  url: string,
  size: ImageSize = 'md',
  format: 'jpg' | 'webp' = 'jpg'
): string {
  if (!url) return '';

  // Don't process data URLs
  if (url.startsWith('data:')) return url;

  // Extract IPFS URL if needed
  let sourceUrl = url;
  if (url.includes('ipfs.io/ipfs/')) {
    sourceUrl = 'ipfs://' + url.split('ipfs.io/ipfs/')[1];
  } else if (url.includes('/ipfs/')) {
    sourceUrl = 'ipfs://' + url.split('/ipfs/')[1];
  }

  const width = SIZE_MAP[size];

  let path = `/f:${format}/resize:fit:${width}::/dpr:2/plain/${sourceUrl}`;

  const signedPath = signPath(path);

  if (signedPath) {
    return `${ENDPOINT}/${signedPath}`;
  }

  // Fallback to ipfs.io if signing fails
  if (sourceUrl.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${sourceUrl.replace('ipfs://', '')}`;
  }

  return url;
}

/**
 * Check if CDN is configured
 */
export function isCdnConfigured(): boolean {
  return !!(KEY && SALT && ENDPOINT);
}
