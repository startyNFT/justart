// Disable static generation for my-galleries page - requires client-side wallet
export const dynamic = 'force-dynamic';

export default function MyGalleriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
