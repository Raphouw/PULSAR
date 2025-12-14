// Fichier : app/activities/[id]/MatchedSegmentsList.tsx
'use client';

import React, { useState } from 'react';
import { Trophy, Zap, Clock, ChevronRight, Activity, Heart, Repeat, Mountain } from 'lucide-react';
import SegmentDetailModal from './SegmentDetailModal';
import { ActivityStreams } from '../../../types/next-auth';

// --- TYPES ---
type MatchedSegment = {
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
    tags?: { label: string; color: string; }[] | null;
  };
};

// --- HELPERS PHYSIQUES (Alignés sur Segments & Cols) ---

const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
    const a = Math.sin(((lat2-lat1)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(((lon2-lon1)*Math.PI/180)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculatePulsarIndex = (segment: any): { index: number, sigma: number, density: number } => {
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
    
    return { index: Math.round(Base * Oxygen * Pivot), sigma, density };
};

const getCategoryData = (index: number, segment: any, density: number) => {
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

// --- COMPOSANTS UI ---

const Badge = ({ data, border = false }: { data: any, border?: boolean }) => (
    <span style={{ 
        background: data.color, color: data.textColor, padding: '3px 8px', borderRadius: '6px', 
        fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.5px', 
        border: border || data.border ? '1px solid #d04fd7' : '1px solid transparent', 
        boxShadow: data.label === 'ICONIC' ? '0 0 15px rgba(208, 79, 215, 0.4)' : 'none', 
        whiteSpace: 'nowrap', display: 'inline-block'
    }}>
        {data.label}
    </span>
);

const TacticalMetric = ({ icon: Icon, value, unit, color, label }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ fontSize: '0.6rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon size={12} color={color} />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{value}<small style={{fontSize: '0.6em', color: '#888', marginLeft: '2px'}}>{unit}</small></span>
        </div>
    </div>
);

export default function MatchedSegmentsList({ segments, streams, userWeight }: { segments: MatchedSegment[], streams?: ActivityStreams | null, userWeight?: number }) {
  const [selectedSegment, setSelectedSegment] = useState<MatchedSegment | null>(null);

  if (!segments || segments.length === 0) return null;

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div style={{ marginTop: '0rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', display:'flex', alignItems:'center', gap:'10px' }}>
          <Trophy size={18} color="#d04fd7" /> SEGMENTS OFFICIELS ({segments.length})
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {segments.map((match, i) => {
            const { index: pIndex, density } = calculatePulsarIndex(match.segment);
            const category = getCategoryData(pIndex, match.segment, density);
            const scoreColor = pIndex > 5000 ? '#ef4444' : pIndex > 2500 ? '#F77F00' : pIndex > 1500 ? '#d04fd7' : '#10B981';

            return (
                <div 
                    key={match.id} 
                    onClick={() => setSelectedSegment(match)}
                    style={{ 
                        background: 'linear-gradient(145deg, rgba(20, 20, 25, 0.9) 0%, rgba(10, 10, 15, 0.95) 100%)', 
                        borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem',
                        cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                    }}
                    className="hover:scale-[1.02] hover:border-[#d04fd7]/50"
                >
                    {/* Header: Nom & Index */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '12px', flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#444', fontFamily: 'monospace' }}>{(i+1).toString().padStart(2,'0')}</div>
                            <div style={{ overflow: 'hidden' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{match.segment.name}</h4>
                                <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>{(match.segment.distance_m/1000).toFixed(2)}km à {match.segment.average_grade}%</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
                            <Badge data={category} />
                            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: scoreColor }}>{pIndex} <small style={{fontSize:'0.5em', color:'#666'}}>IDX</small></div>
                        </div>
                    </div>

                    {/* Grille Tactique de Performance */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', marginBottom: '10px' }}>
                        <TacticalMetric label="Temps" value={formatTime(match.duration_s)} unit="" icon={Clock} color="#fff" />
                        <TacticalMetric label="Watts (NP)" value={match.np_w || match.avg_power_w} unit="W" icon={Zap} color="#d04fd7" />
                        <TacticalMetric label="Vitesse" value={match.avg_speed_kmh.toFixed(1)} unit="km/h" icon={Activity} color="#00f3ff" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#aaa' }}>
                                <Heart size={10} color="#ef4444" /> {match.avg_heartrate || '--'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#aaa' }}>
                                <Repeat size={10} color="#10b981" /> {match.avg_cadence || '--'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b' }}>{match.w_kg?.toFixed(2)} <small>W/kg</small></span>
                            {match.vam && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981' }}>{Math.round(match.vam)} <small>VAM</small></span>}
                        </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', opacity: 0.1 }}><ChevronRight size={16} /></div>
                </div>
            );
          })}
        </div>
      </div>

      {selectedSegment && (
          <SegmentDetailModal 
            match={selectedSegment} 
            streams={streams ?? null} 
            userWeight={userWeight}
            onClose={() => setSelectedSegment(null)} 
          />
      )}
    </>
  );
}