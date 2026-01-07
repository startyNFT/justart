'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Image,
  FolderOpen,
  Plus,
  User,
  Settings,
} from 'lucide-react';
import { WalletButton } from './WalletButton';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/my-nfts', icon: Image, label: 'My NFTs' },
  { href: '/my-galleries', icon: FolderOpen, label: 'My Galleries' },
  { href: '/create', icon: Plus, label: 'Create' },
];

export function Header() {
  const pathname = usePathname();

  // Hide header on gallery view pages
  if (pathname.startsWith('/g/')) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-medium tracking-tight">
          justart
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50'
                }`}
                title={label}
              >
                <Icon size={20} strokeWidth={1.5} />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
