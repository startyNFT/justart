// Disable static generation for create page - requires client-side wallet
export const dynamic = 'force-dynamic';

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
