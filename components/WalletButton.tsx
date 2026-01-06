'use client';

import { useChain } from '@cosmos-kit/react';
import { User, LogOut } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

export function WalletButton() {
  const { address, connect, disconnect, isWalletConnected, openView } = useChain('stargaze');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isWalletConnected) {
    return (
      <button
        onClick={() => openView()}
        className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
        title="Connect Wallet"
      >
        <User size={20} strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 rounded-lg bg-neutral-100 text-neutral-900 transition-colors"
        title={address}
      >
        <User size={20} strokeWidth={1.5} />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-neutral-100 py-1 min-w-[180px]">
          <div className="px-3 py-2 text-sm text-neutral-500 border-b border-neutral-100">
            {truncateAddress(address || '')}
          </div>
          <button
            onClick={() => {
              disconnect();
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
          >
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
