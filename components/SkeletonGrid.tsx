// Skeleton grid for loading state
export function SkeletonGrid({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square bg-neutral-100 rounded-lg animate-pulse">
          <div className="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200" />
        </div>
      ))}
    </div>
  );
}
