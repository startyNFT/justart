// Revalidate explore pages frequently for fresh gallery listings
export const revalidate = 30; // Revalidate every 30 seconds

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
