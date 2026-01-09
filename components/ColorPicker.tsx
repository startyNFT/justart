'use client';

const presetColors = [
  '#0A0A0A',
  '#171717',
  '#FFFFFF',
  '#F5F5F5',
  '#E5E5E5',
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
  // Color name helper for accessibility
  const getColorName = (hex: string): string => {
    const colorNames: Record<string, string> = {
      '#0A0A0A': 'Black',
      '#171717': 'Dark Gray',
      '#FFFFFF': 'White',
      '#F5F5F5': 'Light Gray',
      '#E5E5E5': 'Silver',
      '#FEF2F2': 'Light Pink',
      '#FEF9C3': 'Light Yellow',
      '#DCFCE7': 'Light Green',
      '#DBEAFE': 'Light Blue',
      '#F3E8FF': 'Light Purple',
      '#FCE7F3': 'Magenta',
      '#FFEDD5': 'Peach',
    };
    return colorNames[hex] || hex;
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Background color options">
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
          title={`${getColorName(color)} (${color})`}
          aria-label={`Select ${getColorName(color)} background color`}
          aria-pressed={value === color}
          type="button"
        />
      ))}
      <label className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Choose custom background color"
        />
        <div
          className="w-8 h-8 rounded-full border-2 border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 text-xs"
          title="Custom color"
          aria-hidden="true"
        >
          +
        </div>
      </label>
    </div>
  );
}
