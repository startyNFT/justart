import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

export function generateSlug(): string {
  return nanoid();
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function calculateGalleryPrice(galleryCount: number): number {
  if (galleryCount === 0) return 0;
  return galleryCount * 1000;
}

export function getStargazeNFTUrl(contractAddress: string, tokenId: string): string {
  return `https://www.stargaze.zone/m/${contractAddress}/${tokenId}`;
}
