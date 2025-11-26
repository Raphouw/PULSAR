// Fichier : app/simulations/simulationClient.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Zap, Wind, Scale, Activity, RotateCcw, PlayCircle, ChevronDown 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from 'recharts';

const SimulationMap = dynamic(() => import('./SimulationMap'), { 
  ssr: false, 
  loading: () => <div className="h-full w-full bg-[#050505] flex items-center justify-center text-gray-600 animate-pulse">INITIALISATION DU NOYAU PHYSIQUE...</div> 
});

// --- TYPES MIS À JOUR ---
type Route = {
  id: number;
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  polyline: string | null;
  gpx_data?: any;
};

type UserProfile = {
    weight: number;
    ftp: number;
    name?: string;
};

type SimConfig = {
  weight_rider: number;
  weight_bike: number;
  ftp: number;
  cda: number;
  wind_speed: number;
  wind_dir: number;
  strategy_climbs: number;
  strategy_flats: number;
  strategy_descents: number;
};

// ✅ MODIFICATION DES PROPS : Accepte un tableau 'routes'
export default function SimulationClient({ routes, userProfile }: { routes: Route[], userProfile: UserProfile }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. LOGIQUE DE SÉLECTION DE ROUTE
  // On cherche l'ID dans l'URL, sinon on prend la première route de la liste
  const initialRouteId = searchParams?.get('routeId');
  const defaultRoute = initialRouteId 
    ? routes.find(r => r.id === Number(initialRouteId)) || routes[0]
    : routes[0];

  const [selectedRoute, setSelectedRoute] = useState<Route | null>(defaultRoute || null);
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);

  // Configuration (pré-remplie avec userProfile)
  const [config, setConfig] = useState<SimConfig>({
    weight_rider: userProfile.weight || 75,
    weight_bike: 8,
    ftp: userProfile.ftp || 250,
    cda: 0.32,
    wind_speed: 0,
    wind_dir: 0,
    strategy_climbs: 105,
    strategy_flats: 85,
    strategy_descents: 60
  });

  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Mise à jour URL si changement de route
  const handleRouteChange = (route: Route) => {
    setSelectedRoute(route);
    setIsRouteMenuOpen(false);
    router.push(`/simulations?routeId=${route.id}`, { scroll: false });
  };

  // --- MOTEUR DE CALCUL (Identique précédent) ---
  useEffect(() => {
    if (!selectedRoute) return;

    setIsCalculating(true);
    const timer = setTimeout(() => {
      const totalWeight = config.weight_rider + config.weight_bike;
      const weightedPower = (config.ftp * (config.strategy_climbs/100 * 0.3 + config.strategy_flats/100 * 0.5 + config.strategy_descents/100 * 0.2));
      
      const baseSpeedKmh = 30 * (weightedPower / 200); 
      const gravityPenalty = (selectedRoute.elevation_gain_m / selectedRoute.distance_km) * 1.5;
      const aeroFactor = (0.32 / config.cda);
      const weightFactor = (80 / totalWeight);

      let estimatedSpeed = (baseSpeedKmh - gravityPenalty) * aeroFactor * weightFactor;
      if (estimatedSpeed < 5) estimatedSpeed = 5; 

      const timeHours = selectedRoute.distance_km / estimatedSpeed;
      const totalSeconds = timeHours * 3600;
      const totalKj = (weightedPower * totalSeconds) / 1000;
      const intensityFactor = weightedPower / config.ftp;
      const tss = (totalSeconds * weightedPower * intensityFactor) / (config.ftp * 3600) * 100;

      setResult({
        time: totalSeconds,
        speed: estimatedSpeed,
        power: weightedPower,
        kcal: totalKj,
        tss: tss
      });
      setIsCalculating(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [config, selectedRoute]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}`;
  };

  if (!selectedRoute) return <div style={{padding: '4rem', textAlign:'center', color:'#666'}}>Aucun itinéraire disponible. Veuillez en créer un dans la bibliothèque.</div>;

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={styles.iconBox}><Activity size={20} color="#d04fd7" /></div>
          
          {/* SELECTEUR DE ROUTE */}
          <div style={{position: 'relative'}}>
            <div 
                onClick={() => setIsRouteMenuOpen(!isRouteMenuOpen)}
                style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'}}
            >
                <h1 style={styles.title}>{selectedRoute.name}</h1>
                <ChevronDown size={20} color="#666" />
            </div>
            
            <div style={styles.subtitle}>
              <span>{selectedRoute.distance_km.toFixed(1)} km</span> • 
              <span>{selectedRoute.elevation_gain_m} m D+</span>
            </div>

            {/* MENU DÉROULANT */}
            {isRouteMenuOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, width: '300px', maxHeight: '400px', overflowY: 'auto',
                    background: '#141419', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 2000, marginTop: '10px'
                }}>
                    {routes.map(r => (
                        <div 
                            key={r.id} 
                            onClick={() => handleRouteChange(r)}
                            style={{
                                padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer', background: r.id === selectedRoute.id ? 'rgba(208, 79, 215, 0.1)' : 'transparent',
                                color: r.id === selectedRoute.id ? '#fff' : '#aaa'
                            }}
                            className="hover:bg-white/5"
                        >
                            <div style={{fontWeight: 700, fontSize: '0.85rem'}}>{r.name}</div>
                            <div style={{fontSize: '0.75rem', opacity: 0.7}}>{r.distance_km.toFixed(1)}km | {r.elevation_gain_m}m</div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>

        <div style={{display: 'flex', gap: '1rem'}}>
            <button style={styles.secondaryBtn} onClick={() => window.location.reload()}><RotateCcw size={16} /> RESET</button>
            <button style={styles.primaryBtn}><PlayCircle size={18} /> LANCER L'IA</button>
        </div>
      </header>

      <div style={styles.grid}>
        {/* COLONNE GAUCHE : PARAMÈTRES */}
        <aside style={styles.sidebar}>
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}><Scale size={16} /> BIO-MÉCANIQUE</h3>
            <div style={styles.inputGroup}>
              <label style={styles.label}>FTP (Seuil)</label>
              <div style={styles.rangeWrapper}>
                 <input type="range" min="100" max="500" value={config.ftp} onChange={e => setConfig({...config, ftp: Number(e.target.value)})} style={styles.slider} />
                 <span style={styles.valueBadge}>{config.ftp} W</span>
              </div>
            </div>
            <div style={styles.row}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Poids Pilote</label>
                    <div style={styles.numberInput}><input type="number" value={config.weight_rider} onChange={e => setConfig({...config, weight_rider: Number(e.target.value)})} /><span>kg</span></div>
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Poids Vélo</label>
                    <div style={styles.numberInput}><input type="number" value={config.weight_bike} onChange={e => setConfig({...config, weight_bike: Number(e.target.value)})} /><span>kg</span></div>
                </div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>CdA (Aéro)</label>
              <div style={styles.rangeWrapper}>
                 <span style={{fontSize:'0.7rem', color:'#666'}}>Aéro</span>
                 <input type="range" min="0.20" max="0.50" step="0.01" value={config.cda} onChange={e => setConfig({...config, cda: Number(e.target.value)})} style={styles.slider} />
                 <span style={{fontSize:'0.7rem', color:'#666'}}>Brique</span>
              </div>
              <div style={{textAlign:'right', fontSize:'0.8rem', color:'#00f3ff', fontFamily:'monospace'}}>{config.cda.toFixed(3)}</div>
            </div>
          </div>

          <div style={styles.panel}>
            <h3 style={styles.panelTitle}><Zap size={16} /> STRATÉGIE DE PACING</h3>
            <div style={styles.inputGroup}>
                <div style={{display:'flex', justifyContent:'space-between'}}><label style={styles.label}>Montées</label><span style={{color: config.strategy_climbs > 100 ? '#ef4444' : '#10b981', fontSize:'0.8rem', fontWeight:700}}>{config.strategy_climbs}% FTP</span></div>
                <input type="range" min="50" max="150" value={config.strategy_climbs} onChange={e => setConfig({...config, strategy_climbs: Number(e.target.value)})} style={{...styles.slider, accentColor: '#ef4444'}} />
            </div>
            <div style={styles.inputGroup}>
                <div style={{display:'flex', justifyContent:'space-between'}}><label style={styles.label}>Plat</label><span style={{color: '#3b82f6', fontSize:'0.8rem', fontWeight:700}}>{config.strategy_flats}% FTP</span></div>
                <input type="range" min="50" max="120" value={config.strategy_flats} onChange={e => setConfig({...config, strategy_flats: Number(e.target.value)})} style={{...styles.slider, accentColor: '#3b82f6'}} />
            </div>
             <div style={{height: '60px', marginTop: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'flex-end', gap: '4px'}}>
                <div style={{flex:1, background: '#ef4444', height: `${(config.strategy_climbs/150)*100}%`, borderRadius: '2px', opacity: 0.8}} title="Montée"></div>
                <div style={{flex:2, background: '#3b82f6', height: `${(config.strategy_flats/150)*100}%`, borderRadius: '2px', opacity: 0.8}} title="Plat"></div>
                <div style={{flex:1, background: '#10b981', height: `${(config.strategy_descents/150)*100}%`, borderRadius: '2px', opacity: 0.8}} title="Descente"></div>
             </div>
          </div>

           <div style={styles.panel}>
            <h3 style={styles.panelTitle}><Wind size={16} /> CONDITIONS</h3>
            <div style={styles.row}>
                 <div style={styles.inputGroup}><label style={styles.label}>Vent (km/h)</label><input type="number" value={config.wind_speed} onChange={e => setConfig({...config, wind_speed: Number(e.target.value)})} style={styles.miniInput} /></div>
                 <div style={styles.inputGroup}><label style={styles.label}>Direction (°)</label><input type="number" value={config.wind_dir} onChange={e => setConfig({...config, wind_dir: Number(e.target.value)})} style={styles.miniInput} /></div>
            </div>
           </div>
        </aside>

        {/* COLONNE DROITE : VISUALISATION */}
        <main style={styles.mainContent}>
            <div style={styles.hudContainer}>
                <div style={styles.hudCard}><div style={styles.hudLabel}>TEMPS ESTIMÉ</div><div style={{...styles.hudValue, color: '#fff'}}>{result ? formatTime(result.time) : '--:--'}</div></div>
                <div style={styles.hudSeparator}></div>
                <div style={styles.hudCard}><div style={styles.hudLabel}>VIT. MOYENNE</div><div style={{...styles.hudValue, color: '#00f3ff'}}>{result ? result.speed.toFixed(1) : '--'} <small>km/h</small></div></div>
                <div style={styles.hudSeparator}></div>
                <div style={styles.hudCard}><div style={styles.hudLabel}>PUISSANCE NP</div><div style={{...styles.hudValue, color: '#d04fd7'}}>{result ? result.power.toFixed(0) : '--'} <small>W</small></div></div>
                <div style={styles.hudSeparator}></div>
                <div style={styles.hudCard}><div style={styles.hudLabel}>ENERGIE</div><div style={{...styles.hudValue, color: '#f59e0b'}}>{result ? result.kcal.toFixed(0) : '--'} <small>kJ</small></div></div>
                <div style={styles.hudCard}><div style={styles.hudLabel}>TSS</div><div style={{...styles.hudValue, color: '#ef4444'}}>{result ? result.tss.toFixed(0) : '--'}</div></div>
            </div>

            <div style={styles.mapContainer}>
                {isCalculating && (<div style={styles.calculatingOverlay}><div className="spinner"></div><span>RECALCUL DE TRAJECTOIRE...</span></div>)}
                {/* On passe une clé unique pour forcer le rerender de la map quand on change de route */}
                <SimulationMap key={selectedRoute.id} route={selectedRoute} />
            </div>

            <div style={styles.chartContainer}>
                <div style={styles.chartHeader}>
                    <span>PROFIL DE PUISSANCE PRÉDIT</span>
                    <span style={{fontSize: '0.7rem', color: '#666'}}>Basé sur {selectedRoute.distance_km.toFixed(1)} km</span>
                </div>
                <div style={{height: '150px', width: '100%'}}>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[{km:0, w:200}, {km:10, w:250}, {km:20, w:180}, {km:30, w:300}, {km:40, w:200}]}>
                            <defs>
                                <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d04fd7" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#d04fd7" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="w" stroke="#d04fd7" fill="url(#simGrad)" />
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="km" hide />
                            <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
                        </AreaChart>
                     </ResponsiveContainer>
                </div>
            </div>
        </main>
      </div>
    </div>
  );
}

// --- STYLES ---
const styles: Record<string, React.CSSProperties> = {
    container: { minHeight: '100vh', background: '#000', color: '#fff', fontFamily: '"Inter", sans-serif', display: 'flex', flexDirection: 'column' },
    header: { padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, #0E0E14 0%, #000 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-1px', color: '#fff', lineHeight: 1 },
    subtitle: { fontSize: '0.9rem', color: '#888', display: 'flex', gap: '1rem', marginTop: '4px', fontFamily: 'monospace' },
    iconBox: { width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(208, 79, 215, 0.1)', border: '1px solid rgba(208, 79, 215, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    primaryBtn: { background: '#d04fd7', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(208, 79, 215, 0.4)', fontSize: '0.9rem' },
    secondaryBtn: { background: 'transparent', color: '#888', border: '1px solid #333', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' },
    grid: { display: 'grid', gridTemplateColumns: '350px 1fr', height: 'calc(100vh - 90px)' },
    sidebar: { borderRight: '1px solid rgba(255,255,255,0.05)', background: '#050507', padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    panel: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.2rem' },
    panelTitle: { fontSize: '0.75rem', color: '#666', fontWeight: 800, letterSpacing: '1px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' },
    inputGroup: { marginBottom: '1.2rem' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    label: { display: 'block', fontSize: '0.8rem', color: '#ccc', marginBottom: '6px', fontWeight: 500 },
    slider: { width: '100%', accentColor: '#d04fd7', cursor: 'pointer' },
    rangeWrapper: { display: 'flex', alignItems: 'center', gap: '10px' },
    valueBadge: { fontSize: '0.8rem', fontFamily: 'monospace', color: '#d04fd7', fontWeight: 700, background: 'rgba(208, 79, 215, 0.1)', padding: '2px 6px', borderRadius: '4px', minWidth: '50px', textAlign: 'center' },
    numberInput: { display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid #333', borderRadius: '8px', padding: '0 10px', height: '36px' },
    miniInput: { width: '100%', background: 'transparent', border: '1px solid #333', color: '#fff', borderRadius: '6px', padding: '6px' },
    mainContent: { position: 'relative', display: 'flex', flexDirection: 'column' },
    hudContainer: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '1rem 2rem', zIndex: 10 },
    hudCard: { textAlign: 'center' },
    hudLabel: { fontSize: '0.65rem', color: '#666', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' },
    hudValue: { fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, fontFamily: 'monospace' },
    hudSeparator: { width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' },
    mapContainer: { flex: 1, position: 'relative', background: '#111' },
    calculatingOverlay: { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(208, 79, 215, 0.9)', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(208, 79, 215, 0.5)' },
    chartContainer: { height: '220px', background: '#0E0E14', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1rem 2rem' },
    chartHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#d04fd7' }
};