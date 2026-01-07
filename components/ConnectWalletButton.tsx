'use client';

import { useChainWallet } from '@cosmos-kit/react';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export function ConnectWalletButton({ className, children }: Props) {
  const keplrWallet = useChainWallet('stargaze', 'keplr-extension', false);
  const leapWallet = useChainWallet('stargaze', 'leap-extension', false);

  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [failedWallets, setFailedWallets] = useState<Set<string>>(new Set());

  const keplrLogo = keplrWallet.wallet?.logo;
  const leapLogo = leapWallet.wallet?.logo;

  // Check if wallets are available
  const keplrAvailable = !keplrWallet.isWalletNotExist && !failedWallets.has('keplr');
  const leapAvailable = !leapWallet.isWalletNotExist && !failedWallets.has('leap');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowWalletPicker(false);
      }
    }
    if (showWalletPicker) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showWalletPicker]);

  const handleConnect = async (walletType: 'keplr' | 'leap') => {
    setConnecting(walletType);
    try {
      if (walletType === 'keplr') {
        await keplrWallet.connect();
      } else {
        await leapWallet.connect();
      }
      setShowWalletPicker(false);
    } catch (error) {
      console.error('Failed to connect:', error);
      setFailedWallets(prev => new Set(prev).add(walletType));
    } finally {
      setConnecting(null);
    }
  };

  const closeModal = () => {
    setShowWalletPicker(false);
  };

  const modal = showWalletPicker && mounted ? createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-neutral-100">
            <h2 className="text-lg font-medium text-neutral-900">Connect Wallet</h2>
            <button
              onClick={closeModal}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <button
              onClick={() => handleConnect('keplr')}
              disabled={connecting !== null || !keplrAvailable}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                !keplrAvailable
                  ? 'opacity-40 cursor-not-allowed'
                  : connecting === 'keplr'
                  ? 'border-neutral-300 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
              } disabled:opacity-40`}
            >
              {typeof keplrLogo === 'string' ? (
                <img src={keplrLogo} alt="Keplr" className="w-10 h-10 rounded-lg" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#050525] flex items-center justify-center text-white font-bold">K</div>
              )}
              <div className="flex flex-col items-start">
                <span className="text-base font-medium text-neutral-900">Keplr</span>
                {!keplrAvailable && (
                  <span className="text-xs text-neutral-400">Not available</span>
                )}
              </div>
              {connecting === 'keplr' && (
                <div className="ml-auto w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              )}
            </button>
            <button
              onClick={() => handleConnect('leap')}
              disabled={connecting !== null || !leapAvailable}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                !leapAvailable
                  ? 'opacity-40 cursor-not-allowed'
                  : connecting === 'leap'
                  ? 'border-neutral-300 bg-neutral-50'
                  : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
              } disabled:opacity-40`}
            >
              {typeof leapLogo === 'string' ? (
                <img src={leapLogo} alt="Leap" className="w-10 h-10 rounded-lg" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#32D583] flex items-center justify-center text-white font-bold">L</div>
              )}
              <div className="flex flex-col items-start">
                <span className="text-base font-medium text-neutral-900">Leap</span>
                {!leapAvailable && (
                  <span className="text-xs text-neutral-400">Not available</span>
                )}
              </div>
              {connecting === 'leap' && (
                <div className="ml-auto w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setShowWalletPicker(true)}
        className={className || "px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"}
      >
        {children || 'Connect Wallet'}
      </button>
      {modal}
    </>
  );
}
