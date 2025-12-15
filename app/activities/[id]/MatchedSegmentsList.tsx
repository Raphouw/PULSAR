'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, Zap, BarChart3, TrendingUp, Target, ChevronRight, Award, ExternalLink, Medal, Activity } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceArea } from 'recharts';
import SegmentDetailModal from './SegmentDetailModal';
import { calculatePulsarScore, getPulsarCategory } from '../../../lib/physics';
import { useRouter } from 'next/navigation';

// --- UI COMPONENTS ---

const ActivityElevationProfile = ({ streams, highlightRange }: { streams: any, highlightRange: [number, number] | null }) => {
    const data = useMemo(() => {
        if (!streams?.altitude) return [];
        return streams.altitude.map((alt: number, i: number) => ({ index: i, alt: alt }));
    }, [streams]);

    return (
        <div className="sticky top-4 z-50 bg-[#0a0a0c]/80 border border-white/5 rounded-3xl p-4 mb-8 backdrop-blur-xl h-[100px] shadow-2xl">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d04fd7" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#d04fd7" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    {highlightRange && (
                        <ReferenceArea x1={highlightRange[0]} x2={highlightRange[1]} fill="#fff" fillOpacity={0.1} stroke="rgba(255,255,255,0.2)" />
                    )}
                    <Area type="monotone" dataKey="alt" stroke="#d04fd7" strokeWidth={2} fill="url(#elevationGradient)" isAnimationActive={false} />
                    <XAxis dataKey="index" hide />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default function MatchedSegmentsList({ segments, streams, userWeight }: { segments: any[], streams?: any, userWeight: number }) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [hoveredRange, setHoveredRange] = useState<[number, number] | null>(null);

  const sortedSegments = useMemo(() => {
    return [...segments].sort((a, b) => a.start_index - b.start_index);
  }, [segments]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Logique pour déterminer le type de badge PR (Or, Argent, Bronze)
  const getPRStatus = (match: any) => {
    if (match.is_pr) return { label: 'PR', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Zap };
    // Ici on simule une logique 2e/3e temps si les données sont dispo, sinon on reste simple
    if (match.pr_gap_seconds < 10 && match.pr_gap_seconds > 0) return { label: 'Top 3', color: 'text-slate-300', bg: 'bg-slate-300/10', icon: Medal };
    return null;
  };

  return (
    <div className="mt-8 font-sans text-[#F1F1F1]">
      <ActivityElevationProfile streams={streams} highlightRange={hoveredRange} />

      <div className="flex flex-col gap-4">
        {sortedSegments.map((match, i) => {
          const isExpanded = expandedId === match.id;
          const prStatus = getPRStatus(match);
          const { index, density } = calculatePulsarScore(
              match.segment.distance_m, 
              match.segment.elevation_gain_m, 
              match.segment.average_grade, 
              match.segment.polyline
          );
          const cat = getPulsarCategory(index, match.segment.distance_m, density);

          return (
            <div 
                key={`${match.id}-${i}`} 
                onMouseEnter={() => setHoveredRange([match.start_index, match.end_index])}
                onMouseLeave={() => setHoveredRange(null)}
                className="flex flex-col"
            >
              <div 
                onClick={() => setExpandedId(isExpanded ? null : match.id)}
                className={`
                  relative transition-all duration-300 cursor-pointer p-6 flex items-center justify-between
                  ${isExpanded ? 'bg-white/10 rounded-t-3xl border-x border-t border-white/10' : 'bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/[0.06] hover:border-white/20'}
                `}
              >
                {match.is_pr && <div className="absolute left-0 top-6 bottom-6 w-1 bg-yellow-400 rounded-r-full shadow-[0_0_15px_rgba(250,204,21,0.4)]" />}
                
                <div className="flex items-center gap-6">
                    <span className="text-xs text-gray-600 font-medium">{(i + 1).toString().padStart(2, '0')}</span>
                    <div>
                        <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-white text-lg tracking-tight">{match.segment.name}</h4>
                            {prStatus && (
                                <div className={`flex items-center gap-1 ${prStatus.bg} px-2 py-0.5 rounded-full border border-white/5`}>
                                    <prStatus.icon size={12} className={`${prStatus.color} fill-current`} />
                                    <span className={`text-[10px] font-bold ${prStatus.color}`}>{prStatus.label}</span>
                                </div>
                            )}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                            {(match.segment.distance_m/1000).toFixed(2)}km • {match.segment.average_grade.toFixed(1)}% gradient
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{ background: cat.color, color: cat.textColor, border: cat.border ? '1px solid #d04fd7' : 'none' }}>
                        {cat.label}
                    </div>

                    <div className="flex gap-10 items-center">
                        <div className="text-right">
                            <div className="text-[10px] text-gray-600 font-semibold uppercase tracking-tight">Temps</div>
                            <div className="text-xl font-medium text-white">{formatTime(match.duration_s)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-gray-600 font-semibold uppercase tracking-tight">Puissance</div>
                            <div className="text-xl font-medium text-[#d04fd7]">{match.np_w || match.avg_power_w}W</div>
                        </div>
                    </div>

                    <div className={`p-2 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-[#d04fd7]' : 'text-gray-700'}`}>
                        <ChevronRight size={20} />
                    </div>
                </div>
              </div>

              {/* CLASSEMENT DÉPLIÉ */}
              {isExpanded && (
                <div className="bg-white/[0.05] border-x border-b border-white/10 rounded-b-3xl p-8 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#d04fd7] uppercase tracking-wider">
                            <TrendingUp size={16}/> Analyse de l'effort
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <MetricCard label="Score Pulsar" value={index} icon={<Activity size={16}/>} />
                            <MetricCard label="Puissance Relative" value={`${match.w_kg?.toFixed(2) || '-'} w/kg`} icon={<Zap size={16}/>} />
                        </div>
                        
                        {!match.is_pr && match.pr_gap_seconds > 0 && (
                            <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl">
                                <div className="flex items-center gap-2 text-xs font-bold text-white mb-2">
                                    <Target size={14} className="text-red-400" /> RETARD PR : <span className="text-red-400">+{formatTime(match.pr_gap_seconds)}</span>
                                </div>
                                <p className="text-[13px] text-gray-400 leading-relaxed">
                                    Il te manque environ <span className="text-white font-semibold">{Math.round(match.avg_power_w * (match.pr_gap_seconds / match.duration_s))}W</span> de moyenne pour égaler ton record.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-xs font-bold text-[#00f3ff] uppercase tracking-wider flex items-center gap-2">
                                <Trophy size={16}/> Leaderboard Session
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                             <LeaderRow rank={1} name="Actuel" value={formatTime(match.duration_s)} isUser watts={match.np_w || match.avg_power_w} />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button 
                                onClick={(e) => { e.stopPropagation(); router.push(`/segments/${match.segment_id}`); }} 
                                className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold uppercase tracking-wider text-gray-300 hover:bg-white/10 transition-all"
                            >
                                <ExternalLink size={14} /> Page du Segment
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedMatch(match); }} 
                                className="flex items-center justify-center gap-2 py-3 bg-[#d04fd7] border border-[#d04fd7] rounded-xl text-[11px] font-bold uppercase tracking-wider text-black hover:bg-[#b03fb7] transition-all"
                            >
                                <BarChart3 size={14} /> Analyse Flux
                            </button>
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedMatch && (
          <SegmentDetailModal 
            match={selectedMatch} 
            streams={streams} 
            user={{ weight: userWeight, ftp: 300 }} 
            onClose={() => setSelectedMatch(null)} 
          />
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

const MetricCard = ({ label, value, icon }: any) => (
    <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
        <div className="text-[#d04fd7]">{icon}</div>
        <div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase">{label}</div>
            <div className="text-lg font-bold text-white leading-none mt-1">{value}</div>
        </div>
    </div>
);

const LeaderRow = ({ rank, name, value, isUser, watts }: any) => (
    <div className={`
        flex items-center justify-between p-4 rounded-2xl border 
        ${isUser ? 'bg-[#00f3ff]/5 border-[#00f3ff]/20' : 'bg-white/5 border-white/5'}
    `}>
        <div className="flex items-center gap-4">
            <span className={`text-xs font-bold ${isUser ? 'text-[#00f3ff]' : 'text-gray-500'}`}>#{rank}</span>
            <span className={`text-sm font-semibold ${isUser ? 'text-white' : 'text-gray-400'}`}>{name}</span>
        </div>
        <div className="flex items-center gap-6">
            <span className="text-xs text-gray-500 font-medium">{watts}W</span>
            <span className={`text-sm font-bold ${isUser ? 'text-[#00f3ff]' : 'text-white'}`}>{value}</span>
        </div>
    </div>
);