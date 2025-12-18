'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
    Mountain, Zap, Trophy, Activity, ArrowUpRight, MapPin, 
    Navigation, ChevronLeft, User, Scale, Crown, Medal, Award, 
    ArrowUpDown, TrendingUp, Gauge, HelpCircle, Timer, CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- TYPES ---
export type SegmentEffort = {
    id: number;
    activity_id: number;
    duration_s: number;
    avg_power_w: number | null;
    avg_speed_kmh: number;
    start_time: string;
    user_id: string;
    vam?: number | null;
    avg_heartrate?: number | null;
    avg_cadence?: number | null;
    user: {
        name: string | null;
        avatar_url: string | null;
        weight?: number | null;
        age?: number | null;
        height?: number | null;
    } | null;
};

// --- HELPERS ---
const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}' ${sec.toString().padStart(2, '0')}"`;
};

const getSigmaLabel = (sigma: number) => {
    if (sigma < 0.8) return { label: "MÉTRONOME", color: "#10b981" }; 
    if (sigma < 1.5) return { label: "VARIÉ", color: "#3b82f6" }; 
    if (sigma < 2.5) return { label: "CASSE-PATTES", color: "#f59e0b" }; 
    return { label: "CHANTIER", color: "#ef4444" }; 
};

// Chargement dynamique des composants graphiques
const SegmentProfileChart = dynamic(() => import('./segmentProfilChart'), { ssr: false });
const SegmentMap = dynamic(() => import('./SegmentMap'), { ssr: false });

// --- COMPOSANTS UI INTERNES ---

const GlassCard = ({ children, style = {} }: { children: React.ReactNode, style?: React.CSSProperties }) => (
    <div style={{ 
        background: 'rgba(20, 20, 30, 0.6)', 
        backdropFilter: 'blur(20px)', 
        border: '1px solid rgba(255, 255, 255, 0.08)', 
        borderRadius: '20px', 
        overflow: 'hidden', 
        ...style 
    }}>{children}</div>
);

const StatItem = ({ label, value, unit, color, icon: Icon }: any) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            <Icon size={12} color={color} /> {label}
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {value}<span style={{ fontSize: '0.6em', color: '#666', marginLeft: '4px' }}>{unit}</span>
        </div>
    </div>
);

function SortHeader({ label, active, onClick, center, color }: any) {
    return (
        <th onClick={onClick} style={{ padding: '1rem', textAlign: center ? 'center' : 'left', cursor: 'pointer', color: active ? '#fff' : (color || '#666'), borderBottom: active ? '2px solid #d04fd7' : 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {label} <ArrowUpDown size={10} style={{ opacity: active ? 1 : 0.2 }} />
            </div>
        </th>
    );
}

function FilterSelect({ value, options, onChange, icon }: any) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#444' }}>{icon}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#ccc', fontSize: '0.7rem', fontWeight: 800, outline: 'none', cursor: 'pointer' }}>
                {options.map((opt: string) => (<option key={opt} value={opt} style={{background: '#0a0a0c'}}>{opt}</option>))}
            </select>
        </div>
    );
}

// --- COMPOSANT PRINCIPAL ---

export default function SegmentDisplay({ segment, currentUserId }: { segment: any, currentUserId: string }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'personal' | 'global'>('personal');
    const [sortBy, setSortBy] = useState('chrono');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterWeight, setFilterWeight] = useState('All');
    const [filterAge, setFilterAge] = useState('All');
    const [hoveredPoint, setHoveredPoint] = useState<any>(null);

    // Calcul du KOM global pour l'affichage de l'objectif
    const globalKom = useMemo(() => {
        if (!segment.efforts || segment.efforts.length === 0) return null;
        return [...segment.efforts].sort((a, b) => a.duration_s - b.duration_s)[0];
    }, [segment.efforts]);

    const isCurrentUserKom = globalKom && String(globalKom.user_id) === String(currentUserId);

    const handleSort = (key: string) => {
        if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        else { 
            setSortBy(key); 
            setSortOrder(['chrono', 'athlete', 'date'].includes(key) ? 'asc' : 'desc'); 
        }
    };

    const processedEfforts = useMemo(() => {
        let base = [...segment.efforts] as SegmentEffort[];
        
        if (activeTab === 'personal') {
            base = base.filter(e => String(e.user_id) === String(currentUserId));
        } else {
            const bestPerUser = new Map();
            base.forEach(e => {
                if (!bestPerUser.has(e.user_id) || e.duration_s < bestPerUser.get(e.user_id).duration_s) {
                    bestPerUser.set(e.user_id, e);
                }
            });
            base = Array.from(bestPerUser.values());
            base = base.filter(e => {
                const w = e.user?.weight || 75;
                const a = e.user?.age || 35;
                const weightMatch = filterWeight === 'All' || (filterWeight === '< 65kg' && w < 65) || (filterWeight === '65-80kg' && w >= 65 && w <= 80) || (filterWeight === '> 80kg' && w > 80);
                const ageMatch = filterAge === 'All' || (filterAge === 'Espoir' && a < 30) || (filterAge === 'Senior' && a >= 30 && a <= 45) || (filterAge === 'Master' && a > 45);
                return weightMatch && ageMatch;
            });
        }

        return base.sort((a, b) => {
            let vA, vB;
            switch (sortBy) {
                case 'athlete': vA = a.user?.name || ''; vB = b.user?.name || ''; break;
                case 'date': vA = new Date(a.start_time).getTime(); vB = new Date(b.start_time).getTime(); break;
                case 'watts': vA = a.avg_power_w || 0; vB = b.avg_power_w || 0; break;
                case 'heartrate': vA = a.avg_heartrate || 0; vB = b.avg_heartrate || 0; break;
                case 'cadence': vA = a.avg_cadence || 0; vB = b.avg_cadence || 0; break;
                case 'speed': vA = a.avg_speed_kmh || 0; vB = b.avg_speed_kmh || 0; break;
                case 'vam': 
                    vA = a.vam || (segment.elevation_gain_m / (a.duration_s / 3600)); 
                    vB = b.vam || (segment.elevation_gain_m / (b.duration_s / 3600)); 
                    break;
                default: vA = a.duration_s; vB = b.duration_s;
            }
            return sortOrder === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
        });
    }, [segment.efforts, activeTab, currentUserId, filterWeight, filterAge, sortBy, sortOrder, segment.elevation_gain_m]);

    const metrics = useMemo(() => {
        const poly = segment.polyline?.map((p: any) => [p[0], p[1], p[2] || 0]) || [];
        const maxAlt = poly.length > 0 ? Math.max(...poly.map((p: any) => p[2])) : 0;
        return { polyline: poly, maxAlt, sigma: 1.2 };
    }, [segment]);

    const sigmaData = getSigmaLabel(metrics.sigma);

    return (
        <div style={{ minHeight: '100vh', color: '#F1F1F1', padding: '2rem', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* --- HEADER --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <button onClick={() => router.push('/segments')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '12px', color: '#ccc', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem' }}>
                        <ChevronLeft size={14} /> CATALOGUE
                    </button>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: 0, letterSpacing: '-1.5px', lineHeight: 1 }}>{segment.name}</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(0,0,0,0.4)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.65rem', color: '#d04fd7', fontWeight: 800 }}>PULSAR INDEX</span>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 0.9 }}>{segment.pulsar_score || 842}</span>
                    </div>
                    <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', color: sigmaData.color, fontWeight: 800 }}>{sigmaData.label}</span>
                        <span style={{ fontSize: '0.65rem', color: '#888' }}>Profil de pente</span>
                    </div>
                </div>
            </div>

            {/* --- DASHBOARD GRID --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <GlassCard style={{ height: '350px', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700 }}><MapPin size={12} color="#00f3ff" className="inline mr-2" /> VUE SATELLITE</div>
                        <SegmentMap polyline={metrics.polyline} hoveredPoint={hoveredPoint} segmentName={segment.name} category={segment.category} grade={segment.average_grade} />
                    </GlassCard>

                    <GlassCard style={{ flex: 1, padding: '1.5rem 2rem 0 0', minHeight: '200px' }}>
                        <div style={{ paddingLeft: '2rem', fontSize: '0.7rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Profil Altimétrique</div>
                        <div style={{ height: '200px' }}>
                            <SegmentProfileChart polyline={metrics.polyline} onHover={setHoveredPoint} />
                        </div>
                    </GlassCard>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <GlassCard style={{ padding: '1.5rem' }}><StatItem icon={Navigation} label="Distance" value={(segment.distance_m / 1000).toFixed(2)} unit="km" color="#fff" /></GlassCard>
                        <GlassCard style={{ padding: '1.5rem' }}><StatItem icon={Activity} label="Pente Moy." value={segment.average_grade.toFixed(1)} unit="%" color="#ef4444" /></GlassCard>
                        <GlassCard style={{ padding: '1.5rem' }}><StatItem icon={Mountain} label="Dénivelé +" value={Math.round(segment.elevation_gain_m)} unit="m" color="#10b981" /></GlassCard>
                        <GlassCard style={{ padding: '1.5rem' }}><StatItem icon={TrendingUp} label="Altitude Max" value={Math.round(metrics.maxAlt)} unit="m" color="#3b82f6" /></GlassCard>
                    </div>

                    <GlassCard style={{ flex: 1, padding: '2rem', border: `1px solid ${isCurrentUserKom ? 'rgba(16, 185, 129, 0.4)' : 'rgba(208, 79, 215, 0.2)'}`, background: isCurrentUserKom ? 'linear-gradient(160deg, rgba(16, 185, 129, 0.05), transparent)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <Trophy size={20} color={isCurrentUserKom ? "#10b981" : "#d04fd7"} />
                            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{isCurrentUserKom ? "STATUT ACTUEL" : "OBJECTIF TOP 1"}</h3>
                        </div>

                        {isCurrentUserKom ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '15px', textAlign: 'center', paddingBottom: '1rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <Crown size={64} color="#eab308" fill="#eab308" style={{ filter: 'drop-shadow(0 0 15px rgba(234,179,8,0.4))' }} />
                                    <CheckCircle2 size={24} color="#10b981" fill="#000" style={{ position: 'absolute', bottom: -5, right: -5 }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>Vous détenez le KOM</div>
                                    <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>Votre trône est en sécurité. Pour l'instant...</p>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700, textTransform: 'uppercase' }}>Temps à battre</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>
                                        {globalKom ? formatDuration(globalKom.duration_s) : '--:--'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#00f3ff' }}>Détenteur : {globalKom?.user?.name || 'Anonyme'}</div>
                                </div>
                                <div style={{ background: 'rgba(208, 79, 215, 0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(208, 79, 215, 0.1)' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#d04fd7', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Puissance Requise Est.</div>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 950, color: '#fff', lineHeight: 1 }}>345<small style={{ fontSize: '0.4em', marginLeft: '5px', color: '#666' }}>W</small></div>
                                </div>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>

            {/* --- TABLE SECTION --- */}
            <GlassCard style={{ padding: '0', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: '4px', background: '#000', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button onClick={() => setActiveTab('personal')} style={{ padding: '8px 20px', borderRadius: '8px', background: activeTab === 'personal' ? '#d04fd7' : 'transparent', color: activeTab === 'personal' ? '#000' : '#666', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s' }}>HISTORIQUE</button>
                        <button onClick={() => setActiveTab('global')} style={{ padding: '8px 20px', borderRadius: '8px', background: activeTab === 'global' ? '#00f3ff' : 'transparent', color: activeTab === 'global' ? '#000' : '#666', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', border: 'none', transition: 'all 0.2s' }}>GLOBAL</button>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <FilterSelect value={filterWeight} options={['All', '< 65kg', '65-80kg', '> 80kg']} onChange={setFilterWeight} icon={<Scale size={12}/>} />
                        <FilterSelect value={filterAge} options={['All', 'Espoir', 'Senior', 'Master']} onChange={setFilterAge} icon={<User size={12}/>} />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.4)', color: '#555', textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 900, letterSpacing: '1px' }}>
                                <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left' }}>Rang</th>
                                <SortHeader label="Athlète" active={sortBy === 'athlete'} onClick={() => handleSort('athlete')} />
                                <SortHeader label="Date" active={sortBy === 'date'} onClick={() => handleSort('date')} />
                                <SortHeader label="Temps" active={sortBy === 'chrono'} onClick={() => handleSort('chrono')} center />
                                <SortHeader label="Watt" active={sortBy === 'watts'} onClick={() => handleSort('watts')} center color="#00f3ff" />
                                <SortHeader label="W/Kg" active={sortBy === 'wkg'} onClick={() => handleSort('wkg')} center color="#facc15" />
                                <SortHeader label="Km/h" active={sortBy === 'speed'} onClick={() => handleSort('speed')} center />
                                <SortHeader label="BPM" active={sortBy === 'heartrate'} onClick={() => handleSort('heartrate')} center color="#ef4444" />
                                <SortHeader label="RPM" active={sortBy === 'cadence'} onClick={() => handleSort('cadence')} center color="#eab308" />
                                <SortHeader label="VAM" active={sortBy === 'vam'} onClick={() => handleSort('vam')} center color="#10b981" />
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Détails</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedEfforts.map((effort, i) => {
                                const w = effort.user?.weight || 75;
                                const wkg = effort.avg_power_w ? (effort.avg_power_w / w).toFixed(2) : '-';
                                const vam = effort.vam || Math.round(segment.elevation_gain_m / (effort.duration_s / 3600));
                                const rank = i + 1;
                                
                                let BadgeIcon: React.ReactNode = null;
                                if (activeTab === 'global') {
                                    if (rank === 1) BadgeIcon = <Crown size={16} color="#eab308" fill="#eab308" />;
                                    else if (rank <= 5) BadgeIcon = <Trophy size={14} color="#00f3ff" />;
                                    else if (rank <= 10) BadgeIcon = <Trophy size={14} color="#3b82f6" />;
                                } else {
                                    if (rank === 1) BadgeIcon = <Award size={16} color="#d04fd7" fill="#d04fd7" />;
                                    else if (rank === 2) BadgeIcon = <Medal size={16} color="#9ca3af" />;
                                    else if (rank === 3) BadgeIcon = <Medal size={16} color="#b45309" />;
                                }

                                return (
                                    <tr key={effort.id} className="group hover:bg-white/[0.03] transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                        <td style={{ padding: '1.2rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontWeight: 900, color: '#d04fd7', fontSize: '0.9rem', minWidth: '20px' }}>#{rank}</span>
                                                {BadgeIcon}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    {effort.user?.avatar_url && <img src={effort.user.avatar_url} alt="" style={{width:'100%'}} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: String(effort.user_id) === String(currentUserId) ? '#d04fd7' : '#fff' }}>{effort.user?.name}</div>
                                                    <div style={{ fontSize: '0.6rem', color: '#555' }}>IMC {((effort.user?.weight || 75) / Math.pow((effort.user?.height || 180)/100, 2)).toFixed(1)} • {w}kg</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', color: '#666', fontSize: '0.75rem' }}>{new Date(effort.start_time).toLocaleDateString()}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>{formatDuration(effort.duration_s)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#00f3ff', fontWeight: 800 }}>{Math.round(effort.avg_power_w || 0)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#facc15', fontWeight: 800 }}>{wkg}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{effort.avg_speed_kmh?.toFixed(1)}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{effort.avg_heartrate || '-'}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#eab308', fontWeight: 700 }}>{effort.avg_cadence || '-'}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#10b981', fontWeight: 800 }}>{vam}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <button onClick={() => router.push(`/activities/${effort.activity_id}`)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '5px' }} className="hover:text-[#d04fd7] hover:translate-x-1 transition-all">
                                                <ArrowUpRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}