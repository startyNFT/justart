// Disable static generation for my-nfts page - requires client-side wallet
export const dynamic = 'force-dynamic';

export default function MyNftsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
