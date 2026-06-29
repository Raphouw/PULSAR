'use client';

import React, { useState, useMemo } from 'react';
import { Zap, ChevronDown, Calendar, Crown, Medal, ArrowUpRight, Clock, Activity, Flame } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PowerRecordsTab({ rawRecords, userWeight = 68 }: { rawRecords: any[], userWeight?: number }) {
    const router = useRouter();
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [powerMode, setPowerMode] = useState<'power_elapsed' | 'power_moving' | 'power_np'>('power_elapsed');

    const safeRecords = useMemo(() => {
        if (!rawRecords) return [];
        
        // ⚡ CORRECTION : Si on cherche le mode elapsed, la BDD contient la catégorie classique 'power'
        const targetCategory = powerMode === 'power_elapsed' ? 'power' : powerMode;
        
        return rawRecords
            .filter(r => r.category === targetCategory)
            .map(r => ({ ...r, safeKey: r.metric_id }));
    }, [rawRecords, powerMode]);

    // On mappe les clés pour garder l'ordre parfait exact que tu avais
    const powerKeys = useMemo(() => {
        const map = new Map<string, { id: string, label: string, seconds: number }>();
        const order = { 'P1s': 1, 'P15s': 15, 'P30s': 30, 'P1m': 60, 'P5m': 300, 'P20m': 1200, 'P1h': 3600, 'Pmoymax': 9999 };
        
        safeRecords.forEach(r => {
            const key = r.safeKey as keyof typeof order;
            if (!key || map.has(key) || !order[key]) return;
            map.set(key, { id: key, label: key === 'Pmoymax' ? 'P-MOY MAX' : key.replace('P', '').toUpperCase(), seconds: order[key] });
        });

        return Array.from(map.values()).sort((a, b) => a.seconds - b.seconds);
    }, [safeRecords]);

    const RankIcon = ({ rank }: { rank: number }) => {
        if (rank === 1) return <Crown size={18} className="text-yellow-500" fill="currentColor" />;
        if (rank === 2) return <Medal size={18} className="text-gray-300" />;
        if (rank === 3) return <Medal size={18} className="text-orange-500" />;
        return <span className="text-xs font-bold text-gray-600 w-[18px] text-center font-mono">{rank}</span>;
    };

    return (
        <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
            <div className="flex bg-[#141419] p-1.5 rounded-xl border border-white/5 mb-2">
                <button onClick={() => { setPowerMode('power_elapsed'); setExpandedKey(null); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold ${powerMode === 'power_elapsed' ? 'bg-[#eab308] text-black' : 'text-gray-400 hover:text-white'}`}><Clock size={14} /> 0s Inclus</button>
                <button onClick={() => { setPowerMode('power_moving'); setExpandedKey(null); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold ${powerMode === 'power_moving' ? 'bg-[#eab308] text-black' : 'text-gray-400 hover:text-white'}`}><Activity size={14} /> 0s Exclus</button>
                <button onClick={() => { setPowerMode('power_np'); setExpandedKey(null); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold ${powerMode === 'power_np' ? 'bg-[#eab308] text-black' : 'text-gray-400 hover:text-white'}`}><Flame size={14} /> NP</button>
            </div>

            <div className="flex flex-col gap-3">
                {powerKeys.map(k => {
                    const isExpanded = expandedKey === k.id;
                    const top10 = safeRecords.filter(r => r.safeKey === k.id).sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 10);
                    if (top10.length === 0) return null;

                    const bestW = Math.round(Number(top10[0].value));
                    const bestWkg = (bestW / userWeight).toFixed(2);

                    return (
                        <div key={k.id} className={`bg-[#0a0a0c] border transition-all rounded-2xl overflow-hidden ${isExpanded ? 'border-[#eab308]/30' : 'border-white/5'}`}>
                            <button onClick={() => setExpandedKey(isExpanded ? null : k.id)} className="w-full p-4 flex items-center justify-between bg-[#141419] hover:bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isExpanded ? 'bg-[#eab308]/20 text-[#eab308]' : 'bg-white/5 text-gray-500'}`}>
                                        <Zap size={20} fill={isExpanded ? "currentColor" : "none"} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-black text-lg text-white">{k.label}</h3>
                                        <span className="text-[10px] text-gray-500">{top10.length} EFFORTS</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end">
                                        <div className="text-xl font-black text-white">{bestW} W</div>
                                        <div className="text-[10px] text-[#eab308] font-bold font-mono bg-[#eab308]/10 px-2 py-0.5 rounded">{bestWkg} W/kg</div>
                                    </div>
                                    <ChevronDown size={20} className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180 text-[#eab308]' : ''}`} />
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="p-4 bg-black/40">
                                    <div className="flex flex-col gap-1.5">
                                        {top10.map((record, idx) => (
                                            <button key={idx} onClick={() => router.push(`/activities/${record.activity_id}`)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent">
                                                <div className="flex items-center gap-4">
                                                    <RankIcon rank={idx + 1} />
                                                    <div className="text-left">
                                                        <span className="text-sm font-bold text-white">{record.activities?.name || "Sortie"}</span>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase"><Calendar size={10}/> {new Date(record.date_recorded).toLocaleDateString('fr-FR')}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-base font-black text-white">{Math.round(record.value)}W</span>
                                                    </div>
                                                    <ArrowUpRight size={16} className="text-gray-700" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}