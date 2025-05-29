import React from 'react';
import Picker from './Picker';
import { ArrowLeftRight } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  secondaryColor: string;
  onSecondaryColorChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorChange,
  secondaryColor,
  onSecondaryColorChange
}) => {
  const handleSwapColors = () => {
    const temp = selectedColor;
    onColorChange(secondaryColor);
    onSecondaryColorChange(temp);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Picker
        value={selectedColor}
        onChange={onColorChange}
        className="hover:scale-105 transition-transform cursor-pointer"
      />

      <button
        onClick={handleSwapColors}
        className="p-1.5 text-accent hover:text-accent-hover hover:bg-muted/20 rounded-sm transition-colors cursor-pointer"
        title="Échanger les couleurs"
      >
        <ArrowLeftRight size={14} />
      </button>

      <Picker
        value={secondaryColor}
        onChange={onSecondaryColorChange}
        className="hover:scale-105 transition-transform cursor-pointer"
      />
    </div>
  );
};
