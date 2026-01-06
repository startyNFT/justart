'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { SortableNFTGrid } from '@/components/SortableNFTGrid';
import { LayoutPicker } from '@/components/LayoutPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { fetchUserNFTs, type NFT } from '@/lib/stargaze';
import { supabase } from '@/lib/supabase';
import { calculateGalleryPrice, generateSlug } from '@/lib/utils';
import { TREASURY_WALLET } from '@/lib/constants';
import type { LayoutType } from '@/lib/constants';
import { Wallet, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = 'select' | 'arrange' | 'customize';

export default function CreateGallery() {
  const router = useRouter();
  const { address, isWalletConnected, openView, getSigningStargateClient } = useChain('stargaze');

  const [step, setStep] = useState<Step>('select');
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [selectedNfts, setSelectedNfts] = useState<NFT[]>([]);
  const [layout, setLayout] = useState<LayoutType>('medium');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [galleryCount, setGalleryCount] = useState(0);
  const price = calculateGalleryPrice(galleryCount);

  const selectedIds = new Set(
    selectedNfts.map((nft) => `${nft.collection.contractAddress}-${nft.tokenId}`)
  );

  useEffect(() => {
    if (!address) return;

    async function load() {
      setLoading(true);

      const [nftResult, userResult] = await Promise.all([
        fetchUserNFTs(address),
        supabase.from('users').select('id').eq('wallet_address', address).single(),
      ]);

      setNfts(nftResult.nfts);

      if (userResult.data) {
        const { count } = await supabase
          .from('galleries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userResult.data.id);
        setGalleryCount(count || 0);
      }

      setLoading(false);
    }

    load();
  }, [address]);

  const handleSelectNft = (nft: NFT) => {
    const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
    if (selectedIds.has(key)) {
      setSelectedNfts(selectedNfts.filter(
        (n) => `${n.collection.contractAddress}-${n.tokenId}` !== key
      ));
    } else {
      setSelectedNfts([...selectedNfts, nft]);
    }
  };

  const handleRemoveNft = (nft: NFT) => {
    const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
    setSelectedNfts(selectedNfts.filter(
      (n) => `${n.collection.contractAddress}-${n.tokenId}` !== key
    ));
  };

  const handleCreate = async () => {
    if (!address || selectedNfts.length === 0 || !name.trim()) return;

    setCreating(true);

    try {
      let txHash: string | null = null;

      if (price > 0) {
        const client = await getSigningStargateClient();
        const amount = { denom: 'ustars', amount: String(price * 1_000_000) };
        const result = await client.sendTokens(
          address,
          TREASURY_WALLET,
          [amount],
          { amount: [{ denom: 'ustars', amount: '0' }], gas: '200000' }
        );
        txHash = result.transactionHash;
      }

      let userId: string;
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', address)
        .single();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({ wallet_address: address })
          .select('id')
          .single();

        if (error || !newUser) throw new Error('Failed to create user');
        userId = newUser.id;
      }

      const nftIds = selectedNfts.map((nft) => ({
        contract: nft.collection.contractAddress,
        token_id: nft.tokenId,
      }));

      const slug = generateSlug();

      const { error } = await supabase.from('galleries').insert({
        user_id: userId,
        slug,
        name: name.trim(),
        description: description.trim() || null,
        background_color: backgroundColor,
        layout,
        nft_ids: nftIds,
        payment_tx_hash: txHash,
      });

      if (error) throw error;

      router.push(`/g/${slug}`);
    } catch (error) {
      console.error('Error creating gallery:', error);
      alert('Failed to create gallery. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!isWalletConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Wallet size={48} className="mx-auto text-neutral-300 mb-4" strokeWidth={1} />
        <p className="text-neutral-400 mb-4">Connect your wallet to create a gallery</p>
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
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 size={32} className="mx-auto text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {['select', 'arrange', 'customize'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-neutral-900 text-white'
                  : i < ['select', 'arrange', 'customize'].indexOf(step)
                  ? 'bg-neutral-200 text-neutral-600'
                  : 'bg-neutral-100 text-neutral-400'
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && <div className="w-8 h-px bg-neutral-200" />}
          </div>
        ))}
      </div>

      {step === 'select' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-neutral-500">
              {selectedNfts.length} selected
            </p>
            <button
              onClick={() => setStep('arrange')}
              disabled={selectedNfts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Arrange
              <ArrowRight size={18} />
            </button>
          </div>
          <NFTGrid
            nfts={nfts}
            layout="medium"
            selectable
            selectedIds={selectedIds}
            onSelect={handleSelectNft}
          />
        </>
      )}

      {step === 'arrange' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep('select')}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <p className="text-neutral-500 text-sm">
              Drag to reorder
            </p>
            <button
              onClick={() => setStep('customize')}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Next: Customize
              <ArrowRight size={18} />
            </button>
          </div>
          <SortableNFTGrid
            nfts={selectedNfts}
            onReorder={setSelectedNfts}
            onRemove={handleRemoveNft}
          />
        </>
      )}

      {step === 'customize' && (
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setStep('arrange')}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 mb-6"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Gallery Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Collection"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A collection of my favorite pieces..."
                rows={3}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Layout
              </label>
              <LayoutPicker value={layout} onChange={setLayout} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Background Color
              </label>
              <ColorPicker value={backgroundColor} onChange={setBackgroundColor} />
            </div>

            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor }}
            >
              <p className="text-sm text-neutral-500 mb-3">Preview</p>
              <NFTGrid nfts={selectedNfts.slice(0, 6)} layout={layout} />
            </div>

            <div className="pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-600">Cost</span>
                <span className="font-medium">
                  {price === 0 ? 'Free' : `${price} STARS`}
                </span>
              </div>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Gallery
                    {price > 0 && <span className="text-neutral-400">({price} STARS)</span>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
