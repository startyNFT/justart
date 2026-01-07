'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Minus, RotateCcw, Wand2 } from 'lucide-react';
import type { NFT } from '@/lib/stargaze';

type CustomRowEditorProps = {
  nfts: NFT[];
  rowCounts: number[] | null;
  onChange: (rowCounts: number[] | null) => void;
  size: 'small' | 'medium' | 'large';
};

export function CustomRowEditor({ nfts, rowCounts, onChange, size }: CustomRowEditorProps) {
  const totalNfts = nfts.length;

  // Generate auto row counts based on size
  const autoRowCounts = useMemo(() => {
    if (totalNfts === 0) return [];

    const basePerRow = size === 'large' ? 2 : size === 'medium' ? 4 : 6;
    const rows: number[] = [];
    let remaining = totalNfts;

    while (remaining > 0) {
      // Vary row sizes slightly for visual interest
      const variation = rows.length % 3;
      const rowSize = Math.min(remaining, basePerRow + variation);
      rows.push(rowSize);
      remaining -= rowSize;
    }

    return rows;
  }, [totalNfts, size]);

  // Use custom or auto
  const activeRowCounts = rowCounts || autoRowCounts;
  const isCustomized = rowCounts !== null;

  // Initialize custom rows from auto if switching to custom mode
  const enableCustomization = useCallback(() => {
    onChange([...autoRowCounts]);
  }, [autoRowCounts, onChange]);

  // Reset to automatic
  const resetToAuto = useCallback(() => {
    onChange(null);
  }, [onChange]);

  // Adjust row count
  const adjustRow = useCallback((rowIndex: number, delta: number) => {
    if (!rowCounts) return;

    const newCounts = [...rowCounts];
    const newValue = newCounts[rowIndex] + delta;

    // Minimum 1 NFT per row
    if (newValue < 1) return;

    // Calculate what's being taken/given
    const currentTotal = newCounts.reduce((a, b) => a + b, 0);

    if (delta > 0) {
      // Adding to this row - need to take from somewhere
      // Try to take from next rows first, then previous
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
      if (!taken && currentTotal < totalNfts) {
        // Can add without taking (shouldn't normally happen)
      } else if (!taken) {
        return; // Can't add
      }
    } else {
      // Removing from this row - give to next row or create new row
      if (rowIndex < newCounts.length - 1) {
        newCounts[rowIndex + 1]++;
      } else if (rowIndex > 0) {
        newCounts[rowIndex - 1]++;
      } else {
        return; // Can't remove from only row
      }
    }

    newCounts[rowIndex] = newValue;

    // Remove empty rows
    const filtered = newCounts.filter(c => c > 0);
    onChange(filtered);
  }, [rowCounts, totalNfts, onChange]);

  // Add a new row by splitting the last row
  const addRow = useCallback(() => {
    if (!rowCounts) return;

    const newCounts = [...rowCounts];
    const lastIdx = newCounts.length - 1;

    if (newCounts[lastIdx] >= 2) {
      // Split last row
      const half = Math.floor(newCounts[lastIdx] / 2);
      newCounts[lastIdx] = newCounts[lastIdx] - half;
      newCounts.push(half);
      onChange(newCounts);
    }
  }, [rowCounts, onChange]);

  // Remove last row by merging with previous
  const removeRow = useCallback(() => {
    if (!rowCounts || rowCounts.length <= 1) return;

    const newCounts = [...rowCounts];
    const lastCount = newCounts.pop()!;
    newCounts[newCounts.length - 1] += lastCount;
    onChange(newCounts);
  }, [rowCounts, onChange]);

  // Calculate NFT indices for each row
  const rowsWithNfts = useMemo(() => {
    const rows: { count: number; nfts: NFT[]; startIndex: number }[] = [];
    let index = 0;

    for (const count of activeRowCounts) {
      rows.push({
        count,
        nfts: nfts.slice(index, index + count),
        startIndex: index,
      });
      index += count;
    }

    return rows;
  }, [activeRowCounts, nfts]);

  if (totalNfts === 0) {
    return (
      <div className="text-center py-8 text-neutral-400">
        Select NFTs to customize row layout
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-neutral-700">Row Layout</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isCustomized ? 'Custom layout' : 'Automatic layout'}
          </p>
        </div>

        {!isCustomized ? (
          <button
            onClick={enableCustomization}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            <Wand2 size={14} />
            Customize
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

      {/* Row preview and controls */}
      <div className="space-y-2">
        {rowsWithNfts.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-3">
            {/* Row label and controls */}
            {isCustomized && (
              <div className="flex items-center gap-1 flex-shrink-0 w-24">
                <span className="text-xs text-neutral-400 w-8">R{rowIndex + 1}</span>
                <button
                  onClick={() => adjustRow(rowIndex, -1)}
                  disabled={row.count <= 1}
                  className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-medium w-6 text-center">{row.count}</span>
                <button
                  onClick={() => adjustRow(rowIndex, 1)}
                  className="p-1 rounded hover:bg-neutral-100"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}

            {/* NFT thumbnails preview */}
            <div className="flex-1 flex gap-1 overflow-hidden">
              {row.nfts.map((nft, i) => (
                <div
                  key={`${nft.collection.contractAddress}-${nft.tokenId}-${i}`}
                  className="flex-1 aspect-square bg-neutral-100 rounded overflow-hidden min-w-0"
                  style={{ maxWidth: isCustomized ? '60px' : '40px' }}
                >
                  <img
                    src={nft.thumbnail || nft.image}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
              {/* Placeholder for remaining space */}
              {row.nfts.length < row.count && (
                <div
                  className="flex-1 aspect-square bg-neutral-50 rounded border-2 border-dashed border-neutral-200 min-w-0"
                  style={{ maxWidth: isCustomized ? '60px' : '40px' }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Remove row buttons */}
      {isCustomized && (
        <div className="flex items-center gap-2 pt-2">
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
              Remove Row
            </button>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="text-xs text-neutral-400 pt-2 border-t">
        {activeRowCounts.length} rows &middot; {totalNfts} NFTs
      </div>
    </div>
  );
}
