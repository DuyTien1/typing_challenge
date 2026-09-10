import React from 'react';

interface GhostCaretProps {
  caretPos: { x: number; y: number; height?: number } | null;
  label?: string;
  wpm?: number;
}

export const GhostCaret: React.FC<GhostCaretProps> = ({ caretPos, label, wpm }) => {
  if (!caretPos) return null;

  return (
    <div
      id="outplay-ghost-caret"
      className="absolute z-20 pointer-events-none transition-transform duration-75 ease-out"
      style={{
        transform: `translate3d(${caretPos.x}px, ${caretPos.y}px, 0)`,
      }}
    >
      {/* Ghost Caret Vertical Bar with glowing aura */}
      <div
        className="w-[3px] rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.95)] opacity-85"
        style={{ height: `${caretPos.height || 28}px` }}
      />

      {/* Floating Ghost Badge */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-cyan-400/60 text-[10px] font-mono text-cyan-300 shadow-lg whitespace-nowrap select-none backdrop-blur-sm">
        <span className="text-xs">👻</span>
        {label && <span className="font-bold tracking-tight">{label}</span>}
        {wpm !== undefined && wpm > 0 && <span className="text-cyan-400 font-bold">{wpm}wpm</span>}
      </div>
    </div>
  );
};
