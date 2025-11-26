// Fichier : components/ui/GlassCard.tsx
'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

// Composant de base pour l'esthétique Cyberpunk/Glassmorphism (Dark Mode)
const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        bg-[#2B2B3A]/50 backdrop-blur-md border border-[#2B2B3A]/80
        shadow-lg shadow-black/50 hover:border-[#FFD166]/50
        rounded-xl p-6 transition-all duration-300 relative overflow-hidden
        ${className}
      `}
      style={{
        // Simulation d'une lueur subtile pour le glassmorphism
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 209, 102, 0.05)',
      }}
    >
      {children}
    </div>
  );
};

export default GlassCard;