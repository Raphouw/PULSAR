'use client';

import React, { useState } from 'react';
import { Play, Map as MapIcon } from 'lucide-react';
import GlobalMapClient from './GlobalMapClient';
import ReplayMapClient from './ReplayMapClient'; 

export default function MapTabsWrapper({ activities, initialBlacklist, userId }: any) {
    const [activeMode, setActiveMode] = useState<'explore' | 'replay'>('explore');

    return (
        <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
            {/* BOUTONS DE NAVIGATION FLOTTANTS EN HAUT AU CENTRE */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] flex bg-[#121217]/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
                <button 
                    type="button" // <-- LE CORRECTIF EST ICI ! Empêche le rechargement de page
                    onClick={() => setActiveMode('explore')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        activeMode === 'explore' 
                        ? 'bg-[#d04fd7] text-white shadow-[0_0_15px_rgba(208,79,215,0.4)]' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <MapIcon size={14} /> Heatmap
                </button>
                <button 
                    type="button" // <-- LE CORRECTIF EST ICI !
                    onClick={() => setActiveMode('replay')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        activeMode === 'replay' 
                        ? 'bg-[#00f3ff] text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Play size={14} /> Time-Lapse
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