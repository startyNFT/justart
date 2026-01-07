'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChain } from '@cosmos-kit/react';
import { NFTGrid } from '@/components/NFTGrid';
import { NFTSelector } from '@/components/NFTSelector';
import { SortableNFTGrid } from '@/components/SortableNFTGrid';
import { SizePicker, ArrangementPicker } from '@/components/LayoutPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { fetchNFTPage, fetchNFTsParallel, PAGE_SIZE, type NFT } from '@/lib/stargaze';
import { supabase } from '@/lib/supabase';
import { generateSlug } from '@/lib/utils';
import { TREASURY_WALLET } from '@/lib/constants';
import { fetchPaymentsToTreasury, calculateEffectivePrice, JUSTART_MEMO_PREFIX } from '@/lib/cosmos';
import type { SizeType, ArrangementType } from '@/lib/constants';
import { Wallet, Loader2, ArrowRight, ArrowLeft, Layers, Gift, Lock, Unlock } from 'lucide-react';

type Step = 'select' | 'arrange' | 'customize';

const ITEMS_PER_PAGE = PAGE_SIZE; // Use larger batch size for faster loading

export default function CreateGallery() {
  const router = useRouter();
  const { address, isWalletConnected, openView, getSigningStargateClient } = useChain('stargaze');

  const [step, setStep] = useState<Step>('select');
  const [allNfts, setAllNfts] = useState<NFT[]>([]); // All NFTs loaded
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [creating, setCreating] = useState(false);
  const [hideDuplicates, setHideDuplicates] = useState(true);

  const [selectedNfts, setSelectedNfts] = useState<NFT[]>([]);
  const [size, setSize] = useState<SizeType>('medium');
  const [arrangement, setArrangement] = useState<ArrangementType>('grid');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showInfo, setShowInfo] = useState(true);
  const [lockLayout, setLockLayout] = useState(false);
  const [nftDescriptions, setNftDescriptions] = useState<Record<string, string>>({});

  const [galleryCount, setGalleryCount] = useState(0);
  const [paidSlots, setPaidSlots] = useState(1); // First gallery is always free
  const [checkingPayments, setCheckingPayments] = useState(false);
  const [hasActiveFilter, setHasActiveFilter] = useState(false);

  // Stable callback for filter state changes
  const handleFilterActive = useCallback((active: boolean) => {
    setHasActiveFilter(active);
  }, []);

  // Calculate effective price considering past payments
  const effectivePrice = calculateEffectivePrice(galleryCount, paidSlots);
  const hasCredit = paidSlots > galleryCount;

  const selectedIds = new Set(
    selectedNfts.map((nft) => `${nft.collection.contractAddress}-${nft.tokenId}`)
  );

  // Load ALL NFTs with parallel fetching for blazing fast speed
  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    async function loadAllNfts() {
      setLoading(true);
      setAllNfts([]);
      setLoadingProgress('Loading NFTs...');

      // First, get total count and first batch
      const firstResult = await fetchNFTPage(address!, 0, ITEMS_PER_PAGE);

      if (cancelled) return;

      if (firstResult.nfts.length === 0) {
        // Retry once if no results
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResult = await fetchNFTPage(address!, 0, ITEMS_PER_PAGE);
        if (retryResult.nfts.length === 0) {
          setLoading(false);
          setLoadingProgress('');
          return;
        }
        setAllNfts(retryResult.nfts);
        if (!retryResult.hasMore) {
          setLoading(false);
          setLoadingProgress('');
          return;
        }
      } else {
        setAllNfts(firstResult.nfts);
      }

      const total = firstResult.total;
      const firstBatchCount = firstResult.nfts.length;

      // If there's more to load, use parallel fetching
      if (firstBatchCount < total && !cancelled) {
        setLoadingProgress(`Loading ${firstBatchCount} / ${total} NFTs...`);

        // Fetch remaining pages in parallel (3 at a time for speed)
        const remainingNfts = await fetchNFTsParallel(address!, total, firstBatchCount, 3);

        if (!cancelled) {
          setAllNfts(prev => [...prev, ...remainingNfts]);
        }
      }

      setLoading(false);
      setLoadingProgress('');

      // Load user data and check payments in parallel
      const [userResult, paymentInfo] = await Promise.all([
        supabase
          .from('users')
          .select('id')
          .eq('wallet_address', address!)
          .single(),
        fetchPaymentsToTreasury(address!).catch(err => {
          console.error('Error checking past payments:', err);
          return { paidSlots: 1 };
        })
      ]);

      if (userResult.data) {
        const { count } = await supabase
          .from('galleries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userResult.data.id);
        setGalleryCount(count || 0);
      }

      setPaidSlots(paymentInfo.paidSlots);
    }

    loadAllNfts();

    return () => {
      cancelled = true;
    };
  }, [address]);

  // Deduplicate open editions (same collection + same image = duplicate)
  const deduplicatedNfts = useMemo(() => {
    if (!hideDuplicates) {
      return allNfts;
    }

    const seen = new Map<string, NFT>();
    for (const nft of allNfts) {
      const key = `${nft.collection.contractAddress}-${nft.image}`;
      if (!seen.has(key)) {
        seen.set(key, nft);
      }
    }

    return Array.from(seen.values());
  }, [allNfts, hideDuplicates]);

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

      // Only charge if they haven't already paid (effectivePrice considers past payments)
      if (effectivePrice > 0) {
        const client = await getSigningStargateClient();
        const amount = { denom: 'ustars', amount: String(effectivePrice * 1_000_000) };
        const memo = `${JUSTART_MEMO_PREFIX}-${Date.now()}`;
        const result = await client.sendTokens(
          address,
          TREASURY_WALLET,
          [amount],
          { amount: [{ denom: 'ustars', amount: '0' }], gas: '200000' },
          memo
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

      // Build nft_ids with descriptions
      const nftIds = selectedNfts.map((nft) => {
        const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
        const desc = nftDescriptions[key];
        return {
          contract: nft.collection.contractAddress,
          token_id: nft.tokenId,
          ...(desc ? { description: desc } : {}),
        };
      });

      const slug = generateSlug();
      const layout = `${size}-${arrangement}`;

      // Try with lock_layout first, fallback without if column doesn't exist
      const insertData: Record<string, unknown> = {
        user_id: userId,
        slug,
        name: name.trim(),
        description: description.trim() || null,
        background_color: backgroundColor,
        layout,
        nft_ids: nftIds,
        payment_tx_hash: txHash,
        show_info: showInfo,
      };

      let result = await supabase.from('galleries').insert({ ...insertData, lock_layout: lockLayout });

      if (result.error?.message?.includes('lock_layout')) {
        // Column doesn't exist, try without it
        result = await supabase.from('galleries').insert(insertData);
      }

      if (result.error) throw result.error;

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

  // Show the page even while loading - loading state is handled inline
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
            <div className="flex items-center gap-3">
              <p className="text-sm text-neutral-400">
                {deduplicatedNfts.length > 0
                  ? `${deduplicatedNfts.length} NFTs`
                  : loading
                  ? 'Loading...'
                  : 'No NFTs found'}
                {selectedNfts.length > 0 && ` • ${selectedNfts.length} selected`}
              </p>
              {loading && loadingProgress && (
                <span className="text-xs text-neutral-400">{loadingProgress}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHideDuplicates(!hideDuplicates)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  hideDuplicates
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
                title={hideDuplicates ? 'Show all NFTs' : 'Hide duplicate open editions'}
              >
                <Layers size={14} />
                <span className="hidden sm:inline">{hideDuplicates ? 'Unique' : 'All'}</span>
              </button>
              <button
                onClick={() => setStep('arrange')}
                disabled={selectedNfts.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Arrange
                <ArrowRight size={18} />
              </button>
            </div>
          </div>

          {loading && allNfts.length === 0 ? (
            <div className="py-20 text-center">
              <Loader2 size={32} className="mx-auto text-neutral-400 animate-spin mb-4" />
              <p className="text-neutral-400">{loadingProgress || 'Loading your NFTs...'}</p>
            </div>
          ) : (
            <NFTSelector
              nfts={deduplicatedNfts}
              selectedIds={selectedIds}
              onSelect={handleSelectNft}
              useThumbnails
              onFilterActive={handleFilterActive}
              loading={loading}
              loadingProgress={loadingProgress}
            />
          )}
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

          {/* Per-NFT descriptions for presentation mode */}
          {arrangement === 'presentation' && selectedNfts.length > 0 && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-lg font-medium mb-4">NFT Descriptions</h3>
              <p className="text-sm text-neutral-500 mb-6">
                Add personal descriptions or stories for each NFT. These will appear during the presentation.
              </p>
              <div className="space-y-4">
                {selectedNfts.map((nft, index) => {
                  const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
                  return (
                    <div key={key} className="flex gap-4 items-start p-4 bg-neutral-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <span className="text-sm text-neutral-400 mr-2">{index + 1}.</span>
                        <img
                          src={nft.thumbnail || nft.image}
                          alt=""
                          className="w-16 h-16 object-cover rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-2">{nft.collection.name}</p>
                        <textarea
                          value={nftDescriptions[key] || ''}
                          onChange={(e) => setNftDescriptions(prev => ({
                            ...prev,
                            [key]: e.target.value
                          }))}
                          placeholder="Add a description, story, or context for this NFT..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                Size
              </label>
              <SizePicker value={size} onChange={setSize} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Arrangement
              </label>
              <ArrangementPicker value={arrangement} onChange={setArrangement} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Background Color
              </label>
              <ColorPicker value={backgroundColor} onChange={setBackgroundColor} />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Gallery Info Visibility
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowInfo(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showInfo
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Always Show
                </button>
                <button
                  onClick={() => setShowInfo(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !showInfo
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Show on Hover
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Controls whether gallery title, owner, and stats are visible by default or only on hover
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Layout Lock
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setLockLayout(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !lockLayout
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Unlock size={14} />
                  Unlocked
                </button>
                <button
                  onClick={() => setLockLayout(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    lockLayout
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  <Lock size={14} />
                  Locked
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                When locked, visitors cannot change the size or arrangement of your gallery
              </p>
            </div>

            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor }}
            >
              <p className="text-sm text-neutral-500 mb-3">Preview</p>
              <NFTGrid nfts={selectedNfts.slice(0, 6)} size={size} arrangement={arrangement} />
            </div>

            <div className="pt-4 border-t border-neutral-100">
              {hasCredit && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg text-green-700">
                  <Gift size={18} />
                  <span className="text-sm">
                    You have credit from a previous payment - this gallery is free!
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-600">Cost</span>
                <div className="text-right">
                  {checkingPayments ? (
                    <span className="text-neutral-400 text-sm">Checking payments...</span>
                  ) : effectivePrice === 0 ? (
                    <span className="font-medium text-green-600">Free</span>
                  ) : (
                    <span className="font-medium">{effectivePrice} STARS</span>
                  )}
                </div>
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
                    {effectivePrice > 0 && <span className="text-neutral-400">({effectivePrice} STARS)</span>}
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
