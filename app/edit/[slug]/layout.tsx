// Force dynamic rendering for edit page - requires fresh gallery data and wallet
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
