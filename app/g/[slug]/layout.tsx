// Force dynamic rendering for gallery pages to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
