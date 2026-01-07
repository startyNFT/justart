'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Image,
  FolderOpen,
  Plus,
  Compass,
  Sun,
  Moon,
} from 'lucide-react';
import { WalletButton } from './WalletButton';
import { useTheme } from '@/providers/ThemeProvider';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/my-nfts', icon: Image, label: 'My NFTs' },
  { href: '/my-galleries', icon: FolderOpen, label: 'My Galleries' },
  { href: '/create', icon: Plus, label: 'Create' },
];

export function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  // Hide header on gallery view pages
  if (pathname.startsWith('/g/')) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-100 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-medium tracking-tight text-neutral-900 dark:text-white">
          pureart
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
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                    : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
                title={label}
              >
                <Icon size={20} strokeWidth={1.5} />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon size={20} strokeWidth={1.5} />
            ) : (
              <Sun size={20} strokeWidth={1.5} />
            )}
          </button>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
