// Fichier : app/activities/[id]/SegmentDetailModal.tsx
'use client';

import React, { useMemo } from 'react';
import { X, Zap, Activity, Clock, TrendingUp, ArrowUpRight, Gauge, Heart, Repeat } from 'lucide-react';
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
    ele: number;
    watts: number;
    hr: number;
};

// --- HELPERS SCORING (Synchronisés avec le catalogue) ---

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

    let maxAlt = -Infinity;
    let sigma = 0;
    let sigmaGrades: number[] = []; 

    if (segment.polyline && Array.isArray(segment.polyline) && segment.polyline.length > 0) {
        const polyline = segment.polyline[0].length >= 3 ? segment.polyline : segment.polyline.map((p: number[]) => [p[0], p[1], 0]);
        maxAlt = polyline.reduce((max: number, p: number[]) => Math.max(max, p[2]), -Infinity);

        if (polyline.length > 5) {
            let distAccSigma = 0;
            let lastEleSigma = polyline[0][2];
            for (let i = 1; i < polyline.length; i++) {
                const p = polyline[i];
                const prevP = polyline[i-1];
                const stepDist = getDist(prevP[0], prevP[1], p[0], p[1]);
                distAccSigma += stepDist;
                if (distAccSigma >= 25) { 
                    const eleDiff = p[2] - lastEleSigma;
                    if (distAccSigma > 0) sigmaGrades.push((eleDiff / distAccSigma) * 100);
                    distAccSigma = 0; lastEleSigma = p[2];
                }
            }
        }
        if (sigmaGrades.length > 1) {
            const mean = sigmaGrades.reduce((a, b) => a + b, 0) / sigmaGrades.length;
            const variance = sigmaGrades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sigmaGrades.length;
            sigma = Math.sqrt(variance);
        }
    }
    
    const Alt = (maxAlt > -Infinity && maxAlt > 0) ? maxAlt : H;
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
    if (index > 500) return { label: 'COTE REGION', color: '#0077B6', textColor:'#fff' }; 
    return { label: 'PLAT', color: '#3b82f6', textColor:'#fff' };
};

// --- UI COMPONENTS ---

const Badge = ({ data }: { data: any }) => (
    <span style={{ 
        background: data.color, color: data.textColor, padding: '4px 10px', borderRadius: '6px', 
        fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px', 
        border: data.border ? '1px solid #d04fd7' : 'none', 
        boxShadow: data.label === 'ICONIC' ? '0 0 15px rgba(208, 79, 215, 0.4)' : 'none'
    }}>
        {data.label}
    </span>
);

const sliceStreams = (streams: ActivityStreams, start: number, end: number): ChartDataPoint[] => {
    if (!streams || start === undefined || end === undefined) return [];
    const dist = streams.distance || [];
    const alt = streams.altitude || [];
    const watts = streams.watts || [];
    const hr = streams.heartrate || [];

    const data: ChartDataPoint[] = [];
    const startDist = dist[start] || 0;

    for (let i = start; i <= end; i++) {
        if (dist[i] === undefined || dist[i] === null) continue;
        data.push({
            dist: parseFloat((((dist[i] ?? 0) - startDist) / 1000).toFixed(2)),
            ele: alt[i] || 0,
            watts: watts[i] || 0,
            hr: hr[i] || 0,
        });
    }
    return data;
};

// --- MAIN MODAL ---

export default function SegmentDetailModal({ match, streams, onClose, userWeight = 75 }: { match: SegmentMatch, streams: ActivityStreams | null, onClose: () => void, userWeight?: number }) {
    if (!match) return null;

    const chartData = useMemo(() => {
        return sliceStreams(streams!, match.start_index, match.end_index);
    }, [streams, match]);

    const { pulsarIndex, category, scoreColor, pacing } = useMemo(() => {
        const { index, density } = calculatePulsarIndex(match.segment);
        const cat = getCategoryBadge(index, match.segment, density);
        const color = index > 5000 ? '#ef4444' : index > 2500 ? '#F77F00' : index > 1500 ? '#d04fd7' : '#10B981';

        let pVal = 0;
        if (chartData.length > 0) {
            const mid = Math.floor(chartData.length / 2);
            const fHalf = chartData.slice(0, mid).map(d => d.watts);
            const sHalf = chartData.slice(mid).map(d => d.watts);
            const fAvg = fHalf.length ? fHalf.reduce((a, b) => a + b, 0) / fHalf.length : 0;
            const sAvg = sHalf.length ? sHalf.reduce((a, b) => a + b, 0) / sHalf.length : 0;
            pVal = sAvg - fAvg;
        }

        return { pulsarIndex: index, category: cat, scoreColor: color, pacing: pVal };
    }, [match, chartData]);

    const pacingColor = pacing >= 0 ? '#10b981' : '#ef4444';

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
            <div style={{ width: '100%', maxWidth: '1000px', background: '#0A0A0F', border: '1px solid #222', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
                
                {/* HEADER TACTIQUE */}
                <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', background: 'linear-gradient(180deg, rgba(208, 79, 215, 0.05), transparent)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <Badge data={category} />
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: scoreColor, fontFamily: 'monospace' }}>{pulsarIndex} <small style={{fontSize:'0.6em', opacity:0.6}}>IDX</small></div>
                        </div>
                        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-1px' }}>{match.segment.name}</h2>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '5px', color: '#666', fontSize: '0.9rem', fontWeight: 600 }}>
                            <span>{(match.segment.distance_m / 1000).toFixed(2)} km</span>
                            <span>•</span>
                            <span style={{color: match.segment.average_grade > 5 ? '#ef4444' : '#10b981'}}>{match.segment.average_grade}% MOY</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }} className="hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                {/* DASHBOARD DE PERFORMANCE */}
                <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <KpiCard label="Chrono" value={new Date(match.duration_s * 1000).toISOString().substr(14, 5)} unit="" icon={Clock} color="#fff" />
                        <KpiCard label="Watts (NP)" value={match.np_w || match.avg_power_w} unit="W" icon={Zap} color="#d04fd7" />
                        <KpiCard label="Vitesse" value={match.avg_speed_kmh.toFixed(1)} unit="km/h" icon={Activity} color="#00f3ff" />
                        <KpiCard label="W/kg" value={match.w_kg?.toFixed(2)} unit="" icon={Gauge} color="#f59e0b" />
                        <KpiCard label="VAM" value={match.vam} unit="m/h" icon={ArrowUpRight} color="#10b981" />
                        <KpiCard label="Cardio" value={match.avg_heartrate || '--'} unit="bpm" icon={Heart} color="#ef4444" />
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.5rem', display:'flex', alignItems:'center', gap:'8px' }}>
                            <TrendingUp size={14} /> Analyse du Pacing (Split)
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#555', marginBottom: '5px' }}>START</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>{Math.round((match.avg_power_w || 0) - pacing / 2)}W</div>
                            </div>
                            <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, #333, #666, #333)', margin: '0 20px' }}></div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#555', marginBottom: '5px' }}>FINISH</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: pacingColor }}>{Math.round((match.avg_power_w || 0) + pacing / 2)}W</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '12px', background: `${pacingColor}10`, borderRadius: '12px', border: `1px solid ${pacingColor}30` }}>
                            <div style={{ color: pacingColor, fontWeight: 900, fontSize: '0.9rem' }}>{pacing >= 0 ? 'NEGATIVE SPLIT ✅' : 'EXPLOSION DETECTÉE ⚠️'}</div>
                            <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>Différence de {Math.abs(Math.round(pacing))} Watts entre les deux moitiés</div>
                        </div>
                    </div>
                </div>

                {/* GRAPH ANALYTIQUE */}
                <div style={{ height: '300px', width: '100%', padding: '0 2rem 2rem 2rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#444', fontWeight: 800, textTransform: 'uppercase' }}>Télémétrie Mission</span>
                        <div style={{ display:'flex', gap:'15px', fontSize:'0.7rem', fontWeight:700 }}>
                            <span style={{color:'#fff'}}>● Altitude</span>
                            <span style={{color:'#d04fd7'}}>● Puissance</span>
                            <span style={{color:'#ef4444'}}>● Cardio</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1A1A1F" />
                            <XAxis dataKey="dist" stroke="#444" fontSize={10} tickFormatter={(v) => `${v}km`} />
                            <YAxis yAxisId="alt" hide domain={['dataMin - 20', 'auto']} />
                            <YAxis yAxisId="pwr" orientation="right" stroke="#d04fd7" fontSize={10} domain={[0, 'auto']} />
                            <Tooltip contentStyle={{ background: '#000', border: '1px solid #333', borderRadius: '12px' }} />
                            <Area yAxisId="alt" type="monotone" dataKey="ele" fill="#222" stroke="#444" fillOpacity={0.3} />
                            <Line yAxisId="pwr" type="monotone" dataKey="watts" stroke="#d04fd7" strokeWidth={3} dot={false} isAnimationActive={true} />
                            <Line yAxisId="pwr" type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" opacity={0.6} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

const KpiCard = ({ label, value, unit, icon: Icon, color }: any) => (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '12px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.6rem', color: '#666', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>
            <Icon size={12} color={color} /> {label}
        </div>
        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
            {value}<small style={{fontSize:'0.5em', color:'#666', marginLeft:'2px'}}>{unit}</small>
        </div>
    </div>
);