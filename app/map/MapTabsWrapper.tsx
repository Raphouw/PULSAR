'use client';

import React, { useState } from 'react';
import { Play, Map as MapIcon } from 'lucide-react';
import GlobalMapClient from './GlobalMapClient';
import ReplayMapClient from './ReplayMapClient'; 

export default function MapTabsWrapper({ activities, initialBlacklist, userId }: any) {
    const [activeMode, setActiveMode] = useState<'explore' | 'replay'>('explore');

    return (
        <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
            {/* BOUTONS DE NAVIGATION FLOTTANTS EN HAUT À GAUCHE (Segmented Control) */}
            <div className="absolute top-4 md:top-6 left-4 md:left-6 z-[2000] flex w-[calc(100%-2rem)] md:w-[280px] bg-[#121217]/80 backdrop-blur-2xl p-1 rounded-xl border border-white/10 shadow-2xl">
                <button 
                    type="button"
                    onClick={() => setActiveMode('explore')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        activeMode === 'explore' 
                        ? 'bg-[#d04fd7] text-white shadow-[0_0_15px_rgba(208,79,215,0.4)]' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <MapIcon size={12} /> Heatmap
                </button>
                <button 
                    type="button"
                    onClick={() => setActiveMode('replay')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        activeMode === 'replay' 
                        ? 'bg-[#00f3ff] text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Play size={12} /> Time-Lapse
                </button>
            </div>

            {/* CHARGEMENT CONDITIONNEL DU MOTEUR */}
            {activeMode === 'explore' ? (
                <GlobalMapClient activities={activities} initialBlacklist={initialBlacklist} userId={userId} />
            ) : (
                <ReplayMapClient activities={activities} />
            )}
        </div>
    );
}