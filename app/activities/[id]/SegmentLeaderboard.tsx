// components/SegmentLeaderboard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Zap, Activity, User, Trophy, Medal, Ghost, TrendingUp, ChevronRight, MoreVertical } from 'lucide-react';

// --- TYPES ---
type LeaderboardData = {
    global: any[];
    personal: any[];
};

type CurrentEffort = {
    id: number;
    duration_s: number;
    avg_power_w: number;
    avg_heartrate?: number;
    rank_personal?: number;
    rank_global?: number; // On utilise ce champ pour l'affichage global
    created_at?: string;
};

// ... (Fonctions utilitaires inchangées : formatDuration, formatGap, formatDate, LeaderboardSkeleton) ...
const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatGap = (diffSeconds: number) => {
    if (diffSeconds <= 0) return '';
    const h = Math.floor(diffSeconds / 3600);
    const m = Math.floor((diffSeconds % 3600) / 60);
    const s = diffSeconds % 60;
    if (h > 0) return `+${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `+${m}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (dateString?: string) => {
    if (!dateString) return "Aujourd'hui";
    return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
};

const LeaderboardSkeleton = () => (
    <div className="space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg w-full flex items-center px-4 justify-between border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white/10 rounded-full" />
                    <div className="h-3 w-24 bg-white/10 rounded" />
                </div>
                <div className="h-3 w-12 bg-white/10 rounded" />
            </div>
        ))}
    </div>
);

// --- ROW COMPONENT ---
const LeaderboardRow = ({ 
    rank, 
    user, 
    activity, 
    duration, 
    power, 
    hr, 
    isMe, 
    isCurrentContext, 
    gapToLeader, 
    type 
}: any) => {
    
    let rankBadge = <span className="font-mono text-gray-500 text-xs w-6 text-center">#{rank}</span>;
    
    let rowBg = isCurrentContext 
        ? "bg-[#d04fd7]/10 border-[#d04fd7]/30 shadow-[0_0_15px_rgba(208,79,215,0.1)]" 
        : (isMe && type === 'GLOBAL') ? "bg-white/5 border-white/10" : "bg-transparent border-transparent hover:bg-white/[0.04]";
        
    let textColor = (isMe || isCurrentContext) ? "text-white" : "text-gray-300";
    let highlightColor = (isMe || isCurrentContext) ? "text-white" : "text-gray-300"; 
    let gapColor = "text-red-400";

    if (rank === 1) {
        if (type === 'GLOBAL') {
            rankBadge = <div className="w-6 h-6 flex items-center justify-center bg-yellow-500/20 text-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.2)]"><Crown size={14} fill="currentColor" /></div>;
            rowBg = isCurrentContext ? rowBg : "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20";
            textColor = "text-yellow-100";
            highlightColor = "text-yellow-400";
            gapColor = "text-yellow-500";
        } else {
            rankBadge = <div className="w-6 h-6 flex items-center justify-center bg-orange-500/20 text-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.2)]"><Medal size={14} /></div>;
            rowBg = isCurrentContext ? rowBg : "bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/20";
            textColor = "text-orange-100";
            highlightColor = "text-orange-400";
            gapColor = "text-orange-500";
        }
    } else if (rank === 2) {
        rankBadge = <div className="w-6 h-6 flex items-center justify-center bg-slate-400/20 text-slate-300 rounded-full"><Medal size={14} /></div>;
        if (type === 'GLOBAL' && !isCurrentContext) {
            rowBg = "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/10";
            textColor = "text-slate-200";
        }
    } else if (rank === 3) {
        rankBadge = <div className="w-6 h-6 flex items-center justify-center bg-amber-700/20 text-amber-600 rounded-full"><Medal size={14} /></div>;
        if (type === 'GLOBAL' && !isCurrentContext) {
            rowBg = "bg-gradient-to-r from-amber-700/10 to-transparent border-amber-700/10";
            textColor = "text-amber-100/80";
        }
    }

    return (
        <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 group ${rowBg}`}>
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0">{rankBadge}</div>
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 bg-gray-800 overflow-hidden border ${isMe ? 'border-white/30' : 'border-transparent'}`}>
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500"><User size={14} /></div>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className={`text-xs font-bold truncate ${textColor}`}>
                            {user?.name || 'Athlète Inconnu'} 
                            {(isMe && type === 'GLOBAL') && <span className="text-[9px] bg-white/20 px-1 rounded ml-1 text-white">MOI</span>}
                            {isCurrentContext && <span className="text-[9px] bg-[#d04fd7] px-1 rounded ml-1 text-black font-black">ACTUEL</span>}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                            <span>{formatDate(activity?.start_time)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4 text-right">
                <div className="hidden sm:flex flex-col items-end opacity-60 group-hover:opacity-100 transition-opacity">
                    {power && <span className="text-[10px] font-bold text-[#d04fd7] flex items-center gap-0.5"><Zap size={10} />{power}w</span>}
                    {hr && <span className="text-[10px] text-red-400 flex items-center gap-0.5"><Activity size={10} />{hr}</span>}
                </div>
                <div className="flex flex-col items-end min-w-[60px]">
                    <span className={`font-mono font-black text-sm ${highlightColor}`}>
                        {formatDuration(duration)}
                    </span>
                    {gapToLeader > 0 ? (
                        <span className={`text-[10px] font-mono font-bold opacity-80 text-red-400`}>
                            {formatGap(gapToLeader)}
                        </span>
                    ) : (
                        rank === 1 && (
                            <span className={`text-[9px] font-black tracking-wider opacity-80 ${gapColor}`}>
                                {type === 'GLOBAL' ? 'KOM' : 'PR'}
                            </span>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function SegmentLeaderboard({ segmentId, currentUserId, currentEffort }: { segmentId: number, currentUserId: string, currentEffort?: CurrentEffort }) {
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'global' | 'personal'>('global');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`/api/segments/leaderboard?segment_id=${segmentId}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [segmentId]);

    const komTime = data?.global?.[0]?.duration_s || 0;
    const prTime = data?.personal?.[0]?.duration_s || 0;
    
    // --- LOGIQUE CONTEXTUELLE ---

    // 1. GLOBAL : Si mon meilleur PR est hors du Top 10
    const myBestEffort = data?.personal?.[0];
    const isRankOutsideTop10 = myBestEffort && myBestEffort.rank_global > 10;

    // 2. GLOBAL : Si l'effort ACTUEL (qu'on vient de faire) est hors du Top 10
    // On s'assure aussi de ne pas l'afficher en double si c'est le même que le PR (qui serait déjà affiché par isRankOutsideTop10)
    const isCurrentGlobalEffortOutsideTop10 = currentEffort && currentEffort.rank_global && currentEffort.rank_global > 10;
    const shouldShowCurrentGlobalSeparately = isCurrentGlobalEffortOutsideTop10 && (!isRankOutsideTop10 || currentEffort?.id !== myBestEffort?.id);

    // 3. PERSONNEL : Si l'effort ACTUEL est hors du Top 5 personnel
    const isCurrentEffortOutsideTop5 = currentEffort && currentEffort.rank_personal && currentEffort.rank_personal > 5;

    return (
        <div className="flex flex-col gap-6">
            
            {/* TABS MOBILE */}
            <div className="flex md:hidden p-1 bg-white/5 rounded-lg mb-2">
                <button 
                    onClick={() => setActiveTab('global')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'global' ? 'bg-[#d04fd7] text-black shadow-lg' : 'text-gray-500'}`}
                >
                    TOP 10
                </button>
                <button 
                    onClick={() => setActiveTab('personal')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'personal' ? 'bg-[#d04fd7] text-black shadow-lg' : 'text-gray-500'}`}
                >
                    HISTORIQUE
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                
                {/* --- COLONNE 1 : CLASSEMENT GLOBAL --- */}
                <div className={`flex-1 ${activeTab === 'personal' ? 'hidden md:block' : ''}`}>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 pl-1">
                        <Trophy size={14} className="text-yellow-500" /> Leaderboard (Top 10)
                    </h4>
                    
                    {loading ? <LeaderboardSkeleton /> : (
                        <div className="flex flex-col gap-1.5">
                            {(!data?.global || data.global.length === 0) ? (
                                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl">
                                    <Ghost className="mx-auto h-8 w-8 text-gray-600 mb-2" />
                                    <p className="text-xs text-gray-500">Ce segment est vierge.<br/>Sois le premier à marquer l'histoire !</p>
                                </div>
                            ) : (
                                <>
                                    {data.global.map((effort: any, index: number) => (
                                        <LeaderboardRow 
                                            key={effort.id}
                                            rank={index + 1}
                                            user={effort.users}
                                            activity={effort.activities}
                                            duration={effort.duration_s}
                                            power={effort.avg_power_w}
                                            hr={effort.avg_heartrate}
                                            isMe={String(effort.users?.id) === String(currentUserId)}
                                            isCurrentContext={currentEffort?.id === effort.id} // Highlight si c'est l'actuel
                                            gapToLeader={effort.duration_s - komTime}
                                            type="GLOBAL" 
                                        />
                                    ))}

                                    {/* GLOBAL : MON MEILLEUR TEMPS (PR) SI HORS TOP 10 */}
                                    {isRankOutsideTop10 && (
                                        <>
                                            <div className="flex justify-center py-1 opacity-30">
                                                <MoreVertical size={16} className="text-gray-500" />
                                            </div>
                                            <LeaderboardRow 
                                                rank={myBestEffort.rank_global}
                                                user={{ name: 'Moi', avatar_url: null }} 
                                                activity={myBestEffort.activities}
                                                duration={myBestEffort.duration_s}
                                                power={myBestEffort.avg_power_w}
                                                hr={myBestEffort.avg_heartrate}
                                                isMe={true}
                                                isCurrentContext={currentEffort?.id === myBestEffort.id}
                                                gapToLeader={myBestEffort.duration_s - komTime}
                                                type="GLOBAL" 
                                            />
                                        </>
                                    )}

                                    {/* 🔥 AJOUT GLOBAL : L'EFFORT ACTUEL SI HORS TOP 10 ET SI PAS DEJA AFFICHE EN TANT QUE PR */}
                                    {shouldShowCurrentGlobalSeparately && (
                                        <>
                                            <div className="flex justify-center py-1 opacity-30">
                                                <MoreVertical size={16} className="text-gray-500" />
                                            </div>
                                            <LeaderboardRow 
                                                rank={currentEffort!.rank_global}
                                                user={{ name: 'Moi', avatar_url: null }} 
                                                activity={{ start_time: currentEffort!.created_at || new Date().toISOString() }}
                                                duration={currentEffort!.duration_s}
                                                power={currentEffort!.avg_power_w}
                                                hr={currentEffort!.avg_heartrate}
                                                isMe={true}
                                                isCurrentContext={true}
                                                gapToLeader={currentEffort!.duration_s - komTime}
                                                type="GLOBAL" 
                                            />
                                        </>
                                    )}

                                    <Link 
                                        href={`/segments/${segmentId}`} 
                                        className="mt-4 group flex items-center justify-center gap-1.5 text-[10px] font-black text-[#d04fd7] hover:text-[#e06ce7] transition-colors uppercase tracking-widest border-t border-white/5 pt-4"
                                    >
                                        Voir le classement complet
                                        <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* --- COLONNE 2 : HISTORIQUE PERSONNEL --- */}
                <div className={`flex-1 ${activeTab === 'global' ? 'hidden md:block' : ''}`}>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2 pl-1">
                        <Activity size={14} className="text-[#d04fd7]" /> Mes Tentatives (Top 5)
                    </h4>

                    {loading ? <LeaderboardSkeleton /> : (
                        <div className="flex flex-col gap-1.5">
                             {(!data?.personal || data.personal.length === 0) ? (
                                <div className="p-8 text-center border border-dashed border-white/10 rounded-xl">
                                    <TrendingUp className="mx-auto h-8 w-8 text-gray-600 mb-2" />
                                    <p className="text-xs text-gray-500">Pas encore de chrono enregistré.<br/>Va rouler !</p>
                                </div>
                            ) : (
                                <>
                                    {data.personal.map((effort: any, index: number) => (
                                        <LeaderboardRow 
                                            key={effort.id}
                                            rank={index + 1}
                                            user={{ name: 'Moi', avatar_url: null }}
                                            activity={effort.activities}
                                            duration={effort.duration_s}
                                            power={effort.avg_power_w}
                                            hr={effort.avg_heartrate}
                                            isMe={true}
                                            isCurrentContext={currentEffort?.id === effort.id} // Highlight si c'est l'actuel
                                            gapToLeader={effort.duration_s - prTime}
                                            type="PERSONAL" 
                                        />
                                    ))}

                                    {/* PERSONNEL : L'EFFORT ACTUEL SI HORS TOP 5 */}
                                    {isCurrentEffortOutsideTop5 && currentEffort && (
                                        <>
                                            <div className="flex justify-center py-1 opacity-30">
                                                <MoreVertical size={16} className="text-gray-500" />
                                            </div>
                                            <LeaderboardRow 
                                                rank={currentEffort.rank_personal}
                                                user={{ name: 'Moi', avatar_url: null }}
                                                activity={{ start_time: currentEffort.created_at || new Date().toISOString() }}
                                                duration={currentEffort.duration_s}
                                                power={currentEffort.avg_power_w}
                                                hr={currentEffort.avg_heartrate}
                                                isMe={true}
                                                isCurrentContext={true} // C'est celui-ci qu'on regarde !
                                                gapToLeader={currentEffort.duration_s - prTime}
                                                type="PERSONAL" 
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}