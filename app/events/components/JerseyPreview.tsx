// Fichier : app/events/components/JerseyPreview.tsx
'use client';
import { Shirt } from 'lucide-react';

export default function JerseyPreview({ url }: { url?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '20px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ fontSize: '0.7rem', color: '#d04fd7', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem', zIndex: 2 }}>
        Kit Officiel
      </div>
      
      {url ? (
        <div style={{ width: '100%', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
            <img src={url} alt="Maillot Officiel" style={{ maxHeight: '100%', maxWidth: '100%', filter: 'drop-shadow(0 0 15px rgba(208, 79, 215, 0.3))' }} />
        </div>
      ) : (
        <div style={{ width: '100%', height: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#333', gap: '10px', zIndex: 2 }}>
           <Shirt size={48} />
           <span style={{fontSize: '0.8rem'}}>Visuel non disponible</span>
        </div>
      )}

      {/* Effets de fond Cyberpunk */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '120px', height: '120px', background: '#d04fd7', filter: 'blur(80px)', opacity: 0.15, zIndex: 1 }} />
    </div>
  );
}