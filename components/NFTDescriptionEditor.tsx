import type { NFT } from '@/lib/stargaze';

interface NFTDescriptionEditorProps {
  nfts: NFT[];
  descriptions: Record<string, string>;
  onDescriptionChange: (key: string, description: string) => void;
}

export function NFTDescriptionEditor({
  nfts,
  descriptions,
  onDescriptionChange,
}: NFTDescriptionEditorProps) {
  if (nfts.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-8">
      <h3 className="text-lg font-medium mb-4">NFT Descriptions</h3>
      <p className="text-sm text-neutral-500 mb-6">
        Add personal descriptions or stories for each NFT. These will appear during the presentation.
      </p>
      <div className="space-y-4">
        {nfts.map((nft, index) => {
          const key = `${nft.collection.contractAddress}-${nft.tokenId}`;
          return (
            <div key={key} className="flex gap-4 items-start p-4 bg-neutral-50 rounded-lg">
              <div className="flex-shrink-0">
                <span className="text-sm text-neutral-400 mr-2">{index + 1}.</span>
                <img
                  src={nft.thumbnail || nft.image}
                  alt=""
                  className="w-16 h-16 object-cover rounded"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">{nft.collection.name}</p>
                <textarea
                  value={descriptions[key] || ''}
                  onChange={(e) => onDescriptionChange(key, e.target.value)}
                  placeholder="Add a description, story, or context for this NFT..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
