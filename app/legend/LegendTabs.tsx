'use client';

import React, { useState } from 'react';
import { LayoutList, History, Zap } from 'lucide-react'; // Ajout de Zap pour le Power

export default function LegendTabs({ 
    legendsComponent, 
    recordsComponent,
    powerComponent // Nouvelle prop
}: { 
    legendsComponent: React.ReactNode, 
    recordsComponent: React.ReactNode,
    powerComponent?: React.ReactNode 
}) {
    const [activeTab, setActiveTab] = useState<'legends' | 'records' | 'power'>('legends');

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-center">
                <div className="bg-[#0a0a0c] border border-white/10 p-1 rounded-xl inline-flex relative gap-1 overflow-x-auto max-w-full scrollbar-hide">
                    
                    <button 
                        onClick={() => setActiveTab('legends')}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'legends' ? 'bg-[#d04fd7] text-black shadow-[0_0_20px_rgba(208,79,215,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <LayoutList size={16} /> CLASSEMENT GÉNÉRAL
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('records')}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'records' ? 'bg-[#00f3ff] text-black shadow-[0_0_20px_rgba(0,243,255,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <History size={16} /> MES RECORDS
                    </button>

                    <button 
                        onClick={() => setActiveTab('power')}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'power' ? 'bg-[#eab308] text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Zap size={16} /> POWER
                    </button>
                </div>
            </div>

            <div className="min-h-[500px]">
                {activeTab === 'legends' && legendsComponent}
                {activeTab === 'records' && recordsComponent}
                {activeTab === 'power' && powerComponent}
            </div>
        </div>
    );
}