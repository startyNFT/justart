import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CosmosProvider } from '@/providers/CosmosProvider';
import { Header } from '@/components/Header';
import { MainWrapper } from '@/components/MainWrapper';

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
          <MainWrapper>
            {children}
          </MainWrapper>
        </CosmosProvider>
      </body>
    </html>
  );
}
