'use client';

import React from 'react';
import { useAnalysis } from '../context/AnalysisContext';

export default function DeepAnalysisButton() {
  // On récupère la commande et l'état depuis le contexte global
  const { runDeepAnalysis, isAnalyzing } = useAnalysis();

  if (isAnalyzing) {
    return (
      <button disabled style={{ ...buttonStyle, opacity: 0.5, cursor: 'default' }}>
        ⏳ Analyse en cours...
      </button>
    );
  }

  return (
    <button onClick={runDeepAnalysis} style={buttonStyle}>
      ⚡ Analyser l'historique (90j)
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  background: 'rgba(208, 79, 215, 0.1)',
  border: '1px solid #d04fd7',
  color: '#d04fd7',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600,
  transition: 'all 0.2s',
};