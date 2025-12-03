// Fichier : app/onboarding/OnboardingClient.tsx
'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { AlertCircle, Camera, Upload } from 'lucide-react';

// --- Helpers Zones ---
const getPowerZones = (ftp: number) => [
  { name: 'Z1 - Récupération', min: 0, max: Math.round(ftp * 0.55), color: '#a0a0a0' },
  { name: 'Z2 - Endurance', min: Math.round(ftp * 0.56), max: Math.round(ftp * 0.75), color: '#3b82f6' },
  { name: 'Z3 - Tempo', min: Math.round(ftp * 0.76), max: Math.round(ftp * 0.90), color: '#10b981' },
  { name: 'Z4 - Seuil (FTP)', min: Math.round(ftp * 0.91), max: Math.round(ftp * 1.05), color: '#f59e0b' },
  { name: 'Z5 - VO2 Max', min: Math.round(ftp * 1.06), max: Math.round(ftp * 1.20), color: '#ef4444' },
  { name: 'Z6 - Anaérobie', min: Math.round(ftp * 1.21), max: Math.round(ftp * 1.50), color: '#d04fd7' },
];

const getHeartRateZones = (fcMax: number, fcRest: number) => {
  if (!fcMax) return [];
  const hrr = fcMax - (fcRest || 0);
  const calc = (pct: number) => Math.round((hrr * pct) + (fcRest || 0));
  return [
    { name: 'Z1 - Récup', min: fcRest || 0, max: calc(0.60), color: '#a0a0a0' },
    { name: 'Z2 - Endurance', min: calc(0.60) + 1, max: calc(0.70), color: '#3b82f6' },
    { name: 'Z3 - Aérobie', min: calc(0.70) + 1, max: calc(0.80), color: '#10b981' },
    { name: 'Z4 - Seuil', min: calc(0.80) + 1, max: calc(0.90), color: '#f59e0b' },
    { name: 'Z5 - Max', min: calc(0.90) + 1, max: fcMax, color: '#ef4444' },
  ];
};

// --- COMPOSANTS UI ---

const OnboardingInput = ({ label, value, unit, onChange, color, placeholder, min, max, required = false }: any) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    if (valStr === '') { onChange(''); return; }
    const valNum = parseFloat(valStr);
    if (isNaN(valNum)) return;
    if (max && valNum > max) return; 
    onChange(valNum);
  };
  const handleBlur = () => {
    if (value === '' || value === null) return;
    let final = value;
    if (min && final < min) final = min;
    if (max && final > max) final = max;
    if (final !== value) onChange(final);
  };

  return (
    <div style={inputCardStyle}>
      <label style={inputLabelStyle}>
        {label} {required && <span style={{color:'#ef4444'}}>*</span>}
      </label>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
        <input type="number" value={value} onChange={handleInputChange} onKeyDown={handleKeyDown} onBlur={handleBlur} min={min} max={max}
          style={{...inputEditStyle, borderColor: value ? (color || 'var(--secondary)') : '#333'}} 
          placeholder={placeholder} />
        <span style={unitStyle}>{unit}</span>
      </div>
    </div>
  );
};

const OnboardingSelect = ({ label, value, onChange, options }: any) => (
  <div style={inputCardStyle}>
    <label style={inputLabelStyle}>{label} <span style={{color:'#ef4444'}}>*</span></label>
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{...inputEditStyle, fontSize:'1.2rem', padding:'0.7rem', cursor:'pointer'}}>
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const ZoneRow = ({ zone, isLast }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.5rem', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', marginBottom:'2px', borderRadius:'4px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: zone.color, boxShadow:`0 0 10px ${zone.color}40` }}></div>
      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{zone.name}</span>
    </div>
    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', fontFamily:'monospace' }}>{zone.max === undefined ? `> ${zone.min}` : `${zone.min} - ${zone.max}`}</div>
  </div>
);

// --- MAIN COMPONENT ---
export default function OnboardingClient({ user }: { user: any }) {
  const router = useRouter();
  const { update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Gestion Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    age: user.age || '',
    gender: user.gender || 'Homme',
    weight: user.weight || '',
    height: user.height || '',
    max_heart_rate: user.max_heart_rate || '',
    resting_heart_rate: user.resting_heart_rate || '',
    ftp: user.ftp || '',
    vo2max: user.vo2max || '', // Optionnel
  });

  const powerZones = useMemo(() => getPowerZones(Number(formData.ftp)), [formData.ftp]);
  const hrZones = useMemo(() => getHeartRateZones(Number(formData.max_heart_rate), Number(formData.resting_heart_rate)), [formData.max_heart_rate, formData.resting_heart_rate]);

  // --- Gestion du fichier Avatar ---
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file)); // Prévisualisation locale immédiate
    }
  };

  const validateForm = () => {
    if (!formData.age || formData.age < 10) return "Âge invalide.";
    if (!formData.weight || formData.weight < 40) return "Poids invalide.";
    if (!formData.height || formData.height < 80 || formData.height > 220) return "taille invalide.";
    if (!formData.max_heart_rate || formData.max_heart_rate < 100) return "FC Max invalide.";
    if (!formData.resting_heart_rate || formData.resting_heart_rate < 30) return "FC Repos invalide.";
    if (Number(formData.resting_heart_rate) >= Number(formData.max_heart_rate)) return "FC Repos doit être < FC Max.";
    if (!formData.ftp || formData.ftp < 50) return "FTP invalide.";
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const err = validateForm();
    if (err) { setError(err); return; }

    setIsLoading(true);
    try {
      // Construction du FormData pour envoi fichier + data
      const dataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
          dataToSend.append(key, String(value));
      });
      
      if (avatarFile) {
          dataToSend.append('avatar', avatarFile);
      }

      const res = await fetch('/api/users/onboarding', {
        method: 'POST',
        body: dataToSend, // Pas de Header Content-Type ici, le navigateur le gère pour le FormData
      });

      if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Erreur');
      }

      await update({ onboarding_completed: true });
      router.push('/dashboard');
      router.refresh();
      window.location.href = "/dashboard";

    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, val: any) => setFormData(prev => ({ ...prev, [field]: val }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* BANDEAU ERREUR */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
            <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* GROUPE 1 : IDENTITÉ & AVATAR */}
      <div style={containerStyle}>
         <h3 style={sectionHeaderStyle}>👤 Identité</h3>
         
         <div style={{display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'2rem'}}>
            <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                    width: '120px', height: '120px', borderRadius: '50%',
                    border: '4px solid var(--accent)', cursor: 'pointer',
                    backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden'
                }}
            >
                {!avatarPreview && <Upload size={30} color="#aaa" />}
                
                {/* Overlay Caméra au survol ou toujours visible */}
                <div style={{
                    position:'absolute', bottom:0, left:0, right:0, height:'35%',
                    background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                    <Camera size={18} color="white" />
                </div>
            </div>
            <input 
                type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" 
                style={{display:'none'}} 
            />
            <small style={{marginTop:'10px', color:'var(--text-secondary)'}}>Cliquez pour ajouter une photo</small>
         </div>

         <div style={paramsGridStyle}>
            <OnboardingInput label="Âge" value={formData.age} unit="ans" placeholder="30" min={10} max={100} required onChange={(v:any) => updateField('age', v)} />
            <OnboardingSelect label="Genre" value={formData.gender} options={['Homme', 'Femme', 'Autre']} onChange={(v:any) => updateField('gender', v)} />
            <OnboardingInput label="Poids" value={formData.weight} unit="kg" color="#10b981" placeholder="70" min={40} max={150} required onChange={(v:any) => updateField('weight', v)} />
            <OnboardingInput label="Taille" value={formData.height} unit="cm" color="#10b0b9ff" placeholder="175" min={80} max={220} required onChange={(v:any) => updateField('height', v)} />

         </div>
      </div>

      {/* GROUPE 2 : CARDIO & ZONES */}
      <div style={containerStyle}>
         <h3 style={sectionHeaderStyle}>❤️ Cardio</h3>
         <div style={paramsGridStyle}>
            <OnboardingInput label="FC Max" value={formData.max_heart_rate} unit="bpm" color="#ef4444" placeholder="190" min={100} max={250} required onChange={(v:any) => updateField('max_heart_rate', v)} />
            <OnboardingInput label="FC Repos" value={formData.resting_heart_rate} unit="bpm" color="#3b82f6" placeholder="50" min={30} max={120} required onChange={(v:any) => updateField('resting_heart_rate', v)} />
         </div>
         
         {/* VISUALISATION DES ZONES CARDIO */}
         <div style={{marginTop:'2rem'}}>
            <h4 style={{fontSize:'0.9rem', color:'var(--text-secondary)', textTransform:'uppercase', marginBottom:'10px'}}>Vos Zones Cardiaques</h4>
            <div style={{opacity: formData.max_heart_rate ? 1 : 0.5}}>
                {formData.max_heart_rate ? hrZones.map((z, i) => <ZoneRow key={i} zone={z} isLast={i===hrZones.length-1} />) 
                : <div style={{textAlign:'center', padding:'1rem', background:'rgba(255,255,255,0.02)', borderRadius:'8px', color:'#666'}}>Remplissez la FC Max pour voir vos zones</div>}
            </div>
         </div>
      </div>

      {/* GROUPE 3 : PERFORMANCE & ZONES */}
      <div style={containerStyle}>
         <h3 style={sectionHeaderStyle}>⚡ Performance</h3>
         <div style={paramsGridStyle}>
            <OnboardingInput label="FTP" value={formData.ftp} unit="W" color="#f59e0b" placeholder="250" min={50} max={600} required onChange={(v:any) => updateField('ftp', v)} />
            <OnboardingInput label="VO2 Max (Est.)" value={formData.vo2max} unit="ml/kg" placeholder="Optionnel" min={20} max={100} onChange={(v:any) => updateField('vo2max', v)} />
         </div>

         {/* VISUALISATION DES ZONES PUISSANCE */}
         <div style={{marginTop:'2rem'}}>
            <h4 style={{fontSize:'0.9rem', color:'var(--text-secondary)', textTransform:'uppercase', marginBottom:'10px'}}>Vos Zones de Puissance</h4>
            <div style={{opacity: formData.ftp ? 1 : 0.5}}>
                {formData.ftp ? powerZones.map((z, i) => <ZoneRow key={i} zone={z} isLast={i===powerZones.length-1} />) 
                : <div style={{textAlign:'center', padding:'1rem', background:'rgba(255,255,255,0.02)', borderRadius:'8px', color:'#666'}}>Remplissez la FTP pour voir vos zones</div>}
            </div>
         </div>
      </div>

      <button onClick={handleSubmit} disabled={isLoading} style={submitBtnStyle}>
        {isLoading ? 'Configuration en cours...' : 'Valider le Profil →'}
      </button>

    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--secondary)', borderRadius: '16px', padding: '1.5rem' };
const paramsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem' };
const inputCardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--secondary)', borderRadius: '12px', padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const inputLabelStyle: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 };
const inputEditStyle: React.CSSProperties = { background: 'rgba(0,0,0,0.3)', border: '2px solid var(--secondary)', color: 'var(--text)', padding: '0.5rem', fontSize: '1.4rem', fontWeight: '800', width: '100%', textAlign: 'center', borderRadius: '8px', outline: 'none' };
const unitStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '6px' };
const sectionHeaderStyle: React.CSSProperties = { margin: '0 0 1.5rem 0', color: 'var(--accent)', fontSize: '1.2rem', fontWeight: 800, borderBottom:'1px solid var(--secondary)', paddingBottom:'10px' };
const submitBtnStyle: React.CSSProperties = { background: 'linear-gradient(90deg, #d04fd7 0%, #9c27b0 100%)', border: 'none', color: 'white', padding: '1.2rem', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 800, cursor: 'pointer', width: '100%', marginTop:'1rem', boxShadow: '0 4px 20px rgba(208, 79, 215, 0.4)' };