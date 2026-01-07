'use client';

import { usePathname } from 'next/navigation';

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isGalleryPage = pathname.startsWith('/g/');

  return (
    <main className={isGalleryPage ? 'min-h-screen' : 'pt-14 min-h-screen'}>
      {children}
    </main>
  );
}
