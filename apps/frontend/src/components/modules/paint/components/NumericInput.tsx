import React from 'react';
import { useNumericInput } from '../hooks/useNumericInput';

interface NumericInputProps {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  className?: string;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  label,
  value,
  setValue,
  min,
  max,
  step = 1,
  unit,
  className = ""
}) => {
  const handleSetValue = (newValue: number | ((prev: number) => number)) => {
    if (typeof newValue === 'function') {
      setValue(newValue(value));
    } else {
      setValue(newValue);
    }
  };

  const inputProps = useNumericInput(value, handleSetValue, min, max, step);

  return (
    <div className={`flex-1 ${className}`}>
      <label className="block text-xs font-medium text-muted mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          {...inputProps}
          className="w-full px-3 py-1.5 pr-8 text-sm border border-muted/50 rounded-md focus:border-positive focus:border-transparent transition-all duration-200"
        />
        {unit && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};
