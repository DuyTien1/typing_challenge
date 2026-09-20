import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { soundFx } from '../utils/audio';

export interface CustomNumberInputProps {
  id?: string;
  value: number;
  onChange: (val: number) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  placeholder?: string;
  focusBorderColor?: string;
  size?: 'sm' | 'md';
}

export const CustomNumberInput = React.forwardRef<HTMLInputElement, CustomNumberInputProps>(({
  id,
  value,
  onChange,
  onBlur,
  onKeyDown,
  min = 0,
  max = 999999,
  step = 1,
  className = 'w-full',
  inputClassName = '',
  disabled = false,
  placeholder,
  focusBorderColor = 'focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/40',
  size = 'md',
}, ref) => {
  const [textVal, setTextVal] = useState<string>(String(value ?? 0));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external value
  useEffect(() => {
    if (value !== undefined && value !== null && !isNaN(value)) {
      if (Number(textVal) !== value) {
        setTextVal(String(value));
      }
    }
  }, [value]);

  const getDecimals = (num: number) => {
    const str = String(num);
    const dotIndex = str.indexOf('.');
    return dotIndex >= 0 ? str.length - dotIndex - 1 : 0;
  };

  const decimals = Math.max(getDecimals(step), getDecimals(value));

  const handleStep = useCallback(
    (direction: 'up' | 'down') => {
      if (disabled) return;
      soundFx.playKeyClick();
      const current = Number(textVal);
      const currentNum = isNaN(current) ? (min ?? 0) : current;
      const delta = direction === 'up' ? step : -step;
      let next = currentNum + delta;

      if (decimals > 0) {
        next = Number(next.toFixed(decimals));
      }

      if (min !== undefined && next < min) next = min;
      if (max !== undefined && next > max) next = max;

      setTextVal(String(next));
      onChange(next);
    },
    [disabled, textVal, min, max, step, decimals, onChange]
  );

  const startContinuousStep = (direction: 'up' | 'down') => {
    if (disabled) return;
    handleStep(direction);
    stopContinuousStep();

    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        handleStep(direction);
      }, 70);
    }, 280);
  };

  const stopContinuousStep = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopContinuousStep();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextVal(val);

    if (val === '' || val === '-') {
      return;
    }

    const parsed = Number(val);
    if (!isNaN(parsed)) {
      let finalVal = parsed;
      if (max !== undefined && finalVal > max) finalVal = max;
      onChange(finalVal);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let parsed = Number(textVal);
    if (isNaN(parsed) || textVal.trim() === '') {
      parsed = min ?? 0;
    }
    if (min !== undefined && parsed < min) parsed = min;
    if (max !== undefined && parsed > max) parsed = max;

    if (decimals > 0) {
      parsed = Number(parsed.toFixed(decimals));
    }

    setTextVal(String(parsed));
    onChange(parsed);
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let parsed = Number(textVal);
      if (isNaN(parsed) || textVal.trim() === '') {
        parsed = min ?? 0;
      }
      if (min !== undefined && parsed < min) parsed = min;
      if (max !== undefined && parsed > max) parsed = max;

      if (decimals > 0) {
        parsed = Number(parsed.toFixed(decimals));
      }

      setTextVal(String(parsed));
      onChange(parsed);
    }
    onKeyDown?.(e);
  };

  const isUpDisabled = disabled || (max !== undefined && Number(textVal) >= max);
  const isDownDisabled = disabled || (min !== undefined && Number(textVal) <= min);

  const isSmall = size === 'sm';

  return (
    <div
      className={`relative flex items-stretch bg-slate-900 border border-slate-700/90 rounded-xl overflow-hidden shadow-inner transition-all group ${
        disabled ? 'opacity-50 pointer-events-none' : 'hover:border-slate-600'
      } ${focusBorderColor} ${className}`}
    >
      <input
        ref={ref}
        id={id}
        type="number"
        value={textVal}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`w-full bg-transparent text-white font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
          isSmall ? 'px-2 py-1 text-xs text-center' : 'px-3 py-1.5 text-sm'
        } ${inputClassName}`}
      />

      {/* 2 Custom Increment/Decrement Buttons */}
      <div className="flex flex-col border-l border-slate-700/80 shrink-0 w-6 bg-slate-950/70 select-none">
        {/* Up Button (Tăng) */}
        <button
          type="button"
          tabIndex={-1}
          disabled={isUpDisabled}
          onMouseDown={() => startContinuousStep('up')}
          onMouseUp={stopContinuousStep}
          onMouseLeave={stopContinuousStep}
          onTouchStart={() => startContinuousStep('up')}
          onTouchEnd={stopContinuousStep}
          className={`flex-1 flex items-center justify-center text-slate-400 border-b border-slate-800/80 transition-all ${
            isUpDisabled
              ? 'opacity-20 cursor-not-allowed'
              : 'hover:text-amber-300 hover:bg-amber-500/20 active:bg-amber-500 active:text-black cursor-pointer'
          }`}
          title="Tăng"
        >
          <ChevronUp className="w-3 h-3 stroke-[2.5]" />
        </button>

        {/* Down Button (Giảm) */}
        <button
          type="button"
          tabIndex={-1}
          disabled={isDownDisabled}
          onMouseDown={() => startContinuousStep('down')}
          onMouseUp={stopContinuousStep}
          onMouseLeave={stopContinuousStep}
          onTouchStart={() => startContinuousStep('down')}
          onTouchEnd={stopContinuousStep}
          className={`flex-1 flex items-center justify-center text-slate-400 transition-all ${
            isDownDisabled
              ? 'opacity-20 cursor-not-allowed'
              : 'hover:text-amber-300 hover:bg-amber-500/20 active:bg-amber-500 active:text-black cursor-pointer'
          }`}
          title="Giảm"
        >
          <ChevronDown className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
});

CustomNumberInput.displayName = 'CustomNumberInput';
