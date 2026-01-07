'use client';

import { useChain, useChainWallet } from '@cosmos-kit/react';
import { User, LogOut, X } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface WalletButtonProps {
  variant?: 'default' | 'dark' | 'light';
}

export function WalletButton({ variant = 'default' }: WalletButtonProps) {
  const { address, disconnect, isWalletConnected } = useChain('stargaze');
  const keplrWallet = useChainWallet('stargaze', 'keplr-extension', false);
  const leapWallet = useChainWallet('stargaze', 'leap-extension', false);

  const [showMenu, setShowMenu] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [failedWallets, setFailedWallets] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  // Get logos from wallet info
  const keplrLogo = keplrWallet.wallet?.logo;
  const leapLogo = leapWallet.wallet?.logo;

  // Check if wallets are available
  const keplrAvailable = !keplrWallet.isWalletNotExist && !failedWallets.has('keplr');
  const leapAvailable = !leapWallet.isWalletNotExist && !failedWallets.has('leap');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowWalletPicker(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

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
      // Mark wallet as failed
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-100">
            <h2 className="text-lg font-medium text-neutral-900">Connect Wallet</h2>
            <button
              onClick={closeModal}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Wallet Options */}
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

  // Variant-based styling
  const getButtonClasses = () => {
    if (variant === 'dark') {
      return isWalletConnected
        ? 'p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors'
        : 'p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors';
    } else if (variant === 'light') {
      return isWalletConnected
        ? 'p-2 rounded-lg bg-black/10 text-neutral-900 hover:bg-black/20 transition-colors'
        : 'p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-black/5 transition-colors';
    }
    // default
    return isWalletConnected
      ? 'p-2 rounded-lg bg-neutral-100 text-neutral-900 transition-colors'
      : 'p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors';
  };

  const getMenuClasses = () => {
    if (variant === 'dark') {
      return 'absolute right-0 top-full mt-2 bg-neutral-900 rounded-lg shadow-lg border border-white/10 py-1 min-w-[180px] z-50';
    } else if (variant === 'light') {
      return 'absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-black/10 py-1 min-w-[180px] z-50';
    }
    return 'absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-neutral-100 py-1 min-w-[180px] z-50';
  };

  const getMenuTextClasses = () => {
    if (variant === 'dark') {
      return {
        address: 'px-3 py-2 text-sm text-white/60 border-b border-white/10',
        button: 'w-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 flex items-center gap-2',
      };
    } else if (variant === 'light') {
      return {
        address: 'px-3 py-2 text-sm text-neutral-500 border-b border-black/10',
        button: 'w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-black/5 flex items-center gap-2',
      };
    }
    return {
      address: 'px-3 py-2 text-sm text-neutral-500 border-b border-neutral-100',
      button: 'w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2',
    };
  };

  if (!isWalletConnected) {
    return (
      <>
        <button
          onClick={() => setShowWalletPicker(true)}
          className={getButtonClasses()}
          title="Connect Wallet"
        >
          <User size={20} strokeWidth={1.5} />
        </button>
        {modal}
      </>
    );
  }

  const menuTextClasses = getMenuTextClasses();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={getButtonClasses()}
        title={address}
      >
        <User size={20} strokeWidth={1.5} />
      </button>

      {showMenu && (
        <div className={getMenuClasses()}>
          <div className={menuTextClasses.address}>
            {truncateAddress(address || '')}
          </div>
          <button
            onClick={() => {
              disconnect();
              setShowMenu(false);
            }}
            className={menuTextClasses.button}
          >
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
