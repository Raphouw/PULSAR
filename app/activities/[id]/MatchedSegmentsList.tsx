'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRight, Crown, Medal, Trophy, Activity, Zap, Gauge, TrendingUp, ExternalLink, Globe, Award, Star, User, ChevronDown, ListOrdered, Timer, ArrowBigDown, ArrowBigRightDashIcon, ArrowDownAZ, ArrowUpCircleIcon, ArrowUpLeftSquare, ArrowUpRightSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SegmentDetailModal from './SegmentDetailModal';
import SegmentLeaderboard from './SegmentLeaderboard'; 
import { AreaChart, Area, ResponsiveContainer, ReferenceArea } from 'recharts';

// --- STYLES & CONFIG ---
const containerStyle = { fontFamily: '"Inter", sans-serif' };

const styleSheet = `
@keyframes wiggly {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}
.kom-animate:hover .kom-icon {
  animation: wiggly 0.3s ease-in-out infinite;
}
`;

// --- UTILS ---
const formatChrono = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- TYPES ---
type SegmentLane = {
    laneIndex: number;
    segment: any;
};

// --- ALGO DE NON-SUPERPOSITION (TETRIS) ---
const calculateSegmentLanes = (segments: any[], totalPoints: number): { lanes: SegmentLane[], maxLanes: number } => {
    const sorted = [...segments].sort((a, b) => a.start_index - b.start_index);
    const lanes: { endIndex: number }[] = [];
    const results: SegmentLane[] = [];

    sorted.forEach(seg => {
        let placed = false;
        for (let i = 0; i < lanes.length; i++) {
            if (lanes[i].endIndex < seg.start_index) {
                lanes[i].endIndex = seg.end_index;
                results.push({ laneIndex: i, segment: seg });
                placed = true;
                break;
            }
        }
        if (!placed) {
            lanes.push({ endIndex: seg.end_index });
            results.push({ laneIndex: lanes.length - 1, segment: seg });
        }
    });
    return { lanes: results, maxLanes: lanes.length };
};

// --- COMPOSANT PROFIL ALTI STICKY ---
const InteractiveActivityChart = ({ 
    streams, 
    segments, 
    hoveredRange, 
    hoveredId,
    onHover,
    onBarClick 
}: { 
    streams: any, 
    segments: any[], 
    hoveredRange: [number, number] | null,
    hoveredId: number | null,
    onHover: (id: number | null, range: [number, number] | null) => void,
    onBarClick: (segment: any) => void
}) => {
    const data = useMemo(() => {
        if (!streams?.altitude) return [];
        const step = Math.ceil(streams.altitude.length / 300); 
        return streams.altitude
            .filter((_: any, i: number) => i % step === 0)
            .map((alt: number, i: number) => ({ index: i * step, alt: alt }));
    }, [streams]);

    const { lanes, maxLanes } = useMemo(() => {
        if (!streams?.altitude) return { lanes: [], maxLanes: 0 };
        return calculateSegmentLanes(segments, streams.altitude.length);
    }, [segments, streams]);

    const hoveredSegmentName = useMemo(() => {
        if (!hoveredId) return null;
        return segments.find(s => s.id === hoveredId)?.segment.name;
    }, [hoveredId, segments]);

    if (!data || data.length === 0) return null;
    const totalPoints = streams.altitude.length;

    return (
        <div className="sticky top-4 z-40 bg-[#050505]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-6 shadow-2xl transition-all duration-300">
            {/* Header Dynamique */}
            <div className="flex justify-between items-center mb-2 px-2 h-6">
                {hoveredSegmentName ? (
                    <span className="text-xs font-black text-[#d04fd7] uppercase tracking-widest animate-in fade-in slide-in-from-bottom-1">
                        {hoveredSegmentName}
                    </span>
                ) : (
                    // 🔥 RENOMMAGE ICI
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest transition-all">
                        PROFIL & SEGMENTS
                    </span>
                )}
            </div>

            <div className="h-[100px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#d04fd7" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#d04fd7" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        {hoveredRange && (
                            <ReferenceArea x1={hoveredRange[0]} x2={hoveredRange[1]} fill="#fff" fillOpacity={0.15} />
                        )}
                        <Area type="monotone" dataKey="alt" stroke="#d04fd7" strokeWidth={2} fill="url(#colorAlt)" isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div 
                className="relative w-full mt-2 border-t border-white/5 bg-[#0A0A0C]"
                style={{ height: `${Math.max(20, maxLanes * 8)}px` }}
            >
                {lanes.map(({ laneIndex, segment }) => {
                    const leftPct = (segment.start_index / totalPoints) * 100;
                    const widthPct = ((segment.end_index - segment.start_index) / totalPoints) * 100;
                    const isHovered = hoveredId === segment.id;
                    
                    let barColor = 'bg-gray-700';
                    if (segment.rank_global === 1) barColor = 'bg-purple-500';
                    else if (segment.is_pr) barColor = 'bg-yellow-500';
                    else if (segment.rank_global && segment.rank_global <= 10) barColor = 'bg-blue-500';

                    return (
                        <div
                            key={segment.id}
                            title={segment.segment.name}
                            onMouseEnter={() => onHover(segment.id, [segment.start_index, segment.end_index])}
                            onMouseLeave={() => onHover(null, null)}
                            onClick={(e) => {
                                e.stopPropagation();
                                onBarClick(segment);
                            }}
                            className={`
                                absolute h-1.5 rounded-full transition-all duration-200 cursor-pointer 
                                ${barColor} 
                                ${isHovered ? 'brightness-150 h-2 z-10 shadow-[0_0_10px_currentColor] scale-y-125' : 'opacity-60 hover:opacity-100'}
                            `}
                            style={{
                                left: `${leftPct}%`,
                                width: `${Math.max(0.5, widthPct)}%`,
                                top: `${laneIndex * 8 + 4}px`
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

// --- BADGES (Inchangés) ---
const GradeBadge = ({ grade }: { grade: number }) => {
    let colorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (grade > 4) colorClass = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    if (grade > 7) colorClass = 'text-orange-500 border-orange-500/30 bg-orange-500/10';
    if (grade > 10) colorClass = 'text-red-500 border-red-500/30 bg-red-500/10';
    return <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${colorClass} font-mono ml-3`}>{grade.toFixed(2)}%</span>;
};
const PersonalBadge = ({ rank }: { rank?: number }) => {
    const boxBase = "flex items-center justify-center gap-1.5 px-2 h-7 rounded border min-w-[50px] transition-all";
    if (rank === 1) return <div className={`${boxBase} bg-yellow-500/20 border-yellow-500/60 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.3)]`}><Crown size={12} fill="currentColor" /><span className="text-[11px] font-black tracking-wide">PR</span></div>;
    if (rank === 2) return <div className={`${boxBase} bg-slate-400/10 border-slate-400/40 text-slate-300`}><Medal size={12} /><span className="text-[11px] font-bold">#2</span></div>;
    if (rank === 3) return <div className={`${boxBase} bg-orange-700/20 border-orange-600/40 text-orange-400`}><Medal size={12} /><span className="text-[11px] font-bold">#3</span></div>;
    if (rank === 4) return <div className={`${boxBase} bg-blue-500/10 border-blue-500/30 text-blue-400`}><Award size={12} /><span className="text-[11px] font-bold">#4</span></div>;
    if (rank === 5) return <div className={`${boxBase} bg-emerald-500/10 border-emerald-500/30 text-emerald-400`}><Star size={12} /><span className="text-[11px] font-bold">#5</span></div>;
    if (rank && rank > 5) return <div className={`${boxBase} border-white/10 bg-white/[0.05] text-gray-400`}><User size={10} className="opacity-50" /><span className="text-[10px] font-mono font-bold">#{rank}</span></div>;
    return <div className={`${boxBase} border-white/5 bg-white/[0.02] text-gray-600 opacity-50`}><span className="text-[10px] font-mono font-bold">-</span></div>;
};
const GlobalBadge = ({ rank, bestRank }: { rank?: number, bestRank?: number | null }) => {
    // Si pas de rang du tout pour aujourd'hui, on n'affiche rien
    if (!rank) return null;

    // 1. Rendu du badge principal (Performance du jour)
    const renderMainBadge = () => {
        const boxBase = "flex items-center justify-center gap-1.5 px-2 h-7 rounded border min-w-[55px] transition-all";
        
        if (rank === 1) return <div className={`${boxBase} bg-purple-600/20 border-purple-500/60 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]`}><div className="kom-icon"><Crown size={12} fill="currentColor" /></div><span className="text-[11px] font-black tracking-wide">KOM</span></div>;
        if (rank === 2) return <div className={`${boxBase} bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]`}><Trophy size={12} strokeWidth={2.5} /><span className="text-[11px] font-bold">#2</span></div>;
        if (rank >= 3 && rank <= 5) return <div className={`${boxBase} bg-blue-500/10 border-blue-500/30 text-blue-400`}><Trophy size={11} /><span className="text-[11px] font-bold">#{rank}</span></div>;
        if (rank >= 6 && rank <= 10) return <div className={`${boxBase} bg-indigo-500/10 border-indigo-500/30 text-indigo-400`}><Trophy size={10} className="opacity-80" /><span className="text-[11px] font-bold">#{rank}</span></div>;
        
        // Par défaut (Au-delà du top 10)
        return <div className={`${boxBase} bg-[#0A0A0C] border-white/10 text-gray-500`}><Globe size={10} className="opacity-50" /><span className="text-[11px] font-mono font-bold">#{rank}</span></div>;
    };

    // 2. Rendu du "Fantôme" (Si ton historique est meilleur que ce jour)
    // On affiche le rappel SEULEMENT si tu es KOM ou TOP 10 historiquement, mais pas aujourd'hui
    const renderGhostStatus = () => {
        if (!bestRank) return null;
        if (bestRank >= rank) return null; 
        
        if (bestRank === 1) {
            return (
                <div title="Tu détiens le KOM sur ce segment" className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 opacity-80 hover:opacity-100 transition-opacity">
                    <Crown size={10} fill="currentColor" />
                </div>
            );
        }
        
        if (bestRank <= 10) {
             return (
                <div title={`Ton record : #${bestRank}`} className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 opacity-60 hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-bold">#{bestRank}</span>
                </div>
            );
        }

        return null;
    };

    return (
        // On utilise gap-1 pour coller les deux éléments proprement
        <div className="flex items-center gap-1">
            {renderMainBadge()}
            {renderGhostStatus()}
        </div>
    );
};
const StatCell = ({ value, unit, color = "text-white", label, icon: Icon }: any) => (
    <div className="flex flex-col items-center justify-center h-full w-full">
        <span className="text-[9px] text-gray-500 font-bold uppercase flex items-center gap-1.5 mb-0.5 tracking-wide opacity-70">{Icon && <Icon size={10} />} {label}</span>
        <div className={`text-base font-extrabold ${color} leading-none mt-0.5`}>{value}<span className="text-[10px] text-gray-600 ml-0.5 font-sans font-bold">{unit}</span></div>
    </div>
);
const getSegmentTheme = (rankGlobal: number | undefined, rankPerso: number | undefined) => {
    if (rankGlobal === 1) return { bar: 'bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)]', bg: 'bg-purple-900/20 hover:bg-purple-900/30', border: 'border-purple-500/30' };
    if (rankGlobal === 2) return { bar: 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]', bg: 'bg-cyan-900/20 hover:bg-cyan-900/30', border: 'border-cyan-500/20' };
    if (rankGlobal && rankGlobal <= 10) return { bar: 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]', bg: 'bg-blue-900/20 hover:bg-blue-900/30', border: 'border-blue-500/20' };
    if (rankPerso === 1) return { bar: 'bg-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.6)]', bg: 'bg-yellow-900/20 hover:bg-yellow-900/30', border: 'border-yellow-500/20' };
    if (rankPerso === 2) return { bar: 'bg-slate-400', bg: 'bg-slate-800/40 hover:bg-slate-800/50', border: 'border-slate-500/20' };
    if (rankPerso === 3) return { bar: 'bg-orange-600', bg: 'bg-orange-900/20 hover:bg-orange-900/30', border: 'border-orange-500/20' };
    return { bar: null, bg: 'bg-[#0E0E12] hover:bg-white/5', border: 'border-transparent' };
};

// --- MAIN COMPONENT ---

export default function MatchedSegmentsList({ segments, streams, userWeight, currentUserId }: { segments: any[], streams?: any, userWeight: number, currentUserId: string }) {
  const router = useRouter();
  
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<any | null>(null); 
  const [expandedId, setExpandedId] = useState<number | null>(null); 
  const [hoveredRange, setHoveredRange] = useState<[number, number] | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const sortedSegments = useMemo(() => {
    return [...segments].sort((a, b) => a.start_index - b.start_index);
  }, [segments]);

  const toggleExpand = (id: number) => {
    if (expandedId === id) setExpandedId(null);
    else setExpandedId(id);
  };

  const handleTimelineClick = (match: any) => {
      setExpandedId(match.id);
      setSelectedMatchForModal(match);
      setTimeout(() => {
          const element = document.getElementById(`segment-row-${match.id}`);
          if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.style.transition = 'background 0.5s';
              element.style.background = 'rgba(208, 79, 215, 0.2)';
              setTimeout(() => { element.style.background = ''; }, 1000);
          }
      }, 100);
  };

  return (
    <div className="mt-6 text-gray-200" style={containerStyle}>
        <style dangerouslySetInnerHTML={{ __html: styleSheet }} />

        {/* PROFIL ALTI */}
        <InteractiveActivityChart 
            streams={streams} 
            segments={sortedSegments} 
            hoveredRange={hoveredRange} 
            hoveredId={hoveredId}
            onHover={(id, range) => {
                setHoveredId(id);
                setHoveredRange(range);
            }}
            onBarClick={handleTimelineClick}
        />

        {/* LISTE DES SEGMENTS */}
        <div className="flex flex-col gap-2">
            {sortedSegments.map((match) => {
                const isHovered = hoveredRange?.[0] === match.start_index;
                const isExpanded = expandedId === match.id;

                const power = match.np_w || match.avg_power_w || 0;
                const vam = match.vam ? Math.round(match.vam) : 0;
                const speed = match.avg_speed_kmh.toFixed(1);
                const hr = match.avg_heartrate || '-';
                const dist = (match.segment.distance_m/1000).toFixed(2);

                const rankPerso = match.rank_personal || (match.is_pr ? 1 : undefined);
                const rankGlobal = match.rank_global || undefined;
                const bestRankEver = match.user_best_rank;

                const theme = getSegmentTheme(rankGlobal, rankPerso);
                let sideBarColor: string | null = theme.bar;

                return (
                    <div 
                        key={match.id} 
                        id={`segment-row-${match.id}`}
                        className="relative transition-all duration-300"
                    >
                        {/* LIGNE PRINCIPALE DU SEGMENT */}
                        <div 
                            onMouseEnter={() => {
                                setHoveredRange([match.start_index, match.end_index]);
                                setHoveredId(match.id);
                            }}
                            onMouseLeave={() => {
                                setHoveredRange(null);
                                setHoveredId(null);
                            }}
                            onClick={() => toggleExpand(match.id)}
                            // 🔥 HOVER STYLISÉ ICI : 
                            className={`
                                kom-animate group relative grid grid-cols-[auto_35%_1fr_auto] items-center h-[68px] px-2 rounded-xl border cursor-pointer transition-all duration-300
                                ${theme.bg} ${theme.border}
                                ${isHovered 
                                    ? 'shadow-xl z-10 scale-[1.005] border-opacity-50' 
                                    : 'border-opacity-30 hover:border-[#d04fd7]/30 hover:bg-white/[0.07] hover:shadow-[0_0_15px_rgba(208,79,215,0.05)]'} 
                                ${isExpanded ? 'rounded-b-none border-b-transparent bg-opacity-100 z-20' : ''}
                            `}
                        >
                            {/* Badges */}
                            <div className="flex items-center gap-2 mr-4 w-[145px]">
                                <PersonalBadge rank={rankPerso} />
                                <GlobalBadge rank={rankGlobal} bestRank={bestRankEver} />
                            </div>

                            {/* Identité */}
                            <div className="flex flex-col justify-center min-w-0 pr-4">
                                <span className={`text-base font-bold truncate ${rankPerso === 1 ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>{match.segment.name}</span>
                                <div className="flex items-center opacity-70 text-[11px] font-mono mt-0.5">
                                    <span className="text-gray-400">{dist} km</span>
                                    <GradeBadge grade={match.segment.average_grade} />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="hidden lg:grid grid-cols-5 h-full items-center mx-2 w-full">
                                <StatCell label="TEMPS" value={formatChrono(match.duration_s)} unit="" icon={Timer} color="text-white" />
                                <StatCell label="VIT." value={speed} unit="km/h" icon={Gauge} color="text-blue-400" />
                                <StatCell label="Puiss." value={power} unit="w" icon={Zap} color="text-[#d04fd7]" />
                                <StatCell label="FC" value={hr} unit="bpm" icon={Activity} color="text-red-400" />
                                <StatCell label="VAM" value={vam} unit="m/h" icon={TrendingUp} color="text-emerald-400" />
                            </div>

                            {/* Actions (Boutons) */}
                            <div className="flex items-center gap-1 pl-4 h-8 border-l border-white/5 ml-2">
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        window.open(`/segments/${match.segment_id}`, '_blank'); 
                                    }} 
                                    className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <ExternalLink size={16} />
                                </button>
                                
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setSelectedMatchForModal(match); 
                                    }} 
                                    className="p-2 text-gray-500 group-hover:text-[#d04fd7] transition-colors"
                                >
                                    {<ArrowBigRightDashIcon size={20} />}
                                </button>
                            </div>
                            
                            {sideBarColor && <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full z-20 ${sideBarColor}`} />}
                        </div>

                        {/* ZONE DÉPLIÉE (ACCORDION) */}
                        {isExpanded && (
                            <div className="bg-[#08080a] border border-t-0 border-white/10 rounded-b-xl p-4 animate-in slide-in-from-top-2 fade-in duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
                                {/* 🔥 CORRECTION CRITIQUE : segmentId={match.segment_id} */}
                                <SegmentLeaderboard segmentId={match.segment_id} currentUserId={currentUserId} currentEffort={match} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* MODALE */}
        {selectedMatchForModal && (
            <SegmentDetailModal 
                match={selectedMatchForModal} 
                streams={streams} 
                user={{ weight: userWeight, ftp: 300 }} 
                onClose={() => setSelectedMatchForModal(null)} 
            />
        )}
    </div>
  );
}