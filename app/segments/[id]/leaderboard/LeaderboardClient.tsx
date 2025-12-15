// Fichier : app/segments/[id]/leaderboard/LeaderboardClient.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { User, Scale, Zap, TrendingUp, Filter, Timer, Activity, Award } from 'lucide-react';

export default function LeaderboardClient({ segmentId, initialData }: any) {
    const [filter, setFilter] = useState({
        year: 'All',
        weight: 'All',
        age: 'All',
        sort: 'duration_s'
    });

    // Logique de filtrage locale (plus réactive que de retourner au serveur)
    const filteredData = useMemo(() => {
        return initialData.filter((effort: any) => {
            const user = effort.user;
            const w = user?.weight || 75;
            const a = user?.age || 35;
            
            let weightMatch = true;
            if (filter.weight === '< 65kg') weightMatch = w < 65;
            else if (filter.weight === '65-80kg') weightMatch = w >= 65 && w <= 80;
            else if (filter.weight === '> 80kg') weightMatch = w > 80;

            let ageMatch = true;
            if (filter.age === 'Espoir') ageMatch = a < 30;
            else if (filter.age === 'Senior') ageMatch = a >= 30 && a <= 45;
            else if (filter.age === 'Master') ageMatch = a > 45;

            return weightMatch && ageMatch;
        }).sort((a: any, b: any) => {
            if (filter.sort === 'duration_s') return a.duration_s - b.duration_s;
            return b[filter.sort] - a[filter.sort];
        });
    }, [initialData, filter]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            {/* CONTRÔLE DE MISSION (FILTRES) */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 sticky top-8">
                    <h3 className="text-[#00f3ff] text-[10px] font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                        <Filter size={14} /> Filtres Télémétriques
                    </h3>
                    
                    <div className="space-y-8">
                        <FilterGroup 
                            label="Catégorie de Poids" 
                            current={filter.weight} 
                            options={['All', '< 65kg', '65-80kg', '> 80kg']} 
                            onChange={(v: string) => setFilter({...filter, weight: v})}
                        />
                        <FilterGroup 
                            label="Tranche d'Âge" 
                            current={filter.age} 
                            options={['All', 'Espoir', 'Senior', 'Master']} 
                            onChange={(v: string) => setFilter({...filter, age: v})}
                        />
                        <FilterGroup 
                            label="Trier par" 
                            current={filter.sort} 
                            options={[
                                {label: 'Chrono', value: 'duration_s'},
                                {label: 'W/Kg', value: 'w_kg'},
                                {label: 'VAM', value: 'vam'}
                            ]} 
                            isSort
                            onChange={(v: string) => setFilter({...filter, sort: v})}
                        />
                    </div>
                </div>
            </div>

            {/* LEADERBOARD LIST */}
            <div className="lg:col-span-3 space-y-3">
                {filteredData.map((effort: any, index: number) => {
                    const imc = effort.user?.weight / Math.pow(effort.user?.height / 100, 2);
                    
                    return (
                        <div key={effort.id} className="group relative bg-[#0a0a0c] border border-white/5 hover:border-[#d04fd7]/30 rounded-2xl p-5 flex items-center justify-between transition-all duration-300">
                            {/* Rang Néon */}
                            <div className="flex items-center gap-8">
                                <div className="w-12 text-center">
                                    <span className={`text-3xl font-black italic ${index < 3 ? 'text-[#d04fd7]' : 'text-gray-800'}`}>
                                        #{(index + 1).toString().padStart(2, '0')}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <img src={effort.user?.avatar_url || '/default-avatar.png'} className="w-14 h-14 rounded-full border-2 border-white/5 group-hover:border-[#d04fd7]/50 transition-all" alt="" />
                                        {index === 0 && <Award className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400" size={20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white tracking-tight">{effort.user?.name}</h4>
                                        <div className="flex gap-4 mt-1">
                                            <span className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase">
                                                <Scale size={12} className="text-gray-700" /> {effort.user?.weight}kg
                                            </span>
                                            <span className="flex items-center gap-1.5 text-[9px] font-black text-gray-500 uppercase border-l border-white/5 pl-4">
                                                <User size={12} className="text-gray-700" /> IMC {imc.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Data Points */}
                            <div className="flex items-center gap-12 text-right pr-4">
                                <MetricBlock label="Chrono" value={formatTime(effort.duration_s)} unit="" icon={Timer} color="text-white" />
                                <MetricBlock label="Efficience" value={effort.w_kg?.toFixed(2)} unit="W/kg" icon={Zap} color="text-[#d04fd7]" />
                                <MetricBlock label="Grimpe" value={effort.vam} unit="m/h" icon={TrendingUp} color="text-[#00f3ff]" />
                            </div>
                        </div>
                    );
                })}

                {filteredData.length === 0 && (
                    <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                        <p className="text-gray-600 font-mono text-sm uppercase tracking-widest italic">Aucun athlète ne correspond à ces critères bio-télémétriques.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function MetricBlock({ label, value, unit, icon: Icon, color }: any) {
    return (
        <div className="min-w-[90px]">
            <div className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
                <Icon size={10} /> {label}
            </div>
            <div className={`text-xl font-mono font-black ${color}`}>
                {value}<small className="text-[10px] ml-1 opacity-50 font-sans uppercase">{unit}</small>
            </div>
        </div>
    );
}

function FilterGroup({ label, options, current, onChange, isSort }: any) {
    return (
        <div>
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-4 block">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map((opt: any) => {
                    const val = typeof opt === 'string' ? opt : opt.value;
                    const lab = typeof opt === 'string' ? opt : opt.label;
                    const isActive = current === val;
                    return (
                        <button 
                            key={val} 
                            onClick={() => onChange(val)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                                isActive 
                                ? 'bg-[#d04fd7] border-[#d04fd7] text-black shadow-[0_0_15px_rgba(208,79,215,0.3)]' 
                                : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30'
                            }`}
                        >
                            {lab}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}