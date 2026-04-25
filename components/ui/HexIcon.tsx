'use client';

import { LucideIcon } from 'lucide-react';

interface HexIconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
  iconColor?: string;
}

export default function HexIcon({ icon: Icon, size = 28, className = '', iconColor = '#23D3FF' }: HexIconProps) {
  return (
    <div
      className={`relative flex items-center justify-center w-16 h-16 ${className}`}
      style={{
        clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <Icon size={size} color={iconColor} strokeWidth={1.8} />
    </div>
  );
}
