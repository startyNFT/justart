'use client';

import {
  Grid3X3,
  Grid2X2,
  Square,
  GalleryVertical,
  LayoutGrid,
  AlignJustify,
  Presentation,
} from 'lucide-react';
import {
  SIZE_OPTIONS,
  ARRANGEMENT_OPTIONS,
  type SizeType,
  type ArrangementType,
  LAYOUT_OPTIONS,
  type LayoutType,
} from '@/lib/constants';

const sizeIcons: Record<SizeType, React.ElementType> = {
  small: Grid3X3,
  medium: Grid2X2,
  large: Square,
};

const arrangementIcons: Record<ArrangementType, React.ElementType> = {
  grid: LayoutGrid,
  vertical: GalleryVertical,
  justified: AlignJustify,
  presentation: Presentation,
};

type SizePickerProps = {
  value: SizeType;
  onChange: (size: SizeType) => void;
  variant?: 'light' | 'dark' | 'transparent';
};

export function SizePicker({ value, onChange, variant = 'light' }: SizePickerProps) {
  const containerClass = variant === 'transparent' || variant === 'dark'
    ? 'flex gap-1'
    : 'flex gap-1 p-1 bg-neutral-100 rounded-lg';

  const getButtonClass = (isActive: boolean) => {
    if (variant === 'dark') {
      return `p-1.5 rounded transition-all ${
        isActive
          ? 'text-white ring-1 ring-white/50'
          : 'text-white/50 hover:text-white/80'
      }`;
    }
    if (variant === 'transparent') {
      return `p-1.5 rounded transition-all ${
        isActive
          ? 'text-neutral-900 ring-1 ring-neutral-400'
          : 'text-neutral-400 hover:text-neutral-600'
      }`;
    }
    return `p-2 rounded-md transition-colors ${
      isActive
        ? 'bg-white text-neutral-900 shadow-sm'
        : 'text-neutral-400 hover:text-neutral-600'
    }`;
  };

  return (
    <div className={containerClass} role="group" aria-label="Image size options">
      {SIZE_OPTIONS.map(({ id, label }) => {
        const Icon = sizeIcons[id];
        const isActive = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={getButtonClass(isActive)}
            title={label}
            aria-label={`Set size to ${label}`}
            aria-pressed={isActive}
            type="button"
          >
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

type ArrangementPickerProps = {
  value: ArrangementType;
  onChange: (arrangement: ArrangementType) => void;
  variant?: 'light' | 'dark' | 'transparent';
  exclude?: ArrangementType[]; // Arrangements to exclude from the picker
};

export function ArrangementPicker({ value, onChange, variant = 'light', exclude = [] }: ArrangementPickerProps) {
  const containerClass = variant === 'transparent' || variant === 'dark'
    ? 'flex gap-1'
    : 'flex gap-1 p-1 bg-neutral-100 rounded-lg';

  const getButtonClass = (isActive: boolean) => {
    if (variant === 'dark') {
      return `p-1.5 rounded transition-all ${
        isActive
          ? 'text-white ring-1 ring-white/50'
          : 'text-white/50 hover:text-white/80'
      }`;
    }
    if (variant === 'transparent') {
      return `p-1.5 rounded transition-all ${
        isActive
          ? 'text-neutral-900 ring-1 ring-neutral-400'
          : 'text-neutral-400 hover:text-neutral-600'
      }`;
    }
    return `p-2 rounded-md transition-colors ${
      isActive
        ? 'bg-white text-neutral-900 shadow-sm'
        : 'text-neutral-400 hover:text-neutral-600'
    }`;
  };

  // Filter out excluded arrangements
  const filteredOptions = ARRANGEMENT_OPTIONS.filter(({ id }) => !exclude.includes(id));

  return (
    <div className={containerClass} role="group" aria-label="Layout arrangement options">
      {filteredOptions.map(({ id, label }) => {
        const Icon = arrangementIcons[id];
        const isActive = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={getButtonClass(isActive)}
            title={label}
            aria-label={`Set arrangement to ${label}`}
            aria-pressed={isActive}
            type="button"
          >
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

// Legacy LayoutPicker for backwards compatibility
const layoutIcons: Record<LayoutType, React.ElementType> = {
  small: Grid3X3,
  medium: Grid2X2,
  large: Square,
  horizontal: GalleryVertical,
  vertical: GalleryVertical,
  grid: LayoutGrid,
};

type LayoutPickerProps = {
  value: LayoutType;
  onChange: (layout: LayoutType) => void;
};

export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg" role="group" aria-label="Layout options">
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
            aria-label={`Set layout to ${label}`}
            aria-pressed={isActive}
            type="button"
          >
            <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
