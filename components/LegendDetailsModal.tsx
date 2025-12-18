'use client';

import React from 'react';
import { X, Crown, Trophy, MapPin, Calendar, Zap, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LegendDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    type: 'KOM' | 'TOP10';
    items: any[];
    isLoading: boolean;
}

export default function LegendDetailsModal({ isOpen, onClose, title, type, items, isLoading }: LegendDetailsModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const isKom = type === 'KOM';
    const accentColor = isKom ? '#d04fd7' : '#00f3ff';
    const Icon = isKom ? Crown : Trophy;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSegmentClick = (segmentId: any) => {
        // Log de debug pour voir ce qui arrive au clic
        console.log("Navigation vers segment ID:", segmentId);
        
        if (!segmentId) {
            console.error("Erreur: ID du segment manquant dans l'objet item");
            return;
        }
        
        onClose();
        router.push(`/segments/${segmentId}`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

            <div 
                className="relative bg-[#0f0f13] border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                style={{ borderColor: `${accentColor}30` }}
            >
                {/* Header avec une touche de couleur */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141419]">
                    <div className="flex items-center gap-3">
                        <div 
                            className="p-2.5 rounded-xl border" 
                            style={{ backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` }}
                        >
                            <Icon size={20} style={{ color: accentColor }} fill={isKom ? accentColor : "none"} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-tight">{title}</h2>
                            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: accentColor }}>
                                {isKom ? 'Liste des couronnes' : 'Places d\'honneur'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar-minimal">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Icon size={32} className="animate-pulse" style={{ color: accentColor }} />
                            <span className="text-xs text-gray-500 font-mono">CHARGEMENT...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">Aucun segment trouvé.</div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {items.map((item, idx) => (
                                <button 
                                    key={idx} 
                                    // ⚡ IMPORTANT: On vérifie item.segment_id OU item.id selon ce que ton action renvoie
                                    onClick={() => handleSegmentClick(item.segment_id || item.id)}
                                    className="w-full text-left group flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="text-sm font-bold font-mono w-8 h-8 rounded-lg flex items-center justify-center bg-black/40 border border-white/5"
                                            style={{ color: item.rank === 1 ? '#eab308' : '#666' }}
                                        >
                                            #{item.rank || (idx + 1)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-white">{item.segmentName}</h4>
                                            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 font-mono uppercase">
                                                <span className="flex items-center gap-1"><MapPin size={10} style={{ color: accentColor }} /> {item.segmentCity || 'Local'}</span>
                                                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(item.date).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="hidden sm:flex items-center gap-4 text-right">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-gray-600 font-bold uppercase">Vitesse</span>
                                                <span className="text-sm font-bold text-white">{item.speed.toFixed(1)} <span className="text-[9px] text-gray-500 font-normal">km/h</span></span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-gray-600 font-bold uppercase">Puissance</span>
                                                <span className="text-sm font-bold text-white" style={{ color: item.power > 0 ? accentColor : 'white' }}>
                                                    {Math.round(item.power)}W
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-gray-600 font-bold uppercase">Chrono</span>
                                                <span className="text-sm font-bold text-white font-mono">{formatTime(item.duration)}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar-minimal::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar-minimal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}