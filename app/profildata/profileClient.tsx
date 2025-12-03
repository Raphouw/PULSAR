// Fichier : app/profildata/profileClient.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, Tab } from '../../components/ui/tabs';
import { 
  Bike, Calendar, TrendingUp, Weight, Wind, Mountain, Zap, Settings, Trophy, 
  Plus, X, Save, Gauge, Activity, Wrench, PenTool, ChevronRight, BarChart3, AlertCircle, CheckCircle2
} from 'lucide-react';

import {BikeIllustration} from './components/BikeIllustration';

// --- 1. TYPES & DONNÉES ---

type UserProfile = {
  id: string;
  name: string;
  email: string;
  weight: number;
  height: number;
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

type BikeType = 'Aero' | 'Grimpeur' | 'Endurance' | 'Gravel' | 'TT' | 'CLM' | 'VTT';

// Structure pour simuler l'historique kilométrique (Heatmap)
type MonthlyKm = { month: string, km: number }; // ex: "2023-05", 800

type BikeData = {
  id: number;
  name: string;
  brand: string;
  model: string;
  type: BikeType;
  colorHex: string; 
  weightKg: number;
  purchaseDate: string;
  retirementDate?: string; // null = actif
  totalKm: number;
  groupset: string;
  specs?: { aero: number; weight: number; comfort: number };
  maintenance?: { chain: number; tires: number; pads: number }; 
  monthlyKm?: MonthlyKm[]; // Pour la heatmap
};

// --- MOCK DATA (Avec historique mensuel pour la Heatmap) ---
const INITIAL_BIKES: BikeData[] = [
  {
    id: 1,
    name: "Le Chrono",
    brand: "Canyon",
    model: "Speedmax CFR",
    type: "CLM",
    colorHex: "#00f3ff",
    weightKg: 8.2,
    purchaseDate: "2023-01-15",
    retirementDate: "2024-06-01",
    totalKm: 4500,
    groupset: "SRAM Red AXS",
    specs: { aero: 100, weight: 60, comfort: 20 },
    maintenance: { chain: 80, tires: 90, pads: 100 },
    monthlyKm: Array.from({length: 18}, (_, i) => ({ month: `2023-${(i%12)+1}`, km: 250 })) // Simulation linéaire
  },
  {
    id: 2,
    name: "Tarmac SL8",
    brand: "Specialized",
    model: "S-Works",
    type: "Aero",
    colorHex: "#ff003c",
    weightKg: 6.8,
    purchaseDate: "2024-03-10",
    totalKm: 12500,
    groupset: "Dura-Ace Di2",
    specs: { aero: 90, weight: 90, comfort: 60 },
    maintenance: { chain: 45, tires: 60, pads: 80 },
    // Simulation: Gros volume l'été dernier
    monthlyKm: [
        { month: "2024-03", km: 400 }, { month: "2024-04", km: 800 }, 
        { month: "2024-05", km: 1200 }, { month: "2024-06", km: 1500 },
        { month: "2024-07", km: 1400 }, { month: "2024-08", km: 1000 }
    ]
  },
  {
    id: 3,
    name: "Grizl",
    brand: "Canyon",
    model: "CF SLX",
    type: "Gravel",
    colorHex: "#10b981",
    weightKg: 8.9,
    purchaseDate: "2022-06-01",
    retirementDate: "2023-02-01",
    totalKm: 3200,
    groupset: "GRX Di2",
    specs: { aero: 40, weight: 50, comfort: 95 },
    maintenance: { chain: 10, tires: 20, pads: 30 },
    monthlyKm: [{ month: "2022-06", km: 300 }, { month: "2022-07", km: 600 }]
  }
];

const NEON_COLORS = ["#ff003c", "#00f3ff", "#d04fd7", "#10b981", "#f59e0b", "#ffffff", "#8b5cf6", "#ef4444"];

// --- 2. HELPERS & LOGIQUE ---

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

const getBikeIcon = (type: string, color: string, size = 18) => {
    if (type === 'CLM' || type === 'TT') return <Zap size={size} color={color} />;
    if (type === 'Grimpeur') return <Mountain size={size} color={color} />;
    if (type === 'Gravel') return <TrendingUp size={size} color={color} />;
    if (type === 'Endurance') return <Activity size={size} color={color} />;
    return <Wind size={size} color={color} />;
};

// --- 4. COMPOSANT TIMELINE (HEATMAP DENSITY) ---

const GarageTimeline = ({ bikes, onBikeClick }: { bikes: BikeData[], onBikeClick: (b: BikeData) => void }) => {
    const [hoveredBikeId, setHoveredBikeId] = useState<number | null>(null);

    const dates = bikes.flatMap(b => [new Date(b.purchaseDate).getTime(), b.retirementDate ? new Date(b.retirementDate).getTime() : Date.now()]);
    const minDate = Math.min(...dates);
    const maxDate = Date.now();
    const totalDuration = maxDate - minDate;

    const paddingTime = totalDuration * 0.1; 
    const startScale = minDate - paddingTime;
    const endScale = maxDate + paddingTime;
    const scaleDuration = endScale - startScale;

    const getPos = (dateStr: string) => ((new Date(dateStr ? dateStr : Date.now()).getTime() - startScale) / scaleDuration) * 100;

    // 🔥 CALCUL DE LA HEATMAP DE DENSITÉ (KM CUMULÉS PAR MOIS)
    const heatmapBackground = useMemo(() => {
        const steps = 50; // Résolution de la heatmap
        let gradientString = "linear-gradient(90deg";
        
        for (let i = 0; i <= steps; i++) {
            const pct = i * (100/steps);
            const timeAtPct = startScale + (scaleDuration * (pct/100));
            const dateAtPct = new Date(timeAtPct);
            const currentMonthStr = `${dateAtPct.getFullYear()}-${dateAtPct.getMonth() + 1}`;
            
            // On calcule la somme des KM roulés ce mois-là (basé sur les mock data monthlyKm)
            let kmDensity = 0;
            bikes.forEach(b => {
                // Vérifier si le vélo était possédé à cette date
                const start = new Date(b.purchaseDate).getTime();
                const end = b.retirementDate ? new Date(b.retirementDate).getTime() : Date.now();
                
                if (timeAtPct >= start && timeAtPct <= end) {
                    // Si on a des données mensuelles, on les utilise
                    if (b.monthlyKm) {
                        // Recherche approximative ou exacte du mois
                        // Pour simplifier ici, on ajoute une valeur de base si le vélo est actif
                        kmDensity += 200; // Base de présence
                        // Si on avait la data précise :
                        // const mData = b.monthlyKm.find(m => m.month === currentMonthStr);
                        // if (mData) kmDensity += mData.km;
                    } else {
                        kmDensity += 200; // Valeur par défaut pour colorer
                    }
                }
            });

            // Mapping Densité -> Couleur (Noir -> Bleu -> Violet -> Rouge -> Blanc)
            let color = "rgba(255,255,255,0.02)"; // Vide
            if (kmDensity > 0) color = "rgba(0, 243, 255, 0.2)"; // Basse activité
            if (kmDensity > 300) color = "rgba(208, 79, 215, 0.5)"; // Moyenne
            if (kmDensity > 600) color = "rgba(255, 0, 60, 0.8)"; // Haute (Rouge)
            if (kmDensity > 1000) color = "#fff"; // Max (Blanc)

            gradientString += `, ${color} ${pct}%`;
        }
        gradientString += ")";
        return gradientString;
    }, [bikes, startScale, scaleDuration]);

    const startYear = new Date(minDate).getFullYear();
    const endYear = new Date(maxDate).getFullYear();
    const years = Array.from({ length: endYear - startYear + 2 }, (_, i) => startYear + i);

    return (
        <div style={{ position: 'relative', width: '100%', height: '465px', overflowX: 'auto', overflowY: 'hidden', padding: '20px 0', marginTop: '2rem', scrollbarWidth: 'none' }}>
            <div style={{ minWidth: '900px', height: '100%', position: 'relative' }}>
                
                {/* HEATMAP TRACK (La ligne qui change de couleur selon l'activité) */}
                <div style={{ 
                    position: 'absolute', bottom: '60px', left: '0', right: '0', height: '6px', 
                    background: heatmapBackground, 
                    borderRadius: '4px', 
                    boxShadow: '0 0 20px rgba(208, 79, 215, 0.1)', 
                    zIndex: 0 
                }}>
                    {/* Flèche au bout */}
                    <div style={{ position: 'absolute', right: '-5px', top: '-5px', width: '0', height: '0', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '12px solid rgba(255,255,255,0.3)' }} />
                </div>

                {/* ANNEES */}
                {years.map(year => {
                    const pos = getPos(`${year}-01-01`);
                    if (pos < 0 || pos > 100) return null;
                    return (
                        <div key={year} style={{ position: 'absolute', left: `${pos}%`, bottom: '35px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '1px', height: '15px', background: 'rgba(255,255,255,0.1)', marginBottom: '5px' }} />
                            <span style={{ color: '#666', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace' }}>{year}</span>
                        </div>
                    );
                })}

                {/* VÉLOS (Les cartes flottantes) */}
                {bikes.map((bike, index) => {
                    const startPos = getPos(bike.purchaseDate);
                    const endPos = getPos(bike.retirementDate || new Date().toISOString());
                    const centerPos = (startPos + endPos) / 2;
                    const isActive = !bike.retirementDate;
                    const isHovered = hoveredBikeId === bike.id;
                    const isDimmed = hoveredBikeId !== null && hoveredBikeId !== bike.id;
                    
                    const verticalOffset = (index % 2 === 0) ? '180px' : '290px'; 
                    const durationWidthPercent = endPos - startPos;

                    return (
                        <React.Fragment key={bike.id}>
                            {/* 1. BARRE DE PÉRIODE SUR LA TIMELINE (Visible au hover) */}
                            <div style={{
                                position: 'absolute', left: `${startPos}%`, bottom: '58px',
                                width: `${durationWidthPercent}%`, height: '10px',
                                background: bike.colorHex,
                                borderRadius: '4px',
                                opacity: isHovered ? 1 : 0,
                                boxShadow: `0 0 25px ${bike.colorHex}`,
                                transition: 'opacity 0.3s ease',
                                zIndex: 5,
                                pointerEvents: 'none'
                            }} />

                            {/* 2. TIGE DE CONNEXION (Laser) */}
                            <div style={{
                                position: 'absolute', left: `${centerPos}%`, bottom: '60px',
                                height: `calc(${verticalOffset} - 60px)`, width: '1px',
                                background: `linear-gradient(to top, ${bike.colorHex}, transparent)`,
                                opacity: isHovered ? 1 : 0.3, transition: 'all 0.3s',
                                transform: `translateX(-50%) scaleY(${isHovered ? 1 : 0.8})`,
                                transformOrigin: 'bottom',
                                zIndex: 2
                            }} />

                            {/* 3. CARTE FLOTTANTE */}
                            <div 
                                onMouseEnter={() => setHoveredBikeId(bike.id)}
                                onMouseLeave={() => setHoveredBikeId(null)}
                                onClick={() => onBikeClick(bike)}
                                style={{
                                    position: 'absolute', left: `${centerPos}%`, bottom: verticalOffset,
                                    transform: `translateX(-50%) scale(${isHovered ? 1.1 : 1})`,
                                    zIndex: isHovered ? 20 : 10,
                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    opacity: isDimmed ? 0.2 : 1,
                                    filter: isDimmed ? 'blur(2px) grayscale(100%)' : 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{
                                    width: '220px',
                                    background: 'rgba(20, 20, 30, 0.9)',
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${isHovered ? bike.colorHex : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: '16px',
                                    padding: '16px',
                                    boxShadow: isHovered ? `0 15px 35px -5px ${bike.colorHex}40` : '0 5px 15px rgba(0,0,0,0.5)',
                                    position: 'relative', overflow: 'hidden'
                                }}>
                                    {/* Illustration Vélo Générative */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', transform: 'scaleX(-1)' }}>
                                        <BikeIllustration type={bike.type} color={bike.colorHex} size={80} />
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{bike.brand}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{bike.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: bike.colorHex, marginTop: '4px', fontWeight: 600 }}>{bike.totalKm.toLocaleString()} KM</div>
                                    </div>

                                    {/* Badge Type */}
                                    <div style={{ 
                                        position: 'absolute', top: '10px', right: '10px', 
                                        fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                                        background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px'
                                    }}>
                                        {bike.type}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

// --- 5. AUTRES COMPOSANTS (Modals, Forms...) ---

const GlassModal = ({ isOpen, onClose, title, children }: any) => {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
            <div style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: '#141418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', padding: '0', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, rgba(255,255,255,0.03), transparent)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}><X size={24} /></button>
                </div>
                <div style={{ padding: '2rem' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const AddBikeForm = ({ onAdd, onCancel }: { onAdd: (bike: BikeData) => void, onCancel: () => void }) => {
    const [form, setForm] = useState<Partial<BikeData>>({
        name: '', brand: '', model: '', type: 'Aero', colorHex: '#d04fd7', weightKg: 7.5, groupset: '', purchaseDate: new Date().toISOString().split('T')[0], totalKm: 0
    });

    const handleSubmit = () => {
        if (!form.name || !form.brand) return;
        onAdd({
            ...form as BikeData,
            id: Date.now(),
            specs: { aero: 50, weight: 50, comfort: 50 },
            maintenance: { chain: 100, tires: 100, pads: 100 }
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Live Preview */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div style={{ textAlign: 'center' }}>
                    <BikeIllustration type={form.type || 'Aero'} color={form.colorHex || '#fff'} size={120} />
                    <div style={{ marginTop: '1rem', color: form.colorHex, fontWeight: 700 }}>APERÇU VISUEL</div>
                </div>
            </div>

            {/* Selectors */}
            <div>
                <label style={inputLabelStyle}>Type de Géométrie</label>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '10px', marginTop: '5px' }}>
                    {['Aero', 'Grimpeur', 'Endurance', 'Gravel', 'TT', 'VTT'].map(t => (
                        <button key={t} onClick={() => setForm({...form, type: t as BikeType})} style={{ padding: '8px 16px', borderRadius: '8px', border: form.type === t ? `1px solid ${form.colorHex}` : '1px solid #333', background: form.type === t ? `${form.colorHex}20` : 'transparent', color: form.type === t ? '#fff' : '#666', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label style={inputLabelStyle}>Couleur Principale</label>
                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '5px' }}>
                    {NEON_COLORS.map(c => (
                        <button key={c} onClick={() => setForm({...form, colorHex: c})} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: form.colorHex === c ? '3px solid #fff' : 'none', cursor: 'pointer', transition: 'transform 0.2s', transform: form.colorHex === c ? 'scale(1.2)' : 'scale(1)' }} />
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <InputCard label="Nom (Surnom)" value={form.name} onChange={(v:any) => setForm({...form, name: v})} isEditing={true} unit="" />
                <InputCard label="Marque" value={form.brand} onChange={(v:any) => setForm({...form, brand: v})} isEditing={true} unit="" />
                <InputCard label="Modèle" value={form.model} onChange={(v:any) => setForm({...form, model: v})} isEditing={true} unit="" />
                <InputCard label="Groupe" value={form.groupset} onChange={(v:any) => setForm({...form, groupset: v})} isEditing={true} unit="" />
                <InputCard label="Poids" value={form.weightKg} onChange={(v:any) => setForm({...form, weightKg: Number(v)})} isEditing={true} unit="kg" />
                <div style={{display:'flex', flexDirection:'column', gap:'0.5rem'}}>
                    <label style={{fontSize:'0.75rem', color:'#888', fontWeight:700, textTransform:'uppercase'}}>Date Achat</label>
                    <input type="date" value={form.purchaseDate} onChange={(e) => setForm({...form, purchaseDate: e.target.value})} style={{ background:'rgba(0,0,0,0.3)', border:'1px solid #333', color:'#fff', padding:'10px', borderRadius:'8px', outline:'none' }} />
                </div>
            </div>

            <button onClick={handleSubmit} style={{ width: '100%', padding: '16px', background: form.colorHex, color: '#000', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: '1rem' }}>
                AJOUTER AU GARAGE
            </button>
        </div>
    );
};

const BikeDetailView = ({ bike }: { bike: BikeData }) => {
    const color = bike.colorHex;
    
    const ProgressBar = ({ label, value, color }: any) => (
        <div style={{ marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px', color: '#aaa' }}>
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                <div style={{ height: '100%', width: `${value}%`, background: value < 30 ? '#ef4444' : color, borderRadius: '3px', transition: 'width 1s ease' }} />
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header Hangar */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ 
                    width: '100px', height: '100px', borderRadius: '20px', 
                    background: `linear-gradient(135deg, ${color}20, rgba(0,0,0,0.5))`, 
                    border: `1px solid ${color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 30px ${color}20`
                }}>
                    <BikeIllustration type={bike.type} color={color} size={64} />
                </div>
                <div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '2rem', color: '#fff', lineHeight: 1 }}>{bike.name}</h2>
                        {!bike.retirementDate && <span style={{ fontSize: '0.6rem', padding: '4px 8px', background: '#10b98120', color: '#10b981', borderRadius: '4px', border: '1px solid #10b98140' }}>ACTIF</span>}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>{bike.brand} {bike.model}</p>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '12px' }}>
                         <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem' }}>{bike.groupset}</span>
                         <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem' }}>{bike.weightKg} kg</span>
                    </div>
                </div>
            </div>

            {/* Grid Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: color, textTransform: 'uppercase' }}>Specs Radar</h4>
                    <ProgressBar label="Aérodynamisme" value={bike.specs?.aero || 50} color={color} />
                    <ProgressBar label="Légèreté" value={bike.specs?.weight || 50} color={color} />
                    <ProgressBar label="Confort" value={bike.specs?.comfort || 50} color={color} />
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#ef4444', textTransform: 'uppercase' }}>Maintenance</h4>
                    <ProgressBar label="Chaîne" value={bike.maintenance?.chain || 100} color="#10b981" />
                    <ProgressBar label="Pneus" value={bike.maintenance?.tires || 100} color="#10b981" />
                    <ProgressBar label="Plaquettes" value={bike.maintenance?.pads || 100} color="#10b981" />
                </div>
            </div>

            {/* Total KM Gros Compteur */}
            <div style={{ textAlign: 'center', padding: '1.5rem', border: `1px solid ${color}30`, borderRadius: '16px', background: `linear-gradient(90deg, transparent, ${color}05, transparent)` }}>
                <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '2px' }}>Odomètre Total</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', textShadow: `0 0 20px ${color}60` }}>
                    {bike.totalKm.toLocaleString()} <span style={{ fontSize: '1rem', color: '#666' }}>km</span>
                </div>
            </div>
        </div>
    );
};

const InputCard = ({ label, value, unit, onChange, isEditing, color = 'var(--text)' }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val === '' ? 0 : parseFloat(val));
  };

  return (
    <div style={inputCardStyle}>
      <label style={inputLabelStyle}>{label}</label>
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
          <input 
            type="number" 
            value={value || ''} 
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

// --- 6. COMPOSANT PRINCIPAL (PAGE) ---

export default function ProfileClient({ user, isStravaConnected }: { user: UserProfile, isStravaConnected: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // État local des vélos (Mock + Ajouts)
  const [myBikes, setMyBikes] = useState<BikeData[]>(INITIAL_BIKES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBike, setSelectedBike] = useState<BikeData | null>(null);
  
  const [formData, setFormData] = useState({
    weight: user.weight || 70,
    height : user.height || 175,
    ftp: user.ftp || 200,
    max_heart_rate: user.max_heart_rate || 190,
    resting_heart_rate: user.resting_heart_rate || 60,
  });

  const powerZones = useMemo(() => getPowerZones(formData.ftp), [formData.ftp]);
  const hrZones = useMemo(() => getHeartRateZones(formData.max_heart_rate, formData.resting_heart_rate), [formData.max_heart_rate, formData.resting_heart_rate]);
  const wKg = formData.weight > 0 ? (formData.ftp / formData.weight).toFixed(2) : '0.00';

  const handleSave = async () => {
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

  const handleAddBike = (bike: BikeData) => {
      setMyBikes(prev => [...prev, bike]);
      setIsAddModalOpen(false);
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
        {/* --- ONGLET 1 : GARAGE & TIMELINE --- */}
        <Tab label="Garage & Équipement">
             <div style={{ marginTop: '2rem' }} className="timeline-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={sectionTitleStyle}>Historique Temporel</h3>
                    <button onClick={() => setIsAddModalOpen(true)} style={editButtonStyle}><Plus size={16} style={{ marginRight: '6px' }}/> Ajouter Vélo</button>
                </div>

                <GarageTimeline bikes={myBikes} onBikeClick={setSelectedBike} />

                <div style={{ 
                    marginTop: '2rem', padding: '1.5rem', 
                    background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--secondary)',
                    textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem'
                }}>
                    <p>Total parcouru avec ce garage : <strong style={{ color: '#fff' }}>{myBikes.reduce((acc, b) => acc + b.totalKm, 0).toLocaleString()} km</strong></p>
                </div>
             </div>
        </Tab>

        {/* --- ONGLET 2 : CONFIGURATION --- */}
        <Tab label="Configuration & Zones">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
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
                <div style={paramsGridStyle}>
                    <InputCard label="Poids" value={formData.weight} unit="kg" color="#10b981" isEditing={isEditing} onChange={(v: number) => setFormData({...formData, weight: v})} />
                    <InputCard label="Taille" value={formData.height} unit="cm" color="#d48d12ff" isEditing={isEditing} onChange={(v: number) => setFormData({...formData, height: v})} />
                    <InputCard label="FTP (Seuil)" value={formData.ftp} unit="W" color="var(--accent)" isEditing={isEditing} onChange={(v: number) => setFormData({...formData, ftp: v})} />
                    <InputCard label="FC Max" value={formData.max_heart_rate} unit="bpm" color="#ef4444" isEditing={isEditing} onChange={(v: number) => setFormData({...formData, max_heart_rate: v})} />
                    <InputCard label="FC Repos" value={formData.resting_heart_rate} unit="bpm" color="#3b82f6" isEditing={isEditing} onChange={(v: number) => setFormData({...formData, resting_heart_rate: v})} />
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                <div style={containerStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid var(--secondary)', paddingBottom: '0.5rem' }}>
                        <h3 style={sectionTitleStyle}>Zones de Puissance</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Basées sur {formData.ftp} W</span>
                    </div>
                    <div>{powerZones.map((zone, index) => <ZoneRow key={index} zone={zone} index={index} isLast={index === powerZones.length - 1} />)}</div>
                </div>
                <div style={containerStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid var(--secondary)', paddingBottom: '0.5rem' }}>
                        <h3 style={sectionTitleStyle}>Zones Cardiaques</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Karvonen</span>
                    </div>
                    <div>{hrZones.map((zone, index) => <ZoneRow key={index} zone={zone} index={index} isLast={index === hrZones.length - 1} />)}</div>
                </div>
            </div>
          </div>
        </Tab>

        {/* --- ONGLET 3 : STATS --- */}
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

      {/* MODALES */}
      <GlassModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nouveau Vélo">
          <AddBikeForm onAdd={handleAddBike} onCancel={() => setIsAddModalOpen(false)} />
      </GlassModal>

      <GlassModal isOpen={!!selectedBike} onClose={() => setSelectedBike(null)} title="Fiche Technique">
          {selectedBike && <BikeDetailView bike={selectedBike} />}
      </GlassModal>
    </div>
  );
}


// --- 7. STYLES ---

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
  padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
  display: 'flex', alignItems: 'center'
};
const saveButtonStyle: React.CSSProperties = {
  background: 'var(--accent)', border: 'none', color: '#fff',
  padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
  marginTop: '1rem', width: '100%'
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