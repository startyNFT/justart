import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CosmosProvider } from '@/providers/CosmosProvider';
import { Header } from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'justart - NFT Gallery',
  description: 'Create beautiful galleries of your NFTs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CosmosProvider>
          <Header />
          <main className="pt-14 min-h-screen">
            {children}
          </main>
        </CosmosProvider>
      </body>
    </html>
  );
}
