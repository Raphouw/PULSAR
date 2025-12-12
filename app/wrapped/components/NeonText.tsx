import React from 'react';

export const NeonText = ({ children, color = '#d04fd7', size = "text-6xl" }: { children: React.ReactNode, color?: string, size?: string }) => (
  <h1 className={`${size} font-black italic tracking-tighter`} style={{ 
    color: 'transparent', 
    WebkitTextStroke: `2px ${color}`,
    textShadow: `0 0 30px ${color}40`
  }}>{children}</h1>
);