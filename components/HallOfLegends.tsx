'use client';

import React, { useState } from 'react';
import { Crown, Trophy, Medal, User, Shield } from 'lucide-react';
import { getLegendDetails } from '@/app/actions/getLegendDetails';
import LegendDetailsModal from './LegendDetailsModal'; // Import relatif (même dossier)

// --- SOUS-COMPOSANTS ---

const RankBadge = ({ rank }: { rank: number }) => {
    if (rank === 1) return <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.8)]"><Crown size={14} className="text-black fill-black" /></div>;
    if (rank === 2) return <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center shadow-[0_0_10px_rgba(209,213,219,0.5)]"><Medal size={14} className="text-gray-800" /></div>;
    if (rank === 3) return <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.5)]"><Medal size={14} className="text-white" /></div>;
    return <div className="w-6 h-6 flex items-center justify-center text-gray-500 font-mono font-bold text-sm">#{rank}</div>;
};

const PodiumCard = ({ legend, rank, onOpenDetails }: { legend: any, rank: number, onOpenDetails: (u:any, t: 'KOM'|'TOP10') => void }) => {
    const isGold = rank === 1;
    const isSilver = rank === 2;
    const color = isGold ? '#eab308' : isSilver ? '#9ca3af' : '#f97316';
    const height = isGold ? 'h-[280px]' : 'h-[250px]';
    const order = isGold ? 'order-2' : isSilver ? 'order-1' : 'order-3';

    return (
        <div className={`${order} relative group w-full md:w-1/3 flex flex-col items-center justify-end ${height} rounded-3xl bg-[#0f0f13] border border-white/5 p-6 shadow-2xl transition-transform hover:-translate-y-2 duration-300`}>
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" style={{ background: color }}></div>
            
            <div className={`relative rounded-full p-1 mb-4 ${isGold ? 'w-24 h-24 border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'w-20 h-20 border border-white/10'}`}>
                {isGold && <Crown size={24} className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce" fill="currentColor" />}
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                     {legend.image ? <img src={legend.image} alt={legend.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500"><User size={32}/></div>}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0a0a0c] px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 shadow-lg">
                    <RankBadge rank={rank} />
                </div>
            </div>

            <div className="text-center mb-4">
                <h3 className="text-lg font-black text-white truncate max-w-[150px] mx-auto">{legend.name}</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">{legend.total_segments || 0} segments chassés</p>
            </div>

            {/* BADGES CLIQUABLES */}
            <div className="flex items-center gap-3 w-full justify-center bg-white/5 p-2 rounded-xl border border-white/5">
                <button 
                    onClick={() => onOpenDetails(legend, 'KOM')}
                    className="flex flex-col items-center hover:bg-white/10 p-1.5 rounded-lg transition-colors w-1/2"
                >
                     <span className="text-[9px] font-bold text-[#d04fd7] mb-0.5">KOMs</span>
                     <div className="flex items-center gap-1 text-white font-black text-lg">
                        <Crown size={14} className="text-[#d04fd7]" fill="currentColor" />
                        {legend.count_koms || 0}
                     </div>
                </button>
                <div className="w-px h-8 bg-white/10"></div>
                <button 
                    onClick={() => onOpenDetails(legend, 'TOP10')}
                    className="flex flex-col items-center hover:bg-white/10 p-1.5 rounded-lg transition-colors w-1/2"
                >
                     <span className="text-[9px] font-bold text-[#00f3ff] mb-0.5">TOP 10</span>
                     <div className="flex items-center gap-1 text-white font-black text-lg">
                        <Trophy size={14} className="text-[#00f3ff]" />
                        {legend.count_top10 || 0}
                     </div>
                </button>
            </div>
        </div>
    );
};

const LegendRow = ({ legend, rank, onOpenDetails }: { legend: any, rank: number, onOpenDetails: (u:any, t: 'KOM'|'TOP10') => void }) => {
    return (
        <div className="relative group flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-[#0f0f13] hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-4 md:gap-6">
                <div className="font-mono text-gray-500 font-bold w-6 text-center">#{rank}</div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-gray-800">
                        {legend.image ? <img src={legend.image} alt={legend.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500"><User size={16}/></div>}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-[#d04fd7] transition-colors">{legend.name}</span>
                        <span className="text-[10px] text-gray-500">{legend.total_segments || 0} segments</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 md:gap-8">
                <button onClick={() => onOpenDetails(legend, 'TOP10')} className="flex flex-col items-end group/btn hover:opacity-80">
                    <span className="text-[9px] text-gray-600 group-hover/btn:text-[#00f3ff] transition-colors font-bold uppercase tracking-wider">Top 10</span>
                    <span className="text-sm font-bold text-[#00f3ff] flex items-center gap-1">
                        {legend.count_top10 || 0} <Trophy size={12} />
                    </span>
                </button>
                <button onClick={() => onOpenDetails(legend, 'KOM')} className="flex flex-col items-end w-12 group/btn hover:opacity-80">
                    <span className="text-[9px] text-gray-600 group-hover/btn:text-[#d04fd7] transition-colors font-bold uppercase tracking-wider">KOMs</span>
                    <span className="text-lg font-black text-[#d04fd7] flex items-center gap-1">
                        {legend.count_koms || 0} <Crown size={14} fill="currentColor" />
                    </span>
                </button>
            </div>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL ---

export default function HallOfLegends({ legends }: { legends: any[] }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [detailsData, setDetailsData] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedType, setSelectedType] = useState<'KOM' | 'TOP10'>('KOM');

    const handleOpenDetails = async (user: any, type: 'KOM' | 'TOP10') => {
        setSelectedUser(user);
        setSelectedType(type);
        setModalOpen(true);
        setLoadingDetails(true);
        setDetailsData([]);

        // Appel Server Action
        const data = await getLegendDetails(user.user_id, type);
        setDetailsData(data);
        setLoadingDetails(false);
    };

    if (!legends || legends.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-50">
            <Shield size={48} className="text-gray-600" />
            <p className="text-gray-500">Le classement est vide.</p>
        </div>
    );

    const top3 = legends.slice(0, 3);
    const others = legends.slice(3);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            
            {/* PODIUM */}
            {top3.length > 0 && (
                <div className="flex flex-col md:flex-row justify-center items-end gap-4 md:gap-6 mb-4 px-2">
                    {top3[1] && <PodiumCard legend={top3[1]} rank={2} onOpenDetails={handleOpenDetails} />}
                    {top3[0] && <PodiumCard legend={top3[0]} rank={1} onOpenDetails={handleOpenDetails} />}
                    {top3[2] && <PodiumCard legend={top3[2]} rank={3} onOpenDetails={handleOpenDetails} />}
                </div>
            )}

            {/* LISTE */}
            {others.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-4 mb-1">Poursuivants</div>
                    {others.map((legend, index) => (
                        <LegendRow key={legend.user_id} legend={legend} rank={index + 4} onOpenDetails={handleOpenDetails} />
                    ))}
                </div>
            )}

            {/* MODAL */}
            <LegendDetailsModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={selectedUser?.name || 'Légende'}
                type={selectedType}
                items={detailsData}
                isLoading={loadingDetails}
            />
        </div>
    );
}