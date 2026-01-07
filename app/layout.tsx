import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CosmosProvider } from '@/providers/CosmosProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { Header } from '@/components/Header';
import { MainWrapper } from '@/components/MainWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'pureart - NFT Gallery',
  description: 'Create beautiful galleries of your NFTs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <CosmosProvider>
            <Header />
            <MainWrapper>
              {children}
            </MainWrapper>
          </CosmosProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
