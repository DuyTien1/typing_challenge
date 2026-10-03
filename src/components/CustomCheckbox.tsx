import React from 'react';
import { Check } from 'lucide-react';
import { soundFx } from '../utils/audio';

export interface CustomCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  sampleBadge?: string;
  icon?: React.ReactNode;
  accentColor?: 'orange' | 'purple' | 'amber' | 'cyan' | 'emerald' | 'rose';
  disabled?: boolean;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  sampleBadge,
  icon,
  accentColor = 'cyan',
  disabled = false,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    soundFx.playKeyClick();
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      soundFx.playKeyClick();
      onChange(!checked);
    }
  };

  // Color mappings based on accentColor
  const colorStyles = {
    cyan: {
      cardActive: 'bg-cyan-950/20 border-cyan-500/60 shadow-lg shadow-cyan-950/30',
      boxChecked: 'bg-gradient-to-br from-cyan-400 to-blue-600 border-cyan-400 text-slate-950',
      boxUnchecked: 'border-slate-700 bg-slate-900 group-hover:border-cyan-500/50',
      badge: 'bg-cyan-950/60 border-cyan-800/60 text-cyan-300',
      glowRing: 'ring-1 ring-cyan-500/30',
    },
    orange: {
      cardActive: 'bg-orange-950/25 border-orange-500/60 shadow-lg shadow-orange-950/30',
      boxChecked: 'bg-gradient-to-br from-orange-400 to-amber-600 border-orange-400 text-slate-950',
      boxUnchecked: 'border-slate-700 bg-slate-900 group-hover:border-orange-500/50',
      badge: 'bg-orange-950/60 border-orange-800/60 text-orange-300',
      glowRing: 'ring-1 ring-orange-500/30',
    },
    purple: {
      cardActive: 'bg-purple-950/25 border-purple-500/60 shadow-lg shadow-purple-950/30',
      boxChecked: 'bg-gradient-to-br from-purple-400 to-pink-600 border-purple-400 text-white',
      boxUnchecked: 'border-slate-700 bg-slate-900 group-hover:border-purple-500/50',
      badge: 'bg-purple-950/60 border-purple-800/60 text-purple-300',
      glowRing: 'ring-1 ring-purple-500/30',
    },
    amber: {
      cardActive: 'bg-amber-950/25 border-amber-500/60 shadow-lg shadow-amber-950/30',
      boxChecked: 'bg-gradient-to-br from-amber-400 to-yellow-600 border-amber-400 text-slate-950',
      boxUnchecked: 'border-slate-700 bg-slate-900 group-hover:border-amber-500/50',
      badge: 'bg-amber-950/60 border-amber-800/60 text-amber-300',
      glowRing: 'ring-1 ring-amber-500/30',
    },
    emerald: {
      cardActive: 'bg-emerald-950/25 border-emerald-500/60 shadow-lg shadow-emerald-950/30',
      boxChecked: 'bg-gradient-to-br from-emerald-400 to-teal-600 border-emerald-400 text-slate-950',
      boxUnchecked: 'border-slate-700 bg-slate-900 group-hover:border-emerald-500/50',
      badge: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300',
      glowRing: 'ring-1 ring-emerald-500/30',
    },
    rose: {
      cardActive: 'bg-rose-950/25 border-rose-500/60 shadow-lg shadow-rose-950/30',
      boxChecked: 'bg-gradient-to-br from-rose-400 to-red-600 border-rose-400 text-white',
      boxUnchecked: 'border-slate-700 bg-slate-900 group-hover:border-rose-500/50',
      badge: 'bg-rose-950/60 border-rose-800/60 text-rose-300',
      glowRing: 'ring-1 ring-rose-500/30',
    },
  }[accentColor];

  return (
    <div
      id={id}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative p-3.5 rounded-xl border transition-all select-none cursor-pointer flex items-start gap-3 ${
        checked
          ? `${colorStyles.cardActive} ${colorStyles.glowRing}`
          : 'bg-slate-950/90 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Custom Cyber Checkbox Square */}
      <div className="pt-0.5 shrink-0">
        <div
          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-150 shadow-sm ${
            checked
              ? `${colorStyles.boxChecked} scale-100 shadow-sm`
              : `${colorStyles.boxUnchecked} scale-95`
          }`}
        >
          {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      </div>

      {/* Label and Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
            <span
              className={`text-xs font-bold transition-colors ${
                checked ? 'text-white' : 'text-slate-300 group-hover:text-white'
              }`}
            >
              {label}
            </span>
          </div>

          {sampleBadge && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border shrink-0 ${colorStyles.badge}`}
            >
              {sampleBadge}
            </span>
          )}
        </div>

        {description && (
          <p className="text-[11px] text-slate-400 leading-snug mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
