import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs-gw.stargaze-apis.com',
      },
      {
        protocol: 'https',
        hostname: '*.stargaze-apis.com',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: '**.ipfs.nftstorage.link',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
      },
      {
        protocol: 'https',
        hostname: '**.pinata.cloud',
      },
    ],
  },
  // Transpile cosmos-kit packages for proper bundling
  transpilePackages: [
    '@cosmos-kit/react',
    '@cosmos-kit/core',
    '@cosmos-kit/keplr',
    '@cosmos-kit/leap',
    '@cosmos-kit/walletconnect',
    'chain-registry',
    '@chain-registry/types',
  ],
};

export default nextConfig;
