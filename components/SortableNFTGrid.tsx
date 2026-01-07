'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import type { NFT } from '@/lib/stargaze';

type SortableItemProps = {
  nft: NFT;
  onRemove: () => void;
};

function SortableItem({ nft, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${nft.collection.contractAddress}-${nft.tokenId}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square bg-neutral-50 rounded-lg overflow-hidden group ${
        isDragging ? 'z-50 shadow-xl opacity-90' : ''
      }`}
    >
      {(nft.thumbnail || nft.image) ? (
        <img
          src={nft.thumbnail || nft.image}
          alt={nft.name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-neutral-300">
          No Image
        </div>
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} className="text-neutral-600" />
      </button>

      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
      >
        <X size={16} className="text-neutral-600 hover:text-red-500" />
      </button>

      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{nft.name}</p>
      </div>
    </div>
  );
}

type SortableNFTGridProps = {
  nfts: NFT[];
  onReorder: (nfts: NFT[]) => void;
  onRemove: (nft: NFT) => void;
};

export function SortableNFTGrid({ nfts, onReorder, onRemove }: SortableNFTGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = nfts.findIndex(
        (nft) => `${nft.collection.contractAddress}-${nft.tokenId}` === active.id
      );
      const newIndex = nfts.findIndex(
        (nft) => `${nft.collection.contractAddress}-${nft.tokenId}` === over.id
      );

      onReorder(arrayMove(nfts, oldIndex, newIndex));
    }
  };

  if (nfts.length === 0) {
    return (
      <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center text-neutral-400">
        Select NFTs to add to your gallery
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={nfts.map((nft) => `${nft.collection.contractAddress}-${nft.tokenId}`)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {nfts.map((nft) => (
            <SortableItem
              key={`${nft.collection.contractAddress}-${nft.tokenId}`}
              nft={nft}
              onRemove={() => onRemove(nft)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
