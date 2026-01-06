'use client';

import {
  Grid3X3,
  Grid2X2,
  Square,
  GalleryHorizontal,
  GalleryVertical,
  LayoutGrid,
} from 'lucide-react';
import { LAYOUT_OPTIONS, type LayoutType } from '@/lib/constants';

const layoutIcons: Record<LayoutType, React.ElementType> = {
  small: Grid3X3,
  medium: Grid2X2,
  large: Square,
  horizontal: GalleryHorizontal,
  vertical: GalleryVertical,
  grid: LayoutGrid,
};

type LayoutPickerProps = {
  value: LayoutType;
  onChange: (layout: LayoutType) => void;
};

export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg">
      {LAYOUT_OPTIONS.map(({ id, label }) => {
        const Icon = layoutIcons[id];
        const isActive = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`p-2 rounded-md transition-colors ${
              isActive
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
            title={label}
          >
            <Icon size={18} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}
