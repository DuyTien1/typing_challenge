import React from 'react';

interface GhostCaretProps {
  caretPos: { x: number; y: number; height?: number } | null;
  label?: string;
  wpm?: number;
}

export const GhostCaret: React.FC<GhostCaretProps> = React.memo(({ caretPos, label, wpm }) => {
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
    </div>
  );
});
