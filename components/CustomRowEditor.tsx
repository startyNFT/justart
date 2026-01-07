'use client';

import { useMemo, useCallback, useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
  DragOverlay,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Minus, RotateCcw, Wand2, X, GripVertical } from 'lucide-react';
import type { NFT } from '@/lib/stargaze';

export type RowConfig = {
  count: number;
  height: number; // Height in pixels
};

// Get unique key for NFT
function getNftKey(nft: NFT) {
  return `${nft.collection.contractAddress}-${nft.tokenId}`;
}

// Sortable NFT item
function SortableNFTItem({
  nft,
  onRemove,
  height,
}: {
  nft: NFT;
  onRemove: () => void;
  height: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: getNftKey(nft) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    height: `${height}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-neutral-100 rounded overflow-hidden group ${
        isDragging ? 'z-50 shadow-xl' : ''
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

// Droppable row container with resize handle
function DroppableRow({
  rowIndex,
  children,
  height,
  onHeightChange,
  isCustomized,
}: {
  rowIndex: number;
  children: React.ReactNode;
  height: number;
  onHeightChange: (newHeight: number) => void;
  isCustomized: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `row-${rowIndex}`,
  });

  const [isResizing, setIsResizing] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCustomized) return;
    e.preventDefault();
    setIsResizing(true);
    startY.current = e.clientY;
    startHeight.current = height;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startY.current;
      const newHeight = Math.max(60, Math.min(400, startHeight.current + delta));
      onHeightChange(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex-1 relative">
      <div
        ref={setNodeRef}
        className={`flex gap-1 justify-start p-1 rounded-lg transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''
        }`}
        style={{ minHeight: `${height}px` }}
      >
        {children}
      </div>

      {/* Resize handle */}
      {isCustomized && (
        <div
          onMouseDown={handleMouseDown}
          className={`absolute left-0 right-0 bottom-0 h-3 cursor-ns-resize flex items-center justify-center group ${
            isResizing ? 'bg-blue-100' : 'hover:bg-neutral-100'
          }`}
        >
          <div className={`w-12 h-1 rounded-full ${isResizing ? 'bg-blue-400' : 'bg-neutral-300 group-hover:bg-neutral-400'}`} />
        </div>
      )}
    </div>
  );
}

type CustomRowEditorProps = {
  nfts: NFT[];
  rowConfigs: RowConfig[] | null;
  onChange: (rowConfigs: RowConfig[] | null) => void;
  onReorder: (nfts: NFT[]) => void;
  onRemove: (nft: NFT) => void;
  size: 'small' | 'medium' | 'large';
};

export function CustomRowEditor({
  nfts,
  rowConfigs,
  onChange,
  onReorder,
  onRemove,
  size
}: CustomRowEditorProps) {
  const totalNfts = nfts.length;
  const [activeNft, setActiveNft] = useState<NFT | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Default row height based on size
  const defaultHeight = size === 'large' ? 200 : size === 'medium' ? 120 : 80;

  // Generate auto row configs based on size
  const autoRowConfigs = useMemo(() => {
    if (totalNfts === 0) return [];

    const basePerRow = size === 'large' ? 2 : size === 'medium' ? 4 : 6;
    const rows: RowConfig[] = [];
    let remaining = totalNfts;

    while (remaining > 0) {
      const variation = rows.length % 3;
      const rowSize = Math.min(remaining, basePerRow + variation);
      rows.push({ count: rowSize, height: defaultHeight });
      remaining -= rowSize;
    }

    return rows;
  }, [totalNfts, size, defaultHeight]);

  const activeRowConfigs = rowConfigs || autoRowConfigs;
  const isCustomized = rowConfigs !== null;

  const enableCustomization = useCallback(() => {
    onChange([...autoRowConfigs]);
  }, [autoRowConfigs, onChange]);

  const resetToAuto = useCallback(() => {
    onChange(null);
  }, [onChange]);

  // Build rows from NFTs based on row configs
  const rows = useMemo(() => {
    const result: { nfts: NFT[]; config: RowConfig }[] = [];
    let index = 0;

    for (const config of activeRowConfigs) {
      result.push({
        nfts: nfts.slice(index, index + config.count),
        config,
      });
      index += config.count;
    }

    return result;
  }, [activeRowConfigs, nfts]);

  // Find which row an NFT is in
  const findNftRow = useCallback((nftKey: string): number => {
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      for (const nft of rows[rowIdx].nfts) {
        if (getNftKey(nft) === nftKey) {
          return rowIdx;
        }
      }
    }
    return -1;
  }, [rows]);

  // Find NFT index in the flat array
  const findNftIndex = useCallback((nftKey: string): number => {
    return nfts.findIndex(nft => getNftKey(nft) === nftKey);
  }, [nfts]);

  // Handle drag start
  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    const activeKey = event.active.id as string;
    const nft = nfts.find(n => getNftKey(n) === activeKey);
    setActiveNft(nft || null);
  }, [nfts]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveNft(null);

    if (!over) return;

    const activeKey = active.id as string;
    const overId = over.id as string;
    const sourceRowIndex = findNftRow(activeKey);
    const activeIndex = findNftIndex(activeKey);

    if (activeIndex === -1 || sourceRowIndex === -1) return;

    // Check if dropped on a row zone
    if (overId.startsWith('row-')) {
      const targetRowIndex = parseInt(overId.split('-')[1], 10);

      // Only process if moving to a different row
      if (sourceRowIndex !== targetRowIndex && isCustomized) {
        // Calculate target position (end of target row)
        let targetIndex = 0;
        for (let i = 0; i <= targetRowIndex; i++) {
          targetIndex += activeRowConfigs[i].count;
        }
        // Adjust if moving forward
        if (sourceRowIndex < targetRowIndex) {
          targetIndex--;
        }

        // Move the NFT
        const newNfts = [...nfts];
        const [movedNft] = newNfts.splice(activeIndex, 1);
        newNfts.splice(targetIndex, 0, movedNft);
        onReorder(newNfts);

        // Update row configs
        const newConfigs = [...activeRowConfigs];
        newConfigs[sourceRowIndex] = { ...newConfigs[sourceRowIndex], count: newConfigs[sourceRowIndex].count - 1 };
        newConfigs[targetRowIndex] = { ...newConfigs[targetRowIndex], count: newConfigs[targetRowIndex].count + 1 };

        // Remove empty rows
        const filtered = newConfigs.filter(c => c.count > 0);
        onChange(filtered);
      }
    } else {
      // Dropped on another NFT
      const overIndex = findNftIndex(overId);
      const targetRowIndex = findNftRow(overId);

      if (overIndex === -1 || activeIndex === overIndex) return;

      // Move the NFT to the new position
      const newNfts = [...nfts];
      const [movedNft] = newNfts.splice(activeIndex, 1);
      newNfts.splice(overIndex, 0, movedNft);
      onReorder(newNfts);

      // If moving between rows in custom mode, update row configs
      if (isCustomized && sourceRowIndex !== targetRowIndex && targetRowIndex !== -1) {
        const newConfigs = [...activeRowConfigs];
        newConfigs[sourceRowIndex] = { ...newConfigs[sourceRowIndex], count: newConfigs[sourceRowIndex].count - 1 };
        newConfigs[targetRowIndex] = { ...newConfigs[targetRowIndex], count: newConfigs[targetRowIndex].count + 1 };

        const filtered = newConfigs.filter(c => c.count > 0);
        onChange(filtered);
      }
    }
  }, [isCustomized, findNftRow, findNftIndex, nfts, activeRowConfigs, onReorder, onChange]);

  // Adjust row count with buttons
  const adjustRow = useCallback((rowIndex: number, delta: number) => {
    if (!rowConfigs) return;

    const newConfigs = [...rowConfigs];
    const newValue = newConfigs[rowIndex].count + delta;

    if (newValue < 1) return;

    if (delta > 0) {
      let taken = false;
      for (let i = rowIndex + 1; i < newConfigs.length; i++) {
        if (newConfigs[i].count > 1) {
          newConfigs[i] = { ...newConfigs[i], count: newConfigs[i].count - 1 };
          taken = true;
          break;
        }
      }
      if (!taken) {
        for (let i = rowIndex - 1; i >= 0; i--) {
          if (newConfigs[i].count > 1) {
            newConfigs[i] = { ...newConfigs[i], count: newConfigs[i].count - 1 };
            taken = true;
            break;
          }
        }
      }
      if (!taken) return;
    } else {
      if (rowIndex < newConfigs.length - 1) {
        newConfigs[rowIndex + 1] = { ...newConfigs[rowIndex + 1], count: newConfigs[rowIndex + 1].count + 1 };
      } else if (rowIndex > 0) {
        newConfigs[rowIndex - 1] = { ...newConfigs[rowIndex - 1], count: newConfigs[rowIndex - 1].count + 1 };
      } else {
        return;
      }
    }

    newConfigs[rowIndex] = { ...newConfigs[rowIndex], count: newValue };
    const filtered = newConfigs.filter(c => c.count > 0);
    onChange(filtered);
  }, [rowConfigs, onChange]);

  // Adjust row height
  const adjustRowHeight = useCallback((rowIndex: number, newHeight: number) => {
    if (!rowConfigs) return;
    const newConfigs = [...rowConfigs];
    newConfigs[rowIndex] = { ...newConfigs[rowIndex], height: newHeight };
    onChange(newConfigs);
  }, [rowConfigs, onChange]);

  const addRow = useCallback(() => {
    if (!rowConfigs) return;
    const newConfigs = [...rowConfigs];
    const lastIdx = newConfigs.length - 1;
    if (newConfigs[lastIdx].count >= 2) {
      const half = Math.floor(newConfigs[lastIdx].count / 2);
      newConfigs[lastIdx] = { ...newConfigs[lastIdx], count: newConfigs[lastIdx].count - half };
      newConfigs.push({ count: half, height: defaultHeight });
      onChange(newConfigs);
    }
  }, [rowConfigs, onChange, defaultHeight]);

  const removeRow = useCallback(() => {
    if (!rowConfigs || rowConfigs.length <= 1) return;
    const newConfigs = [...rowConfigs];
    const lastConfig = newConfigs.pop()!;
    newConfigs[newConfigs.length - 1] = {
      ...newConfigs[newConfigs.length - 1],
      count: newConfigs[newConfigs.length - 1].count + lastConfig.count
    };
    onChange(newConfigs);
  }, [rowConfigs, onChange]);

  if (totalNfts === 0) {
    return (
      <div className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center text-neutral-400">
        Select NFTs to add to your gallery
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-neutral-700">
            {isCustomized ? 'Custom Row Layout' : 'Automatic Row Layout'}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isCustomized ? 'Drag NFTs between rows, drag bottom edge to resize' : 'Drag to reorder, click X to remove'}
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
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={nfts.map(getNftKey)}
          strategy={rectSortingStrategy}
        >
          <div className="space-y-1">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-stretch gap-3">
                {/* Row controls */}
                {isCustomized && (
                  <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0 bg-neutral-100 rounded-lg px-2 py-1">
                    <button
                      onClick={() => adjustRow(rowIndex, -1)}
                      disabled={row.nfts.length <= 1}
                      className="p-0.5 rounded hover:bg-neutral-200 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove NFT from this row"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xs text-neutral-700 font-medium">{row.nfts.length}</span>
                    <button
                      onClick={() => adjustRow(rowIndex, 1)}
                      className="p-0.5 rounded hover:bg-neutral-200 text-neutral-600"
                      title="Add NFT to this row"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}

                {/* Droppable row with sortable NFTs */}
                <DroppableRow
                  rowIndex={rowIndex}
                  height={row.config.height}
                  onHeightChange={(h) => adjustRowHeight(rowIndex, h)}
                  isCustomized={isCustomized}
                >
                  {row.nfts.map((nft) => (
                    <div
                      key={getNftKey(nft)}
                      style={{
                        flex: '1 1 0',
                        maxWidth: row.nfts.length === 1 ? '200px' : row.nfts.length === 2 ? '250px' : undefined,
                        opacity: activeNft && getNftKey(activeNft) === getNftKey(nft) ? 0.3 : 1,
                      }}
                    >
                      <SortableNFTItem
                        nft={nft}
                        onRemove={() => onRemove(nft)}
                        height={row.config.height}
                      />
                    </div>
                  ))}
                </DroppableRow>

                {/* Height indicator */}
                {isCustomized && (
                  <div className="flex items-center text-xs text-neutral-400 w-10">
                    {row.config.height}px
                  </div>
                )}
              </div>
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay for smooth dragging */}
        <DragOverlay>
          {activeNft && (
            <div className="w-24 h-24 bg-neutral-100 rounded shadow-xl overflow-hidden">
              <img
                src={activeNft.thumbnail || activeNft.image}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Add/Remove row buttons */}
      {isCustomized && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <button
            onClick={addRow}
            disabled={activeRowConfigs[activeRowConfigs.length - 1]?.count < 2}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add Row
          </button>
          {activeRowConfigs.length > 1 && (
            <button
              onClick={removeRow}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <Minus size={14} />
              Merge Last Row
            </button>
          )}
          <span className="ml-auto text-xs text-neutral-400">
            {activeRowConfigs.length} rows · {totalNfts} NFTs
          </span>
        </div>
      )}
    </div>
  );
}

// Helper to convert RowConfig[] to simple number[] for backward compatibility
export function rowConfigsToRowCounts(configs: RowConfig[] | null): number[] | null {
  if (!configs) return null;
  return configs.map(c => c.count);
}

// Helper to get row heights
export function getRowHeights(configs: RowConfig[] | null): number[] | null {
  if (!configs) return null;
  return configs.map(c => c.height);
}
