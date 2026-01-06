'use client';

import { useEffect, useState } from 'react';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { LayoutPicker } from '@/components/LayoutPicker';
import { fetchUserNFTs, type NFT } from '@/lib/stargaze';
import type { LayoutType } from '@/lib/constants';
import { Wallet } from 'lucide-react';

export default function MyNFTs() {
  const { address, isWalletConnected, openView } = useChain('stargaze');
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [layout, setLayout] = useState<LayoutType>('medium');

  useEffect(() => {
    if (!address) return;

    async function loadNFTs() {
      setLoading(true);
      const { nfts } = await fetchUserNFTs(address);
      setNfts(nfts);
      setLoading(false);
    }

    loadNFTs();
  }, [address]);

  if (!isWalletConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Wallet size={48} className="mx-auto text-neutral-300 mb-4" strokeWidth={1} />
        <p className="text-neutral-400 mb-4">Connect your wallet to see your NFTs</p>
        <button
          onClick={() => openView()}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-end mb-6">
          <LayoutPicker value={layout} onChange={setLayout} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-end mb-6">
        <LayoutPicker value={layout} onChange={setLayout} />
      </div>
      <NFTGrid nfts={nfts} layout={layout} />
    </div>
  );
}
