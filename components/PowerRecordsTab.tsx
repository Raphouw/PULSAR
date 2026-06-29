'use client';

import React, { useState, useMemo } from 'react';
import { Zap, ChevronDown, Calendar, Medal, Crown, ArrowUpRight, Clock, Activity, Flame } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PowerRecordsTab({ rawRecords, userWeight = 68 }: { rawRecords: any[], userWeight?: number }) {
    const router = useRouter();
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [powerMode, setPowerMode] = useState<'power_elapsed' | 'power_moving' | 'power_np'>('power_elapsed');

    // Filtre sur la catégorie sélectionnée par le Tab
    const safeRecords = useMemo(() => {
        if (!rawRecords) return [];
        // L'astuce : Le mode "Elapsed" utilise la catégorie classique 'power' dans la BDD
        const targetCategory = powerMode === 'power_elapsed' ? 'power' : powerMode;
        
        return rawRecords
            .filter(r => r.category === targetCategory)
            .map(r => ({
                ...r,
                safeKey: (r.type || r.metric_id || '').toLowerCase()
            }));
    }, [rawRecords, powerMode]);

    // Extraction et tri des clés avec le système de Regex sécurisé
    const powerKeys = useMemo(() => {
        const map = new Map<string, { id: string, label: string, seconds: number }>();
        
        safeRecords.forEach(r => {
            const key = r.safeKey;
            if (!key || map.has(key)) return;

            // Gestion de la P-Moy Max qui n'a pas de chiffre
            if (key === 'pe_pmoymax' || key === 'pm_pmoymax' || key === 'np_pmoymax') {
                map.set(key, { id: key, label: 'P-MOY MAX', seconds: 999999 });
                return;
            }

            const match = key.match(/^(?:pe_|pm_|np_|p)(\d+)(s|m|h)$/i);
            if (match) {
                const val = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                let seconds = val;
                let labelUnit = 'sec';
                
                if (unit === 'm') { seconds = val * 60; labelUnit = 'min'; }
                if (unit === 'h') { seconds = val * 3600; labelUnit = val === 1 ? 'heure' : 'heures'; }

                // Injection de tes labels stylisés (ex: "SPRINT (15S)")
                let customLabel = `${val} ${labelUnit.toUpperCase()}`;
                if (seconds === 1) customLabel = 'P-MAX (1S)';
                else if (seconds === 5) customLabel = 'SPRINT (5S)';
                else if (seconds === 15) customLabel = 'SPRINT (15S)';
                else if (seconds === 30) customLabel = 'SPRINT (30S)';
                else if (seconds === 60) customLabel = 'ANAÉROBIE (1M)';
                else if (seconds === 300) customLabel = 'PMA (5M)';
                else if (seconds === 1200) customLabel = 'SEUIL (20M)';
                else if (seconds === 3600) customLabel = 'ENDURANCE (1H)';
                
                map.set(key, { id: key, label: customLabel, seconds });
            }
        });

        return Array.from(map.values()).sort((a, b) => a.seconds - b.seconds);
    }, [safeRecords]);

    const RankIcon = ({ rank }: { rank: number }) => {
        if (rank === 1) return <Crown size={18} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" fill="currentColor" />;
        if (rank === 2) return <Medal size={18} className="text-gray-300" />;
        if (rank === 3) return <Medal size={18} className="text-orange-500" />;
        return <span className="text-xs font-bold text-gray-600 w-[18px] text-center font-mono">{rank}</span>;
    };

    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto w-full">
            
            <div className="text-center mb-4">
                <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2 uppercase tracking-tight">
                    <Zap size={24} className="text-[#eab308]" fill="currentColor" />
                    Courbe de Puissance & Top 10
                </h2>
                <p className="text-gray-500 text-sm mt-1">L'historique complet de tes meilleures performances par intervalle.</p>
            </div>

            {/* Menu Tabs de Puissance */}
            <div className="flex bg-[#141419] p-1.5 rounded-xl border border-white/5 mb-2 overflow-x-auto hide-scrollbar">
                <button 
                    onClick={() => { setPowerMode('power_elapsed'); setExpandedKey(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${powerMode === 'power_elapsed' ? 'bg-[#eab308] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Clock size={16} /> Elapsed (0s compris)
                </button>
                <button 
                    onClick={() => { setPowerMode('power_moving'); setExpandedKey(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${powerMode === 'power_moving' ? 'bg-[#eab308] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Activity size={16} /> Moving (0s exclus)
                </button>
                <button 
                    onClick={() => { setPowerMode('power_np'); setExpandedKey(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${powerMode === 'power_np' ? 'bg-[#eab308] text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Flame size={16} /> Normalized Power (NP)
                </button>
            </div>

            {powerKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 opacity-50 bg-[#0a0a0c] rounded-2xl border border-white/5">
                    <Zap size={48} className="mb-4 text-gray-600" />
                    <p>Aucune donnée calculée pour ce filtre.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {powerKeys.map(k => {
                        const isExpanded = expandedKey === k.id;
                        
                        const top10 = safeRecords
                            .filter(r => r.safeKey === k.id)
                            .sort((a, b) => Number(b.value) - Number(a.value))
                            .slice(0, 10);

                        if (top10.length === 0) return null;

                        const bestW = Math.round(Number(top10[0].value));
                        const bestWkg = (bestW / userWeight).toFixed(2);

                        return (
                            <div key={k.id} className={`bg-[#0a0a0c] border transition-all duration-300 rounded-2xl overflow-hidden shadow-lg ${isExpanded ? 'border-[#eab308]/30' : 'border-white/5 hover:border-white/10'}`}>
                                
                                <button 
                                    onClick={() => setExpandedKey(isExpanded ? null : k.id)} 
                                    className="w-full p-4 flex items-center justify-between bg-[#141419] hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-[#eab308]/20 text-[#eab308]' : 'bg-white/5 text-gray-500'}`}>
                                            <Zap size={20} fill={isExpanded ? "currentColor" : "none"} />
                                        </div>
                                        <div className="text-left flex flex-col">
                                            <h3 className="font-black text-lg text-white uppercase tracking-wider">{k.label}</h3>
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{top10.length} efforts enregistrés</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="hidden sm:flex flex-col items-end">
                                            <div className="text-xl font-black text-white flex items-baseline gap-1">
                                                {bestW} <span className="text-xs text-gray-500">W</span>
                                            </div>
                                            <div className="text-[10px] text-[#eab308] font-bold font-mono bg-[#eab308]/10 px-2 py-0.5 rounded">
                                                {bestWkg} W/kg
                                            </div>
                                        </div>
                                        <ChevronDown size={20} className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#eab308]' : ''}`} />
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="p-2 sm:p-4 border-t border-white/5 bg-black/40 max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                                        <div className="flex flex-col gap-1.5">
                                            {top10.map((record, index) => {
                                                const w = Math.round(Number(record.value));
                                                const wkg = (w / userWeight).toFixed(2);
                                                const date = new Date(record.date_recorded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                                                const activityName = record.activities?.name || "Activité inconnue";

                                                return (
                                                    <button 
                                                        key={`${k.id}-${index}`}
                                                        onClick={() => router.push(`/activities/${record.activity_id}`)}
                                                        className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-all group"
                                                    >
                                                        <div className="flex items-center gap-3 sm:gap-4">
                                                            <RankIcon rank={index + 1} />
                                                            <div className="flex flex-col items-start">
                                                                <span className="text-sm font-bold text-white text-left line-clamp-1 group-hover:text-[#eab308] transition-colors max-w-[150px] sm:max-w-[300px]">
                                                                    {activityName}
                                                                </span>
                                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-mono uppercase">
                                                                    <Calendar size={10} /> {date}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-base font-black text-white group-hover:text-[#eab308] transition-colors">{w}W</span>
                                                                <span className="text-[10px] text-gray-500 font-mono">{wkg} w/kg</span>
                                                            </div>
                                                            <ArrowUpRight size={16} className="text-gray-700 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}