// Fichier : app/dashboard/NewRecordModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti'; // npm install react-confetti si pas installé

type RecordData = { duration: number; value: number; old: number; type: string };

export default function NewRecordModal({ records, onClose }: { records: RecordData[], onClose: () => void }) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  if (!records || records.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />
      
      <div style={{
        background: '#1e1e2e', border: '2px solid #d04fd7', borderRadius: '20px',
        padding: '2rem', maxWidth: '500px', width: '90%', textAlign: 'center',
        boxShadow: '0 0 50px rgba(208, 79, 215, 0.4)',
        animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <h2 style={{ 
          fontSize: '2rem', fontWeight: 900, margin: '0 0 1rem 0',
          background: 'linear-gradient(45deg, #fff, #d04fd7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          NOUVEAU RECORD !
        </h2>
        <p style={{ color: '#aaa', marginBottom: '2rem' }}>
          Félicitations ! Vous venez de battre vos références historiques.
        </p>

        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          {records.map((rec, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', color: '#d04fd7', fontWeight: 700, textTransform: 'uppercase' }}>{rec.type}</div>
                <div style={{ fontSize: '0.7rem', color: '#666' }}>Ancien: {rec.old} W</div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                {rec.value} <span style={{ fontSize: '0.8rem', color: '#d04fd7' }}>W</span>
              </div>
              <div style={{ 
                background: '#10b981', color: '#000', fontWeight: 700, fontSize: '0.7rem', 
                padding: '2px 6px', borderRadius: '4px' 
              }}>
                +{rec.value - rec.old} W
              </div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          background: '#d04fd7', color: '#fff', border: 'none', padding: '1rem 2rem',
          fontSize: '1rem', fontWeight: 700, borderRadius: '50px', cursor: 'pointer',
          boxShadow: '0 10px 20px rgba(208, 79, 215, 0.3)', transition: 'transform 0.1s',
          width: '100%'
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          CONTINUER À PROGRESSER
        </button>
      </div>
    </div>
  );
}