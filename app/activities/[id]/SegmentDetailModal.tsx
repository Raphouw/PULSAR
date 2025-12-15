'use client';

import React, { useMemo } from 'react';
import { X, Zap, Activity, Clock, TrendingUp, ArrowUpRight, Gauge, Heart, Target, ZapOff } from 'lucide-react';
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
  Altitude: number;
  watts: number;
  BPM: number;
};

// --- HELPERS SCORING ---

const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
    const a = Math.sin(((lat2-lat1)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(((lon2-lon1)*Math.PI/180)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculatePulsarIndex = (segment: any): { index: number, density: number } => {
    const H = Math.max(1, segment.elevation_gain_m || 0); 
    const L = Math.max(100, segment.distance_m); 
    const AvgP = Math.max(0, segment.average_grade); 
    const density = H / (L / 1000); 

    let sigma = 0;
    if (segment.polyline && Array.isArray(segment.polyline) && segment.polyline.length > 5) {
        let sigmaGrades: number[] = [];
        let distAcc = 0;
        let lastEle = segment.polyline[0][2];
        for (let i = 1; i < segment.polyline.length; i++) {
            const stepDist = getDist(segment.polyline[i-1][0], segment.polyline[i-1][1], segment.polyline[i][0], segment.polyline[i][1]);
            distAcc += stepDist;
            if (distAcc >= 25) {
                sigmaGrades.push(((segment.polyline[i][2] - lastEle) / distAcc) * 100);
                distAcc = 0; lastEle = segment.polyline[i][2];
            }
        }
        if (sigmaGrades.length > 1) {
            const mean = sigmaGrades.reduce((a, b) => a + b, 0) / sigmaGrades.length;
            sigma = Math.sqrt(sigmaGrades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sigmaGrades.length);
        }
    }
    
    const Alt = H;
    if (sigma === 0) sigma = AvgP > 3 ? 1.2 : 0.5;
    const Base = (20 * (Math.pow(H, 2) / L)) + (3 * H);
    const Oxygen = 1 + (Alt / 8000);
    const Pivot = 1 + ((sigma * (AvgP - 8)) / 50);
    
    return { index: Math.round(Base * Oxygen * Pivot), density };
};

const getCategoryBadge = (index: number, segment: any, density: number) => {
    if (segment.distance_m >= 50000 && density < 30) return { label: 'BOUCLE MYTHIQUE', color: '#00f3ff', textColor: '#000' };
    if (index > 7500) return { label: 'ICONIC', color: '#000', textColor: '#d04fd7', border: true }; 
    if (index > 6500) return { label: 'HC', color: '#ef4444', textColor: '#fff' }; 
    if (index > 5000) return { label: 'CAT 1', color: '#f97316', textColor: '#fff' }; 
    if (index > 3000) return { label: 'CAT 2', color: '#eab308', textColor: '#000' }; 
    if (index > 1500) return { label: 'CAT 3', color: '#84cc16', textColor: '#000' }; 
    if (index > 1000) return { label: 'CAT 4', color: '#10b981', textColor: '#fff' }; 
    return { label: 'COTE REGION', color: '#0077B6', textColor:'#fff' };
};

const Badge = ({ data }: { data: any }) => (
    <span style={{ 
        background: data.color, color: data.textColor, padding: '6px 14px', borderRadius: '8px', 
        fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.5px', 
        border: data.border ? '1px solid #d04fd7' : 'none', 
        boxShadow: data.label === 'ICONIC' ? '0 0 15px rgba(208, 79, 215, 0.4)' : 'none',
        textTransform: 'uppercase'
    }}>
        {data.label}
    </span>
);

const smoothData = (data: (number | null)[], windowSize: number = 5): number[] => {
  return data.map((_, idx, arr) => {
    const start = Math.max(0, idx - Math.floor(windowSize / 2));
    const end = Math.min(arr.length, idx + Math.ceil(windowSize / 2));
    const subset = arr.slice(start, end).filter((v): v is number => v !== null);
    if (subset.length === 0) return 0;
    return Math.round(subset.reduce((a, b) => a + b, 0) / subset.length);
  });
};

// --- MAIN COMPONENT ---

export default function SegmentDetailModal({ match, streams, onClose, user }: { match: SegmentMatch, streams: ActivityStreams | null, onClose: () => void, user?: any }) {
  if (!match) return null;

  const USER_FTP = user?.ftp || 300; 

  const { chartData, stats, pulsar, powerZones } = useMemo(() => {
    const { index, density } = calculatePulsarIndex(match.segment);
    const cat = getCategoryBadge(index, match.segment, density);
    
    const defaultStats = {
      tss: 0, if: "0.00", p1: 0, p2: 0, diffPercent: 0,
      pacingStatus: { label: 'EFFORT RÉGULIER', color: '#666', icon: Target }
    };

    if (!streams) return { chartData: [] as ChartDataPoint[], stats: defaultStats, pulsar: { index, cat }, powerZones: [] };
    
    const rawWatts = streams.watts || [];
    const smoothedWatts = smoothData(rawWatts, 5);
    const dists = streams.distance || [];
    const alts = streams.altitude || [];
    const hrs = streams.heartrate || [];
    
    const data: ChartDataPoint[] = [];
    const startDist = dists[match.start_index] || 0;

    // --- CALCUL ZONES Z1-Z7 ---
    const zoneDef = [
      { name: 'Z7', min: 1.51, color: '#ffffff', label: 'Neuromusculaire' },
      { name: 'Z6', min: 1.21, color: '#9333ea', label: 'Cap. Anaérobie' },
      { name: 'Z5', min: 1.06, color: '#ef4444', label: 'PMA' },
      { name: 'Z4', min: 0.91, color: '#f97316', label: 'Seuil' },
      { name: 'Z3', min: 0.76, color: '#eab308', label: 'Tempo' },
      { name: 'Z2', min: 0.56, color: '#10b981', label: 'Endurance' },
      { name: 'Z1', min: 0, color: '#3b82f6', label: 'Récupération' },
    ];

    const counts = new Array(zoneDef.length).fill(0);

    for (let i = match.start_index; i <= match.end_index; i++) {
      const w = rawWatts[i] || 0;
      const ratio = w / USER_FTP;
      data.push({
        dist: parseFloat((((dists[i] ?? 0) - startDist) / 1000).toFixed(2)),
        Altitude: alts[i] ?? 0,
        watts: smoothedWatts[i] ?? 0,
        BPM: hrs[i] ?? 0
      });

      for (let z = 0; z < zoneDef.length; z++) {
        if (ratio >= zoneDef[z].min) {
          counts[z]++;
          break;
        }
      }
    }

    const totalPoints = (match.end_index - match.start_index) || 1;
    const powerZonesData = zoneDef.map((z, i) => ({
      ...z,
      percent: (counts[i] / totalPoints) * 100
    })).reverse(); // On inverse pour afficher de Z1 en bas à Z7 en haut ou vice-versa

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
  }, [streams, match, USER_FTP]);

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    // Si l'effort dure plus d'une heure
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    
    // Pour les efforts de moins d'une heure (ex: 38:04)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};


  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '1200px', background: '#0A0A0C', border: '1px solid #222', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div style={{ padding: '2rem 3rem', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, #111, #0A0A0C)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '2.4rem', fontWeight: 950, color: '#fff', margin: 0, letterSpacing: '-1.5px' }}>{match.segment.name.toUpperCase()}</h2>
                <Badge data={pulsar.cat} />
            </div>
            <div style={{ display: 'flex', gap: '20px', color: '#666', fontSize: '1rem', fontWeight: 700 }}>
              <span style={{ color: '#d04fd7' }}>{(match.segment.distance_m / 1000).toFixed(2)} KM</span>
              <span>•</span>
              <span style={{ color: match.segment.average_grade > 5 ? '#ef4444' : '#10b981' }}>{match.segment.average_grade.toFixed(2)}% MOY</span>
              <span>•</span>
              <span style={{ color: '#fff' }}>SCORE PULSAR : <span style={{ color: '#d04fd7', fontFamily: 'monospace' }}>{pulsar.index}</span></span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '12px', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* DASHBOARD GRID */}
        <div style={{ 
          padding: '2rem 3rem', 
          display: 'grid', 
          gridTemplateColumns: '1.1fr 1fr 0.9fr', 
          gap: '1.5rem',
          alignItems: 'stretch' 
        }}>

            
          
          {/* COL 1: KPIs COMPACTS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <KpiCard label="Chrono" value={formatTime(match.duration_s)} icon={Clock} color="#fff" compact />
            <KpiCard label="Watts NP" value={match.np_w || match.avg_power_w} unit="W" icon={Zap} color="#d04fd7" compact />
            <KpiCard label="Cardio Moy" value={match.avg_heartrate || '--'} unit="BPM" icon={Heart} color="#ff4d4d" compact />
            <KpiCard label="Rapport W/Kg" value={match.w_kg?.toFixed(2)} unit="w/kg" icon={Gauge} color="#f59e0b" compact />
            <KpiCard label="Score TSS" value={stats.tss} unit="pts" icon={Target} color="#10b981" compact />
            <KpiCard label="Intensité (IF)" value={stats.if} unit="if" icon={Activity} color="#00f3ff" compact />
            <KpiCard label="Vitesse Moy." value={match.avg_speed_kmh} unit="km/h" icon={Target} color="#3f185bff" compact />
            <KpiCard label="VAM" value={match.vam} unit="m/h" icon={Activity} color="#b2af0bff" compact />
          </div>

          {/* COL 2: ZONES Z1-Z7 */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a1a', borderRadius: '24px', padding: '1.2rem' }}>
            <div style={{ fontSize: '0.6rem', color: '#7e7d7dff', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>Répartition Zones Power</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {powerZones.slice().reverse().map((zone) => (
                <div key={zone.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.05rem', color: zone.percent > 0 ? '#fff' : '#7e7d7dff', fontWeight: 900, width: '20px' }}>{zone.name}</span>
                  <div style={{ flex: 1, height: '10px', background: '#111', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${zone.percent}%`, height: '100%', background: zone.color, boxShadow: zone.percent > 0 ? `0 0 8px ${zone.color}40` : 'none', transition: 'width 1s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.55rem', color: '#666', fontWeight: 800, width: '25px', textAlign: 'right' }}>{Math.round(zone.percent)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* COL 3: PACING / GESTION EFFORT */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a1a', borderRadius: '24px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: '#7e7d7dff', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.2rem', letterSpacing: '1px' }}>Gestion de l'effort</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.6rem', color: '#555' }}>DÉBUT</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{Math.round(stats.p1)}<small style={{fontSize: '0.5em', marginLeft: '2px'}}>W</small></div>
              </div>
              <div style={{ flex: 1, height: '2px', background: '#1a1a1a', margin: '0 15px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-4px', left: `${Math.min(100, Math.max(0, 50 + stats.diffPercent))}%`, width: '10px', height: '10px', borderRadius: '50%', background: stats.pacingStatus.color, boxShadow: `0 0 10px ${stats.pacingStatus.color}` }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', color: '#555' }}>FIN</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: stats.pacingStatus.color }}>{Math.round(stats.p2)}<small style={{fontSize: '0.5em', marginLeft: '2px'}}>W</small></div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 950, color: stats.pacingStatus.color, background: `${stats.pacingStatus.color}10`, padding: '12px', borderRadius: '14px', border: `1px solid ${stats.pacingStatus.color}20` }}>
              {stats.pacingStatus.label}
              <div style={{ fontSize: '0.6rem', opacity: 0.7, marginTop: '2px' }}>Variation de {stats.diffPercent > 0 ? '+' : ''}{stats.diffPercent.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* CHART PORTION */}
        <div style={{ height: '330px', width: '100%', padding: '0 3rem 2rem 3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
             <span style={{ fontSize: '0.7rem', color: '#7e7d7dff', fontWeight: 900, textTransform: 'uppercase' }}>Analyse télémétrique portion</span>
             <div style={{ display: 'flex', gap: '20px', fontSize: '0.65rem', fontWeight: 800 }}>
                <span style={{ color: '#ffffffff', opacity: 0.4 }}>● Altitude</span>
                <span style={{ color: '#d04fd7' }}>● Watts (5s)</span>
                <span style={{ color: '#ff4d4d' }}>● FC</span>
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
              <Tooltip 
                contentStyle={{ background: '#050505', border: '1px solid #222', borderRadius: '12px' }} 
                itemStyle={{ fontSize: '11px', fontWeight: 700 }}
              />
              <Area yAxisId="alt" type="monotone" dataKey="Altitude" fill="#181818ff" stroke="#8a8888ff" fillOpacity={1} isAnimationActive={false} />
              <Area yAxisId="pwr" type="monotone" dataKey="watts" stroke="#d04fd7" strokeWidth={2} fill="url(#pwrGrad)" />
              <Line yAxisId="pwr" type="monotone" dataKey="BPM" stroke="#ff0707ff" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const KpiCard = ({ label, value, unit, icon: Icon, color, compact }: any) => (
  <div style={{ 
    background: '#0E0E11', 
    border: '1px solid #1a1a1a', 
    borderRadius: '16px', 
    padding: compact ? '10px 14px' : '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: compact ? '68px' : '80px',
  }}>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      fontSize: '0.55rem', 
      color: '#7e7d7dff', 
      fontWeight: 900, 
      textTransform: 'uppercase', 
      marginBottom: '2px' 
    }}>
      <span>{label}</span>
      <Icon size={10} color={color} />
    </div>
    <div style={{ 
      fontSize: compact ? '1.5rem' : '1.8rem', 
      fontWeight: 950, 
      color: '#fff', 
      lineHeight: 1,
      display: 'flex',
      alignItems: 'baseline',
      gap: '3px'
    }}>
      {value}
      {unit && <span style={{ fontSize: '0.65rem', color: '#333', fontWeight: 800 }}>{unit}</span>}
    </div>
  </div>
);