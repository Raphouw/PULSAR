'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Trophy, Medal, Flame, Activity, User, Shield } from 'lucide-react';

// --- TYPES ---
type Legend = {
  user_id: string;
  name: string;
  image: string | null;
  count_koms: number;
  count_podiums: number;
  count_top10: number;
  total_segments: number;
};

// --- COMPOSANTS DE STYLE ---
const RankIcon = ({ rank }: { rank: number }) => {
    if (rank === 1) return <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.6)] animate-pulse"><Crown size={18} className="text-black" fill="currentColor"/></div>;
    if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center shadow-[0_0_10px_rgba(203,213,225,0.4)]"><Medal size={18} className="text-slate-800" /></div>;
    if (rank === 3) return <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.4)]"><Medal size={18} className="text-white" /></div>;
    return <div className="w-8 h-8 flex items-center justify-center text-gray-500 font-mono font-bold text-lg">#{rank}</div>;
};

export default function HallOfLegendsPage() {
  const [legends, setLegends] = useState<Legend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLegends = async () => {
        try {
            const res = await fetch('/api/legend');
            if (res.ok) setLegends(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    fetchLegends();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#d04fd7] selection:text-white pb-20">
      
      
      <div className="max-w-4xl mx-auto px-4 pt-24">
        
        {/* HEADER HERO */}
        <div className="text-center mb-12 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />
            <h1 className="text-5xl font-black mb-2 tracking-tight uppercase flex items-center justify-center gap-3">
                <Shield size={48} className="text-[#d04fd7]" />
                Hall des <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d04fd7] to-purple-400">Légendes</span>
            </h1>
            <p className="text-gray-400 text-lg">Le classement des chasseurs de segments.</p>
        </div>

        {/* LISTE DES LÉGENDES */}
        <div className="flex flex-col gap-3">
            {loading ? (
                <div className="text-center py-20 text-gray-500 animate-pulse">Chargement du panthéon...</div>
            ) : legends.map((legend, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                
                return (
                    <div 
                        key={legend.user_id}
                        className={`
                            relative group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300
                            ${isTop3 
                                ? 'bg-[#0E0E12] border-white/10 hover:border-white/20 hover:shadow-2xl hover:scale-[1.01]' 
                                : 'bg-transparent border-transparent hover:bg-white/[0.03]'
                            }
                        `}
                    >
                        {/* EFFET DE FOND POUR LE TOP 1 */}
                        {rank === 1 && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent rounded-2xl" />}

                        {/* PARTIE GAUCHE : RANG + USER */}
                        <div className="flex items-center gap-6 relative z-10">
                            <RankIcon rank={rank} />
                            
                            <div className="flex items-center gap-4">
                                {/* AVATAR */}
                                <div className={`w-12 h-12 rounded-full border-2 overflow-hidden bg-gray-800 ${rank === 1 ? 'border-yellow-500' : 'border-white/10'}`}>
                                    {legend.image ? (
                                        <img src={legend.image} alt={legend.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-gray-500" /></div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col">
                                    <span className={`text-lg font-bold ${rank === 1 ? 'text-yellow-100' : 'text-white'}`}>
                                        {legend.name}
                                    </span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Activity size={10} /> {legend.total_segments} segments parcourus
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* PARTIE DROITE : STATS (BADGES) */}
                        <div className="flex items-center gap-2 md:gap-6 relative z-10">
                            
                            {/* STAT : TOP 10 */}
                            <div className="flex flex-col items-center w-16 opacity-60 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Top 10</span>
                                <div className="flex items-center gap-1.5 text-blue-400 font-mono font-bold text-lg">
                                    <Trophy size={16} /> {legend.count_top10}
                                </div>
                            </div>

                            {/* STAT : KOM (Le plus important) */}
                            <div className="flex flex-col items-center w-20">
                                <span className="text-[10px] text-[#d04fd7] font-bold uppercase tracking-widest mb-1">KOMs</span>
                                <div className={`flex items-center gap-1.5 font-black text-2xl ${legend.count_koms > 0 ? 'text-[#d04fd7] drop-shadow-[0_0_10px_rgba(208,79,215,0.5)]' : 'text-gray-700'}`}>
                                    <Crown size={20} fill={legend.count_koms > 0 ? "currentColor" : "none"} /> 
                                    {legend.count_koms}
                                </div>
                            </div>
                        </div>

                    </div>
                );
            })}
        </div>

        {/* FOOTER MOTIVATION */}
        {!loading && legends.length > 0 && (
             <div className="mt-12 text-center">
                <p className="text-gray-500 text-sm">
                    Le classement est mis à jour en temps réel à chaque nouvelle activité scannée.
                    <br />
                    <span className="text-[#d04fd7]">Allez rouler pour détrôner le Roi !</span> 🚴‍♂️💨
                </p>
             </div>
        )}

      </div>
    </div>
  );
}