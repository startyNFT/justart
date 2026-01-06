'use client';

const presetColors = [
  '#FFFFFF',
  '#F5F5F5',
  '#E5E5E5',
  '#171717',
  '#0A0A0A',
  '#FEF2F2',
  '#FEF9C3',
  '#DCFCE7',
  '#DBEAFE',
  '#F3E8FF',
  '#FCE7F3',
  '#FFEDD5',
];

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {presetColors.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            value === color
              ? 'border-neutral-900 scale-110'
              : 'border-neutral-200 hover:border-neutral-300'
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
      <label className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div
          className="w-8 h-8 rounded-full border-2 border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 text-xs"
          title="Custom color"
        >
          +
        </div>
      </label>
    </div>
  );
}
