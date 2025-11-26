// Fichier : app/components/ui/percentageBar.tsx
'use client';

import React from 'react';

type PercentageBarProps = {
  value: number; // Le pourcentage de la partie GAUCHE (ex: 87% Pédalage)
  color?: string;
  labels: {
    left: string; // Ex: "Pédalage"
    right: string; // Ex: "Roue Libre"
  };
};

export const PercentageBar: React.FC<PercentageBarProps> = ({
  value,
  color = 'var(--accent)',
  labels,
}) => {
  const percentLeft = value.toFixed(1);
  const percentRight = (100 - value).toFixed(1);

  return (
    <div style={{ width: '100%', color: 'var(--text-secondary)', fontSize: 12, marginTop: '8px' }}>
      {/* Labels (au-dessus) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>{labels.left} ({percentLeft}%)</span>
        <span>{labels.right} ({percentRight}%)</span>
      </div>
      
      {/* Barre (inversée) */}
      <div style={barContainerStyle}>
        {/* Barre de GAUCHE (Pédalage) */}
        <div style={{ ...barSegmentStyle, width: `${percentLeft}%`, background: color }} />
        {/* Barre de DROITE (Roue libre) */}
        <div style={{ ...barSegmentStyle, width: `${percentRight}%`, background: 'var(--secondary)' }} />
      </div>
    </div>
  );
};

// --- Styles ---
const barContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '10px',
  display: 'flex',
  borderRadius: '5px',
  overflow: 'hidden',
  background: 'var(--secondary)',
};

const barSegmentStyle: React.CSSProperties = {
  height: '100%',
  transition: 'width 0.3s',
};