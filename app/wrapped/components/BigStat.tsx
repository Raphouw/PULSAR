import React from 'react';
import { LucideIcon } from 'lucide-react';

export const BigStat = ({ label, value, unit, color, icon: Icon }: { label: string, value: string | number, unit: string, color: string, icon: LucideIcon }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md w-full max-w-md shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform duration-500">
    <div className={`absolute top-0 left-0 w-full h-1`} style={{background: color}} />
    <div className={`p-6 rounded-full bg-${color}/10 border border-${color}/20 mb-6 group-hover:animate-pulse`} style={{color: color, boxShadow: `0 0 30px ${color}20`}}>
      <Icon size={48} />
    </div>
    <div className="text-sm font-bold tracking-[0.4em] text-gray-500 uppercase mb-2">{label}</div>
    <div className="text-7xl font-black text-white leading-none tracking-tight" style={{ textShadow: `0 0 40px ${color}60` }}>
      {value}
    </div>
    <div className="text-2xl font-bold text-gray-400 mt-2">{unit}</div>
  </div>
);