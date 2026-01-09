interface GallerySummaryCardProps {
  name: string;
  nftsCount: number;
  size: string;
  arrangement: string;
  backgroundColor: string;
}

export function GallerySummaryCard({
  name,
  nftsCount,
  size,
  arrangement,
  backgroundColor,
}: GallerySummaryCardProps) {
  return (
    <div className="bg-neutral-50 rounded-xl p-6 mb-8">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-neutral-500">Name</span>
          <p className="font-medium">{name || 'Untitled'}</p>
        </div>
        <div>
          <span className="text-neutral-500">NFTs</span>
          <p className="font-medium">{nftsCount}</p>
        </div>
        <div>
          <span className="text-neutral-500">Layout</span>
          <p className="font-medium capitalize">{size} / {arrangement}</p>
        </div>
        <div>
          <span className="text-neutral-500">Background</span>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded border border-neutral-200"
              style={{ backgroundColor }}
            />
            <span className="font-medium">{backgroundColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
