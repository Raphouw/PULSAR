'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { X, Zap, Activity, Clock, TrendingUp, Gauge, Heart, Target, ZapOff, Ghost } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ActivityStreams } from '../../../types/next-auth';

// --- TYPES ---
type SegmentMatch = {
  id: number;
  segment_id: number;
  duration_s: number;
  avg_power_w: number;
  avg_speed_kmh: number;
  start_index: number;
  end_index: number;
  np_w?: number;
  avg_heartrate?: number;
  max_heartrate?: number;
  avg_cadence?: number;
  vam?: number;
  w_kg?: number;
  segment: {
    name: string;
    distance_m: number;
    average_grade: number;
    elevation_gain_m: number;
    category: string | null;
    polyline?: number[][];
  };
};

type ChartDataPoint = {
  dist: number;
  time: number;
  Altitude: number;
  watts: number;
  BPM: number;
  speed: number;
  gradient: number;
  ghostWatts?: number | null;
};

// --- ANIMATION COMPONENT ---
const NumberTicker = ({ value, duration = 1500, delay = 0, decimals = 0 }: { value: number, duration?: number, delay?: number, decimals?: number }) => {
    const [count, setCount] = useState(0);
    useEffect(() => { setCount(0); }, [value]);
    useEffect(() => {
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setCount(ease * value);
        if (progress < 1) window.requestAnimationFrame(step);
      };
      const timer = setTimeout(() => window.requestAnimationFrame(step), delay);
      return () => clearTimeout(timer);
    }, [value, duration, delay]);
    return <>{count.toFixed(decimals)}</>;
};

// --- HELPERS ---

// 🔥 NOUVELLE FONCTION : Rééchantillonnage intelligent
// Permet d'adapter le tableau du Ghost (qui a X points) au tableau actuel (qui a Y points)
// via une interpolation linéaire pour éviter les pics/trous artificiels.
// 🔥 NOUVELLE FONCTION : Rééchantillonnage intelligent
const resampleArray = (data: number[], targetLength: number): number[] => {
    if (!data || data.length === 0) return new Array(targetLength).fill(0);
    if (data.length === targetLength) return data;

    // CORRECTION ICI : on ajoute le type : number[]
    const newData: number[] = []; 
    const step = (data.length - 1) / (targetLength - 1);

    for (let i = 0; i < targetLength; i++) {
        const exactIndex = i * step;
        const lowerIndex = Math.floor(exactIndex);
        const upperIndex = Math.ceil(exactIndex);
        const weight = exactIndex - lowerIndex;

        const val1 = data[lowerIndex] || 0;
        const val2 = data[upperIndex] || val1; 

        // Interpolation simple
        newData.push(val1 * (1 - weight) + val2 * weight);
    }
    return newData;
};

const calculatePulsarIndex = (segment: any): { index: number, density: number } => {
    const H = Math.max(1, segment.elevation_gain_m || 0); 
    const L = Math.max(100, segment.distance_m); 
    const Base = (20 * (Math.pow(H, 2) / L)) + (3 * H);
    return { index: Math.round(Base * (1 + H/8000)), density: H / (L/1000) };
};

const getCategoryBadge = (index: number) => {
    if (index > 7500) return { label: 'ICONIC', color: '#000', textColor: '#d04fd7', border: true }; 
    if (index > 5000) return { label: 'HC', color: '#ef4444', textColor: '#fff' }; 
    if (index > 1000) return { label: 'CAT 1', color: '#f97316', textColor: '#fff' }; 
    return { label: 'REGIONAL', color: '#0077B6', textColor:'#fff' };
};

const smoothData = (data: (number | null)[], windowSize: number = 5): number[] => {
  return data.map((_, idx, arr) => {
    const start = Math.max(0, idx - Math.floor(windowSize / 2));
    const end = Math.min(arr.length, idx + Math.ceil(windowSize / 2));
    const subset = arr.slice(start, end).filter((v): v is number => v !== null);
    if (subset.length === 0) return 0;
    return Math.round(subset.reduce((a, b) => a + b, 0) / subset.length);
  });
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- SUB-COMPONENTS ---
const Badge = ({ data }: { data: any }) => (
    <span className={`px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase ${data.border ? 'border border-[#d04fd7]' : ''} ${data.label === 'ICONIC' ? 'shadow-[0_0_15px_rgba(208,79,215,0.4)]' : ''}`} style={{ backgroundColor: data.color, color: data.textColor }}>{data.label}</span>
);

const KpiCard = ({ label, value, unit, icon: Icon, color, compact, ghostValue }: any) => (
  <div className={`bg-[#0E0E11] border border-white/5 rounded-2xl flex flex-col justify-center ${compact ? 'p-2.5 min-h-[68px]' : 'p-3 min-h-[80px]'}`}>
    <div className="flex items-center justify-between text-[0.55rem] text-[#7e7d7d] font-black uppercase mb-0.5 tracking-wider">
      <span>{label}</span>
      <Icon size={10} color={color} />
    </div>
    <div className="flex items-end flex-wrap gap-x-2">
        <div className={`flex items-baseline gap-0.5 font-black text-white leading-none ${compact ? 'text-2xl' : 'text-3xl'}`}>
            {value}
            {unit && <span className="text-[0.65rem] text-gray-700 font-extrabold ml-1">{unit}</span>}
        </div>
        {ghostValue !== undefined && ghostValue !== null && (
            <div className="text-[10px] font-bold text-amber-500 mb-1 animate-in fade-in slide-in-from-bottom-1 whitespace-nowrap">
                ({ghostValue}{unit})
            </div>
        )}
    </div>
  </div>
);

// CUSTOM TOOLTIP
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const watts = payload.find((p: any) => p.dataKey === 'watts')?.value;
      const bpm = payload.find((p: any) => p.dataKey === 'BPM')?.value;
      const ghost = payload.find((p: any) => p.dataKey === 'ghostWatts')?.value;
  
      return (
        <div className="bg-[#050505]/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl min-w-[120px]">
          <div className="text-[10px] text-gray-500 font-black mb-2 uppercase tracking-wider border-b border-white/5 pb-1">
            {label} km
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold text-[#d04fd7]">PUISSANCE</span>
                <span className="text-sm font-black text-white">{watts}w</span>
            </div>
            {ghost !== undefined && (
                <div className="flex justify-between items-center gap-4">
                    <span className="text-[10px] font-bold text-amber-500">GHOST PR</span>
                    <span className="text-sm font-black text-amber-100">{ghost}w</span>
                </div>
            )}
            <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold text-red-500">CARDIO</span>
                <span className="text-sm font-black text-white">{bpm}bpm</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

// --- MAIN COMPONENT ---
export default function SegmentDetailModal({ match, streams, onClose, user }: { match: SegmentMatch, streams: ActivityStreams | null, onClose: () => void, user?: any }) {
  if (!match) return null;

  const USER_FTP = user?.ftp || 300; 
  const USER_WEIGHT = user?.weight || 68; 
  
  const [showGhost, setShowGhost] = useState(false);
  const [ghostData, setGhostData] = useState<number[] | null>(null);
  
  const [ghostStats, setGhostStats] = useState<{ 
      watts: number, 
      time: number, 
      hr: number, 
      speed: number,
      vam: number,
      wkg: number,
      tss: number,
      if: number
  } | null>(null);
  
  const [ghostLoading, setGhostLoading] = useState(false);
  const [isPrMatch, setIsPrMatch] = useState(false);

  useEffect(() => {
      const checkPrStatus = async () => {
          try {
              const res = await fetch(`/api/segments/leaderboard?segment_id=${match.segment_id}`);
              if(res.ok) {
                  const data = await res.json();
                  const pr = data.personal?.[0];
                  if (pr && pr.id === match.id) setIsPrMatch(true);
              }
          } catch(e) { console.error("Err check PR", e) }
      };
      checkPrStatus();
  }, [match.id, match.segment_id]);

 const fetchGhostStreams = async () => {
      if (ghostData || ghostLoading) {
          setShowGhost(!showGhost);
          return;
      }
      setGhostLoading(true);
      try {
          // 1. On récupère les infos du Leaderboard (pour avoir l'ID du PR et ses index)
          const lbRes = await fetch(`/api/segments/leaderboard?segment_id=${match.segment_id}`);
          const lbData = await lbRes.json();
          const prEffort = lbData.personal?.[0];

          if (!prEffort || !prEffort.activity_id) {
              console.warn("Pas de PR trouvé ou pas d'activité liée");
              setGhostLoading(false);
              return;
          }

          // --- CALCULS DES STATS (Code existant inchangé...) ---
          const prTime = prEffort.duration_s || 1;
          const prPower = prEffort.avg_power_w || 0;
          let calcSpeed = prEffort.avg_speed_kmh;
          if (!calcSpeed || calcSpeed === 0) calcSpeed = (match.segment.distance_m / prTime) * 3.6;
          
          const prIF = prPower / USER_FTP;
          const prTSS = Math.round((prTime * prPower * prIF) / (USER_FTP * 36));
          const prWkg = prEffort.w_kg || (prPower / USER_WEIGHT);
          const prVam = prEffort.vam || ((match.segment.elevation_gain_m / prTime) * 3600);

          setGhostStats({
              watts: prPower,
              time: prTime,
              hr: prEffort.avg_heartrate || 0,
              speed: calcSpeed, 
              vam: Math.round(prVam),
              wkg: prWkg,
              tss: prTSS,
              if: Number(prIF.toFixed(2))
          });
          // -----------------------------------------------------

          // 2. RÉCUPÉRATION DES STREAMS DÉCOUPÉS
          // 🔥 C'est ici que la magie opère : on demande à l'API de couper pour nous
          let url = `/api/activities/${prEffort.activity_id}/streams`;
          
          // On vérifie que les index existent bien dans la réponse du leaderboard
          if (prEffort.start_index !== undefined && prEffort.end_index !== undefined) {
              url += `?start=${prEffort.start_index}&end=${prEffort.end_index}`;
          }

          const streamsRes = await fetch(url); 
          if (!streamsRes.ok) throw new Error("Streams PR introuvables");
          
          const streamsJson = await streamsRes.json();
          
          // Maintenant streamsJson.watts contient UNIQUEMENT le segment.
          // Plus besoin de faire de slice manuel ici si l'API a fait le job.
          const segmentWatts = streamsJson.watts || [];
          
          setGhostData(segmentWatts); 
          setShowGhost(true);

      } catch (err) {
          console.error("Erreur Ghost:", err);
      } finally {
          setGhostLoading(false);
      }
  };

  const { chartData, stats, pulsar, powerZones } = useMemo(() => {
    const { index, density } = calculatePulsarIndex(match.segment);
    const cat = getCategoryBadge(index);
    
    const defaultStats = { tss: 0, if: "0.00", p1: 0, p2: 0, diffPercent: 0, pacingStatus: { label: 'EFFORT RÉGULIER', color: '#666', icon: Target } };
    
    if (!streams) return { chartData: [] as ChartDataPoint[], stats: defaultStats, pulsar: { index, cat }, powerZones: [] };
    
    const rawWatts = streams.watts || [];
    // Données actuelles lissées
    const smoothedWatts = smoothData(rawWatts, 5); 
    
    // 🔥 PRÉPARATION DU GHOST AVEC RÉÉCHANTILLONNAGE
    // On veut autant de points Ghost que de points Actuels pour l'affichage
    const totalCurrentPoints = (match.end_index - match.start_index) + 1;
    
    let alignedGhostWatts: number[] | null = null;

    if (ghostData && ghostData.length > 0) {
        // 1. D'abord on lisse le Ghost brut pour enlever les micros-coupures (spikes à 0)
        // On utilise un windowSize plus grand (ex: 10 ou 15) car c'est un "fond" comparatif
        const smoothedRawGhost = smoothData(ghostData, 10);
        
        // 2. Ensuite on le redimensionne pour qu'il ait EXACTEMENT la taille du tableau actuel
        alignedGhostWatts = resampleArray(smoothedRawGhost, totalCurrentPoints);
    }

    const dists = streams.distance || [];
    const alts = streams.altitude || [];
    const hrs = streams.heartrate || [];
    const speeds = (streams as any).velocity_smooth || []; 
    
    const data: ChartDataPoint[] = [];
    const startDist = dists[match.start_index] || 0;
    let accumulatedTime = 0;

    const zoneDef = [
      { name: 'Z7', min: 1.51, color: '#ffffff' },
      { name: 'Z6', min: 1.21, color: '#9333ea' },
      { name: 'Z5', min: 1.06, color: '#ef4444' },
      { name: 'Z4', min: 0.91, color: '#f97316' },
      { name: 'Z3', min: 0.76, color: '#eab308' },
      { name: 'Z2', min: 0.56, color: '#10b981' },
      { name: 'Z1', min: 0, color: '#3b82f6' },
    ];
    const counts = new Array(zoneDef.length).fill(0);

    for (let i = match.start_index; i <= match.end_index; i++) {
      const w = rawWatts[i] || 0;
      const ratio = w / USER_FTP;
      
      // Index local (de 0 à N)
      const localIndex = i - match.start_index;

      // Récupération de la valeur Ghost alignée
      let currentGhostWatt: number | null = null;
      if (alignedGhostWatts) {
          // On prend simplement l'index correspondant car les tableaux font la même taille maintenant !
          currentGhostWatt = alignedGhostWatts[localIndex] || 0;
      } else if (showGhost && !ghostData) {
           currentGhostWatt = smoothedWatts[i] * 1.05; 
      }

      data.push({
        dist: parseFloat((((dists[i] ?? 0) - startDist) / 1000).toFixed(2)),
        time: accumulatedTime++,
        Altitude: alts[i] ?? 0,
        watts: smoothedWatts[i] ?? 0,
        BPM: hrs[i] ?? 0,
        speed: speeds[i] ? parseFloat((speeds[i] * 3.6).toFixed(1)) : 0,
        gradient: 0,
        ghostWatts: currentGhostWatt ? Math.round(currentGhostWatt) : null
      });

      for (let z = 0; z < zoneDef.length; z++) {
        if (ratio >= zoneDef[z].min) {
          counts[z]++;
          break;
        }
      }
    }

    const totalPoints = (match.end_index - match.start_index) || 1;
    const powerZonesData = zoneDef.map((z, i) => ({ ...z, percent: (counts[i] / totalPoints) * 100 })).reverse(); 

    const np = match.np_w || match.avg_power_w || 1;
    const intensityFactor = np / USER_FTP;
    const tss = Math.round((match.duration_s * np * intensityFactor) / (USER_FTP * 36));

    const mid = Math.floor(data.length / 2);
    const p1 = data.slice(0, mid).reduce((a, b) => a + b.watts, 0) / (mid || 1);
    const p2 = data.slice(mid).reduce((a, b) => a + b.watts, 0) / ((data.length - mid) || 1);
    const diffPercent = p1 !== 0 ? ((p2 - p1) / p1) * 100 : 0;

    let pacingStatus = { label: 'EFFORT RÉGULIER', color: '#666', icon: Target };
    if (diffPercent > 7) pacingStatus = { label: 'NEGATIVE SPLIT', color: '#10b981', icon: TrendingUp };
    if (diffPercent < -7) pacingStatus = { label: 'EXPLOSION DÉTECTÉE', color: '#ef4444', icon: ZapOff };

    return { 
      chartData: data, 
      stats: { tss, if: intensityFactor.toFixed(2), p1, p2, diffPercent, pacingStatus },
      pulsar: { index, cat },
      powerZones: powerZonesData
    };
  }, [streams, match, USER_FTP, ghostData, showGhost]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-[1200px] bg-[#0A0A0C] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 scrollbar-hide" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="px-12 py-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-[#111] to-[#0A0A0C]">
          <div>
            <div className="flex items-center gap-4 mb-2">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter m-0">{match.segment.name}</h2>
                <Badge data={pulsar.cat} />
            </div>
            <div className="flex gap-5 text-gray-500 text-base font-bold">
              <span className="text-[#d04fd7]">{(match.segment.distance_m / 1000).toFixed(2)} KM</span>
              <span>•</span>
              <span className={match.segment.average_grade > 5 ? 'text-red-500' : 'text-emerald-500'}>{match.segment.average_grade.toFixed(2)}% MOY</span>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button onClick={fetchGhostStreams} disabled={isPrMatch} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border ${isPrMatch ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 cursor-default' : showGhost ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:text-white'}`}>
                {isPrMatch ? <><Target size={18}/> C'EST LE PR !</> : <><Ghost size={18}/> {ghostLoading ? 'CHARGEMENT...' : 'VS PR'}</>}
            </button>
            <button onClick={onClose} className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-3 text-white hover:bg-white/10 transition-colors"><X size={24} /></button>
          </div>
        </div>

        {/* DASHBOARD GRID */}
        <div className="p-12 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_0.9fr] gap-6 items-stretch">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Chrono" value={formatTime(match.duration_s)} icon={Clock} color="#fff" compact ghostValue={showGhost && ghostStats ? formatTime(ghostStats.time) : undefined} />
            <KpiCard label="Watts NP" value={<NumberTicker value={match.np_w || match.avg_power_w} />} unit="W" icon={Zap} color="#d04fd7" compact ghostValue={showGhost && ghostStats ? ghostStats.watts : undefined} />
            <KpiCard label="Cardio Moy" value={<NumberTicker value={match.avg_heartrate || 0} />} unit="BPM" icon={Heart} color="#ff4d4d" compact ghostValue={showGhost && ghostStats ? ghostStats.hr : undefined} />
            <KpiCard label="Vitesse Moy." value={<NumberTicker value={match.avg_speed_kmh} decimals={1} />} unit="km/h" icon={Gauge} color="#3f185b" compact ghostValue={showGhost && ghostStats ? ghostStats.speed.toFixed(1) : undefined} />
            <KpiCard label="Score TSS" value={<NumberTicker value={stats.tss} />} unit="pts" icon={Target} color="#10b981" compact ghostValue={showGhost && ghostStats ? ghostStats.tss : undefined} />
            <KpiCard label="Intensité (IF)" value={stats.if} unit="if" icon={Activity} color="#00f3ff" compact ghostValue={showGhost && ghostStats ? ghostStats.if : undefined} />
            <KpiCard label="Rapport W/Kg" value={<NumberTicker value={match.w_kg || 0} decimals={2} />} unit="w/kg" icon={Gauge} color="#f59e0b" compact ghostValue={showGhost && ghostStats ? ghostStats.wkg.toFixed(2) : undefined} />
            <KpiCard label="VAM" value={<NumberTicker value={match.vam || 0} />} unit="m/h" icon={Activity} color="#b2af0b" compact ghostValue={showGhost && ghostStats ? Math.round(ghostStats.vam) : undefined} />
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5">
            <div className="text-[0.6rem] text-[#7e7d7d] font-black uppercase mb-4 tracking-widest">Répartition Zones Power</div>
            <div className="flex flex-col gap-1.5">
              {powerZones.slice().reverse().map((zone) => (
                <div key={zone.name} className="flex items-center gap-2">
                  <span className={`text-base font-black w-5 ${zone.percent > 0 ? 'text-white' : 'text-[#7e7d7d]'}`}>{zone.name}</span>
                  <div className="flex-1 h-2.5 bg-[#111] rounded-sm overflow-hidden">
                    <div className="h-full transition-all duration-[1500ms] ease-out w-0 animate-in slide-in-from-left-0" style={{ width: `${zone.percent}%`, background: zone.color, boxShadow: zone.percent > 0 ? `0 0 8px ${zone.color}40` : 'none' }} />
                  </div>
                  <span className="text-[0.55rem] text-gray-500 font-extrabold w-6 text-right"><NumberTicker value={zone.percent} />%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col justify-center">
            <div className="text-[0.65rem] text-[#7e7d7d] font-black uppercase mb-5 tracking-widest">Gestion de l'effort</div>
            <div className="flex justify-between items-center mb-6">
              <div className="text-left">
                <div className="text-[0.6rem] text-[#555] font-bold">DÉBUT</div>
                <div className="text-2xl font-black text-white"><NumberTicker value={stats?.p1 ?? 0} /><span className="text-[0.5em] ml-0.5 text-gray-600">W</span></div>
              </div>
              <div className="flex-1 h-0.5 bg-[#1a1a1a] mx-4 relative">
                <div className="absolute top-[-4px] w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] transition-all duration-[2000ms] ease-out left-1/2" style={{ left: `${Math.min(100, Math.max(0, 50 + (stats?.diffPercent ?? 0)))}%`, backgroundColor: stats?.pacingStatus?.color ?? '#666', color: stats?.pacingStatus?.color ?? '#666' }} />
              </div>
              <div className="text-right">
                <div className="text-[0.6rem] text-[#555] font-bold">FIN</div>
                <div className="text-2xl font-black" style={{ color: stats?.pacingStatus?.color ?? '#666' }}><NumberTicker value={stats?.p2 ?? 0} /><span className="text-[0.5em] ml-0.5 opacity-60">W</span></div>
              </div>
            </div>
            <div className="text-center text-sm font-black py-3 rounded-xl border" style={{ color: stats?.pacingStatus?.color ?? '#666', background: `${stats?.pacingStatus?.color ?? '#666'}10`, borderColor: `${stats?.pacingStatus?.color ?? '#666'}20` }}>
              {stats?.pacingStatus?.label ?? 'N/A'}
              <div className="text-[0.6rem] opacity-70 mt-0.5 font-bold">Variation de {(stats?.diffPercent ?? 0) > 0 ? '+' : ''}{(stats?.diffPercent ?? 0).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* CHART PORTION */}
        <div className="h-[330px] w-full px-12 pb-8">
          <div className="flex justify-between mb-4">
             <span className="text-[0.7rem] text-[#7e7d7d] font-black uppercase tracking-widest flex items-center gap-2">
               Analyse télémétrique portion
             </span>
             <div className="flex gap-5 text-[0.65rem] font-extrabold">
                <span className="text-white opacity-40">● Altitude</span>
                <span className="text-[#d04fd7]">● Watts (5s)</span>
                {showGhost && <span className="text-amber-500">● GHOST PR (Lissé)</span>}
                <span className="text-[#ff4d4d]">● FC</span>
             </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="pwrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d04fd7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d04fd7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#111" />
              <XAxis dataKey="dist" hide />
              <YAxis yAxisId="pwr" orientation="right" hide domain={[0, 'auto']} />
              <YAxis yAxisId="alt" hide domain={['dataMin - 10', 'auto']} />
              
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }} wrapperStyle={{ outline: 'none' }} />
              
              <Area yAxisId="alt" type="monotone" dataKey="Altitude" fill="#181818" stroke="#333" fillOpacity={1} isAnimationActive={false} />
              <Area yAxisId="pwr" type="monotone" dataKey="watts" stroke="#d04fd7" strokeWidth={2} fill="url(#pwrGrad)" animationDuration={1500} />
              
              {showGhost && <Line yAxisId="pwr" type="monotone" dataKey="ghostWatts" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" opacity={0.6} dot={false} animationDuration={1000} />}
              
              <Line yAxisId="pwr" type="monotone" dataKey="BPM" stroke="#ff0707" strokeWidth={2} dot={false} animationDuration={1500} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}