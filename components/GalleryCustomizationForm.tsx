import { ArrowRight, Lock, Unlock } from 'lucide-react';
import { SizePicker, ArrangementPicker } from './LayoutPicker';
import { ColorPicker } from './ColorPicker';
import { MusicPicker } from './MusicPicker';
import { GALLERY_CATEGORIES, type GalleryCategory } from '@/lib/supabase';
import type { SizeType, ArrangementType, MusicTrack } from '@/lib/constants';
import type { NFT } from '@/lib/stargaze';

interface GalleryCustomizationFormProps {
  name: string;
  description: string;
  size: SizeType;
  arrangement: ArrangementType;
  backgroundColor: string;
  showInfo: boolean;
  lockLayout: boolean;
  musicTrack: MusicTrack | null;
  category: GalleryCategory | null;
  audioNfts: NFT[];
  loadingCollection: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onSizeChange: (size: SizeType) => void;
  onArrangementChange: (arrangement: ArrangementType) => void;
  onBackgroundColorChange: (color: string) => void;
  onShowInfoChange: (showInfo: boolean) => void;
  onLockLayoutChange: (lockLayout: boolean) => void;
  onMusicTrackChange: (track: MusicTrack | null) => void;
  onCategoryChange: (category: GalleryCategory | null) => void;
  onNext: () => void;
}

export function GalleryCustomizationForm({
  name,
  description,
  size,
  arrangement,
  backgroundColor,
  showInfo,
  lockLayout,
  musicTrack,
  category,
  audioNfts,
  loadingCollection,
  onNameChange,
  onDescriptionChange,
  onSizeChange,
  onArrangementChange,
  onBackgroundColorChange,
  onShowInfoChange,
  onLockLayoutChange,
  onMusicTrackChange,
  onCategoryChange,
  onNext,
}: GalleryCustomizationFormProps) {
  return (
    <div className="w-full lg:w-[400px] flex-shrink-0 space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Gallery Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="My Collection"
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="A collection of my favorite pieces..."
          rows={3}
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-200 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Size</label>
        <SizePicker value={size} onChange={onSizeChange} />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Arrangement</label>
        <ArrangementPicker value={arrangement} onChange={onArrangementChange} />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Background Color</label>
        <ColorPicker value={backgroundColor} onChange={onBackgroundColorChange} />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Gallery Info Visibility
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onShowInfoChange(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showInfo
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Always Show
          </button>
          <button
            onClick={() => onShowInfoChange(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showInfo
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Show on Hover
          </button>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Controls whether gallery title, owner, and stats are visible by default or only on hover
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Layout Lock</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onLockLayoutChange(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !lockLayout
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <Unlock size={14} />
            Unlocked
          </button>
          <button
            onClick={() => onLockLayoutChange(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              lockLayout
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <Lock size={14} />
            Locked
          </button>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          When locked, visitors cannot change the size or arrangement of your gallery
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Background Music</label>
        <MusicPicker value={musicTrack} onChange={onMusicTrackChange} audioNfts={audioNfts} loading={loadingCollection} />
        <p className="text-xs text-neutral-400 mt-2">
          Optional ambient music that plays when visitors view your gallery
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {GALLERY_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(category === cat.value ? null : cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                category === cat.value
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Help others discover your gallery by selecting a category
        </p>
      </div>

      <div className="pt-4">
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Next: Select NFTs
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
