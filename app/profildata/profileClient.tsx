// Fichier : app/profildata/profileClient.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, Tab } from '../../components/ui/tabs';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  weight: number;
  ftp: number;
  max_heart_rate?: number;
  resting_heart_rate?: number;
  avatar_url: string | null;
  created_at: string;
  w_prime?: number;
  vo2max?: number;
  cp3?: number;
  cp12?: number;
  tte?: number;
};

// --- Helpers Zones (Inchangés) ---
const getPowerZones = (ftp: number) => [
  { name: 'Z1 - Récupération', min: 0, max: Math.round(ftp * 0.55), color: '#a0a0a0' },
  { name: 'Z2 - Endurance', min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75), color: '#3b82f6' },
  { name: 'Z3 - Tempo', min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.90), color: '#10b981' },
  { name: 'Z4 - Seuil (FTP)', min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05), color: '#f59e0b' },
  { name: 'Z5 - VO2 Max', min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.20), color: '#ef4444' },
  { name: 'Z6 - Anaérobie', min: Math.round(ftp * 1.21), max: Math.round(ftp * 1.50), color: '#d04fd7' },
  { name: 'Z7 - Neuromusculaire', min: Math.round(ftp * 1.50), max: 9999, color: '#8b5cf6' },
];

const getHeartRateZones = (fcMax: number, fcRest: number) => {
  const hrr = fcMax - fcRest;
  const calc = (pct: number) => Math.round((hrr * pct) + fcRest);
  return [
    { name: 'Z1 - Récup', min: fcRest, max: calc(0.60), color: '#a0a0a0' },
    { name: 'Z2 - Endurance', min: calc(0.60) + 1, max: calc(0.70), color: '#3b82f6' },
    { name: 'Z3 - Aérobie', min: calc(0.70) + 1, max: calc(0.80), color: '#10b981' },
    { name: 'Z4 - Seuil', min: calc(0.80) + 1, max: calc(0.90), color: '#f59e0b' },
    { name: 'Z5 - Max', min: calc(0.90) + 1, max: fcMax, color: '#ef4444' },
  ];
};

// --- SOUS-COMPOSANTS ---

const InputCard = ({ label, value, unit, onChange, isEditing, color = 'var(--text)' }: any) => {
  // Helper pour gérer l'input proprement (évite le NaN quand vide)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Si vide, on passe 0 ou une chaine vide, sinon on parse
      onChange(val === '' ? 0 : parseFloat(val));
  };

  return (
    <div style={inputCardStyle}>
      <label style={inputLabelStyle}>{label}</label>
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
          <input 
            type="number" 
            value={value || ''} // Affiche vide si 0 ou null
            onChange={handleChange} 
            style={inputEditStyle} 
            placeholder="0"
          />
          <span style={unitStyle}>{unit}</span>
        </div>
      ) : (
        <div style={{ ...valueStyle, color }}>
          {value} <span style={unitStyle}>{unit}</span>
        </div>
      )}
    </div>
  );
};

const ZoneRow = ({ zone, index, isLast }: any) => (
  <div style={{ 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0.5rem',
    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
    background: index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: zone.color }}></div>
      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{zone.name}</span>
    </div>
    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text)' }}>
      {zone.max === 9999 ? `> ${zone.min}` : `${zone.min} - ${zone.max}`}
    </div>
  </div>
);

// --- COMPOSANT PRINCIPAL ---
export default function ProfileClient({ user, isStravaConnected }: { user: UserProfile, isStravaConnected: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    weight: user.weight || 70,
    ftp: user.ftp || 200,
    max_heart_rate: user.max_heart_rate || 190,
    resting_heart_rate: user.resting_heart_rate || 60,
  });

  const powerZones = useMemo(() => getPowerZones(formData.ftp), [formData.ftp]);
  const hrZones = useMemo(() => getHeartRateZones(formData.max_heart_rate, formData.resting_heart_rate), [formData.max_heart_rate, formData.resting_heart_rate]);
  const wKg = formData.weight > 0 ? (formData.ftp / formData.weight).toFixed(2) : '0.00';

  const handleSave = async () => {
    // 🔥 SÉCURITÉ CLIENT : On empêche l'envoi si 0 ou invalide
    if (formData.weight <= 0 || formData.ftp <= 0) {
        alert("Le poids et la FTP doivent être supérieurs à 0.");
        return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      // 🔥 GESTION D'ERREUR AMÉLIORÉE
      if (!res.ok) {
         const errorData = await res.json();
         throw new Error(errorData.error || 'Erreur sauvegarde');
      }

      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* HEADER IDENTITÉ */}
      <div style={headerCardStyle}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ 
                    width: '80px', height: '80px', borderRadius: '50%', 
                    backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    border: '2px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem', color: 'var(--text-secondary)', background: 'var(--secondary)'
                }}>
                    {!user.avatar_url && user.name?.charAt(0)}
                </div>
                <div>
                <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '1.8rem' }}>{user.name}</h2>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.9rem', alignItems: 'center' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{wKg} W/kg</span>
                    {isStravaConnected && <span style={{ color: '#FC4C02', fontWeight: 600 }}>Connecté Strava</span>}
                </div>
                </div>
            </div>
         </div>
      </div>

      <Tabs>
        {/* --- ONGLET 1 : RÉGLAGES & ZONES --- */}
        <Tab label="Configuration & Zones">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
            
            {/* SECTION 1 : PARAMÈTRES */}
            <div style={containerStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={sectionTitleStyle}>Paramètres Physiologiques</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ces valeurs définissent vos zones d'entraînement.</p>
                    </div>
                    {!isEditing ? (
                        <button onClick={() => setIsEditing(true)} style={editButtonStyle}>Modifier</button>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => setIsEditing(false)} style={cancelButtonStyle}>Annuler</button>
                            <button onClick={handleSave} disabled={isLoading} style={saveButtonStyle}>
                            {isLoading ? '...' : 'Sauvegarder'}
                            </button>
                        </div>
                    )}
                </div>
                
                {/* GRILLE PARAMÈTRES */}
                <div style={paramsGridStyle}>
                    <InputCard 
                      label="Poids" value={formData.weight} unit="kg" color="#10b981" 
                      isEditing={isEditing} onChange={(v: number) => setFormData({...formData, weight: v})} 
                    />
                    <InputCard 
                      label="FTP (Seuil)" value={formData.ftp} unit="W" color="var(--accent)" 
                      isEditing={isEditing} onChange={(v: number) => setFormData({...formData, ftp: v})} 
                    />
                    <InputCard 
                      label="FC Max" value={formData.max_heart_rate} unit="bpm" color="#ef4444" 
                      isEditing={isEditing} onChange={(v: number) => setFormData({...formData, max_heart_rate: v})} 
                    />
                    <InputCard 
                      label="FC Repos" value={formData.resting_heart_rate} unit="bpm" color="#3b82f6" 
                      isEditing={isEditing} onChange={(v: number) => setFormData({...formData, resting_heart_rate: v})} 
                    />
                </div>
            </div>

            {/* SECTION 2 : ZONES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                
                {/* ZONES PUISSANCE */}
                <div style={containerStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid var(--secondary)', paddingBottom: '0.5rem' }}>
                        <h3 style={sectionTitleStyle}>Zones de Puissance</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Basées sur {formData.ftp} W</span>
                    </div>
                    <div>
                        {powerZones.map((zone, index) => (
                            <ZoneRow key={index} zone={zone} index={index} isLast={index === powerZones.length - 1} />
                        ))}
                    </div>
                </div>

                {/* ZONES CARDIO */}
                <div style={containerStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid var(--secondary)', paddingBottom: '0.5rem' }}>
                        <h3 style={sectionTitleStyle}>Zones Cardiaques (Karvonen)</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max: {formData.max_heart_rate} / Repos: {formData.resting_heart_rate}</span>
                    </div>
                    <div>
                        {hrZones.map((zone, index) => (
                            <ZoneRow key={index} zone={zone} index={index} isLast={index === hrZones.length - 1} />
                        ))}
                    </div>
                </div>
            </div>

          </div>
        </Tab>

        {/* --- ONGLET 2 : TOUTES LES STATS (Améliorée) --- */}
        <Tab label="Toutes les Statistiques">
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                
                <div style={detailCardStyle}>
                    <h4 style={detailTitleStyle}>👤 Identité</h4>
                    <div style={detailRowStyle}><span>Nom</span> <span style={{color: 'var(--text)'}}>{user.name}</span></div>
                    <div style={detailRowStyle}><span>Email</span> <span style={{color: 'var(--text)'}}>{user.email}</span></div>
                    <div style={detailRowStyle}><span>Compte créé</span> <span style={{color: 'var(--text)'}}>{new Date(user.created_at).toLocaleDateString()}</span></div>
                </div>

                <div style={detailCardStyle}>
                    <h4 style={detailTitleStyle}>🧬 Physiologie</h4>
                    <div style={detailRowStyle}><span>Poids</span> <strong style={{color: '#10b981'}}>{user.weight} kg</strong></div>
                    <div style={detailRowStyle}><span>FTP</span> <strong style={{color: '#3b82f6'}}>{user.ftp} W</strong></div>
                    <div style={detailRowStyle}><span>W/kg</span> <strong style={{color: '#d04fd7'}}>{wKg} W/kg</strong></div>
                    <div style={detailRowStyle}><span>VO2max (Est.)</span> <strong style={{color: '#f59e0b'}}>{user.vo2max?.toFixed(1) ?? '-'} ml/kg/min</strong></div>
                    <div style={detailRowStyle}><span>W' (Réserve)</span> <strong style={{color: '#f97316'}}>{user.w_prime ? (user.w_prime / 1000).toFixed(1) : '-'} kJ</strong></div>
                </div>

                <div style={detailCardStyle}>
                    <h4 style={detailTitleStyle}>❤️ Cardio</h4>
                    <div style={detailRowStyle}><span>FC Max</span> <strong style={{color: '#ef4444'}}>{user.max_heart_rate ?? '-'} bpm</strong></div>
                    <div style={detailRowStyle}><span>FC Repos</span> <strong style={{color: '#10b981'}}>{user.resting_heart_rate ?? '-'} bpm</strong></div>
                </div>

                <div style={detailCardStyle}>
                    <h4 style={detailTitleStyle}>⚡ Records (Modèle)</h4>
                    <div style={detailRowStyle}><span>CP3 (3 min)</span> <strong style={{color: '#8b5cf6'}}>{user.cp3 ?? '-'} W</strong></div>
                    <div style={detailRowStyle}><span>CP12 (12 min)</span> <strong style={{color: '#8b5cf6'}}>{user.cp12 ?? '-'} W</strong></div>
                    <div style={detailRowStyle}><span>TTE</span> <strong style={{color: '#a0a0a0'}}>{user.tte ? `${(user.tte/60).toFixed(0)} min` : '-'}</strong></div>
                </div>

            </div>
        </Tab>
      </Tabs>
    </div>
  );
}

// --- STYLES ---
const headerCardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--secondary)',
  borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};
const containerStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--secondary)',
  borderRadius: '16px', padding: '1.5rem',
};
const paramsGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem',
};
const inputCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--secondary)',
  borderRadius: '12px', padding: '1.2rem', textAlign: 'center',
  display: 'flex', flexDirection: 'column', gap: '0.5rem'
};
const inputLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px'
};
const valueStyle: React.CSSProperties = {
  fontSize: '1.8rem', fontWeight: '800', lineHeight: 1
};
const inputEditStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent)', color: 'var(--text)',
  padding: '0.2rem 0.5rem', fontSize: '1.5rem', fontWeight: 'bold', width: '100px', textAlign: 'center', borderRadius: '6px'
};
const unitStyle: React.CSSProperties = {
  fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: '4px'
};
const sectionTitleStyle: React.CSSProperties = {
  margin: 0, color: 'var(--text)', fontSize: '1.2rem', fontWeight: 700
};
const editButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--secondary)', color: 'var(--text)',
  padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
};
const saveButtonStyle: React.CSSProperties = {
  background: 'var(--accent)', border: 'none', color: '#fff',
  padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
};
const cancelButtonStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--text-secondary)',
  padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem'
};
const detailCardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--secondary)',
  borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'
};
const detailTitleStyle: React.CSSProperties = {
  margin: '0 0 0.5rem 0', color: 'var(--accent)', fontSize: '1.1rem', fontWeight: 700,
  borderBottom: '1px solid var(--secondary)', paddingBottom: '0.8rem'
};
const detailRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.95rem', padding: '0.2rem 0'
};