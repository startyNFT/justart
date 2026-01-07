'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { Plus, Minus, RotateCcw, Wand2, X, GripVertical } from 'lucide-react';
import type { NFT } from '@/lib/stargaze';

// Sortable NFT item for row editor
function SortableNFTItem({
  nft,
  onRemove
}: {
  nft: NFT;
  onRemove: () => void;
}) {
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
      className={`relative aspect-square bg-neutral-100 rounded overflow-hidden group ${
        isDragging ? 'z-50 shadow-xl opacity-90' : ''
      }`}
    >
      <img
        src={nft.thumbnail || nft.image}
        alt=""
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={12} className="text-white" />
      </button>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
      >
        <X size={12} className="text-white" />
      </button>
    </div>
  );
}

type CustomRowEditorProps = {
  nfts: NFT[];
  rowCounts: number[] | null;
  onChange: (rowCounts: number[] | null) => void;
  onReorder: (nfts: NFT[]) => void;
  onRemove: (nft: NFT) => void;
  size: 'small' | 'medium' | 'large';
};

export function CustomRowEditor({
  nfts,
  rowCounts,
  onChange,
  onReorder,
  onRemove,
  size
}: CustomRowEditorProps) {
  const totalNfts = nfts.length;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate auto row counts based on size
  const autoRowCounts = useMemo(() => {
    if (totalNfts === 0) return [];

    const basePerRow = size === 'large' ? 2 : size === 'medium' ? 4 : 6;
    const rows: number[] = [];
    let remaining = totalNfts;

    while (remaining > 0) {
      const variation = rows.length % 3;
      const rowSize = Math.min(remaining, basePerRow + variation);
      rows.push(rowSize);
      remaining -= rowSize;
    }

    return rows;
  }, [totalNfts, size]);

  const activeRowCounts = rowCounts || autoRowCounts;
  const isCustomized = rowCounts !== null;

  const enableCustomization = useCallback(() => {
    onChange([...autoRowCounts]);
  }, [autoRowCounts, onChange]);

  const resetToAuto = useCallback(() => {
    onChange(null);
  }, [onChange]);

  // Handle drag end - reorder NFTs
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

  // Adjust row count
  const adjustRow = useCallback((rowIndex: number, delta: number) => {
    if (!rowCounts) return;

    const newCounts = [...rowCounts];
    const newValue = newCounts[rowIndex] + delta;

    if (newValue < 1) return;

    if (delta > 0) {
      // Adding - take from another row
      let taken = false;
      for (let i = rowIndex + 1; i < newCounts.length; i++) {
        if (newCounts[i] > 1) {
          newCounts[i]--;
          taken = true;
          break;
        }
      }
      if (!taken) {
        for (let i = rowIndex - 1; i >= 0; i--) {
          if (newCounts[i] > 1) {
            newCounts[i]--;
            taken = true;
            break;
          }
        }
      }
      if (!taken) return;
    } else {
      // Removing - give to next row
      if (rowIndex < newCounts.length - 1) {
        newCounts[rowIndex + 1]++;
      } else if (rowIndex > 0) {
        newCounts[rowIndex - 1]++;
      } else {
        return;
      }
    }

    newCounts[rowIndex] = newValue;
    const filtered = newCounts.filter(c => c > 0);
    onChange(filtered);
  }, [rowCounts, onChange]);

  const addRow = useCallback(() => {
    if (!rowCounts) return;
    const newCounts = [...rowCounts];
    const lastIdx = newCounts.length - 1;
    if (newCounts[lastIdx] >= 2) {
      const half = Math.floor(newCounts[lastIdx] / 2);
      newCounts[lastIdx] = newCounts[lastIdx] - half;
      newCounts.push(half);
      onChange(newCounts);
    }
  }, [rowCounts, onChange]);

  const removeRow = useCallback(() => {
    if (!rowCounts || rowCounts.length <= 1) return;
    const newCounts = [...rowCounts];
    const lastCount = newCounts.pop()!;
    newCounts[newCounts.length - 1] += lastCount;
    onChange(newCounts);
  }, [rowCounts, onChange]);

  // Build rows from NFTs based on row counts
  const rows = useMemo(() => {
    const result: NFT[][] = [];
    let index = 0;

    for (const count of activeRowCounts) {
      result.push(nfts.slice(index, index + count));
      index += count;
    }

    return result;
  }, [activeRowCounts, nfts]);

  if (totalNfts === 0) {
    return (
      <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center text-neutral-400">
        Select NFTs to add to your gallery
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-neutral-700">
            {isCustomized ? 'Custom Row Layout' : 'Automatic Row Layout'}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Drag to reorder, click X to remove
          </p>
        </div>

        {!isCustomized ? (
          <button
            onClick={enableCustomization}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <Wand2 size={14} />
            Customize Rows
          </button>
        ) : (
          <button
            onClick={resetToAuto}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            Reset to Auto
          </button>
        )}
      </div>

      {/* Drag and drop grid organized by rows */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={nfts.map((nft) => `${nft.collection.contractAddress}-${nft.tokenId}`)}
          strategy={rectSortingStrategy}
        >
          <div className="space-y-2">
            {rows.map((rowNfts, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-3">
                {/* Row controls - always visible when customized */}
                {isCustomized && (
                  <div className="flex items-center gap-1 flex-shrink-0 bg-neutral-100 rounded-lg px-2 py-1">
                    <button
                      onClick={() => adjustRow(rowIndex, -1)}
                      disabled={rowNfts.length <= 1}
                      className="p-1 rounded hover:bg-neutral-200 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove NFT from this row"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-sm text-neutral-700 font-medium min-w-[24px] text-center">{rowNfts.length}</span>
                    <button
                      onClick={() => adjustRow(rowIndex, 1)}
                      className="p-1 rounded hover:bg-neutral-200 text-neutral-600"
                      title="Add NFT to this row"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}

                {/* NFTs in this row - with max size limit */}
                <div className="flex-1 flex gap-1 justify-start">
                  {rowNfts.map((nft) => (
                    <div
                      key={`${nft.collection.contractAddress}-${nft.tokenId}`}
                      style={{
                        flex: `1 1 0`,
                        maxWidth: rowNfts.length === 1 ? '120px' : rowNfts.length === 2 ? '150px' : '200px'
                      }}
                    >
                      <SortableNFTItem
                        nft={nft}
                        onRemove={() => onRemove(nft)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add/Remove row buttons */}
      {isCustomized && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <button
            onClick={addRow}
            disabled={activeRowCounts[activeRowCounts.length - 1] < 2}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add Row
          </button>
          {activeRowCounts.length > 1 && (
            <button
              onClick={removeRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Minus size={14} />
              Merge Last Row
            </button>
          )}
          <span className="ml-auto text-xs text-neutral-400">
            {activeRowCounts.length} rows · {totalNfts} NFTs
          </span>
        </div>
      )}
    </div>
  );
}
