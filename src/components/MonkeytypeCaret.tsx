import React from 'react';

interface MonkeytypeCaretProps {
  caretPos: { x: number; y: number; height?: number } | null;
  isTyping: boolean;
  isFocused?: boolean;
  colorClass?: string;
  glowColor?: string;
}

export const MonkeytypeCaret: React.FC<MonkeytypeCaretProps> = ({
  caretPos,
  isTyping,
  isFocused = true,
  colorClass = 'bg-amber-400',
  glowColor = 'rgba(251, 191, 36, 0.85)',
}) => {
  if (!caretPos) return null;

  return (
    <div
      id="monkeytype-caret"
      className={`monkeytype-caret ${!isTyping ? 'blinking' : ''} ${colorClass}`}
      style={{
        transform: `translate3d(${caretPos.x}px, ${caretPos.y}px, 0)`,
        height: `${caretPos.height || 28}px`,
        opacity: isFocused ? 1 : 0.25,
        boxShadow: `0 0 10px ${glowColor}`,
      }}
    />
  );
};
