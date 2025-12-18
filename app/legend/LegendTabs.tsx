'use client';

import React, { useState } from 'react';
import { LayoutList, History } from 'lucide-react';

export default function LegendTabs({ legendsComponent, recordsComponent }: { legendsComponent: React.ReactNode, recordsComponent: React.ReactNode }) {
    const [activeTab, setActiveTab] = useState<'legends' | 'records'>('legends');

    return (
        <div className="flex flex-col gap-8">
            {/* BARRE D'ONGLETS STYLÉE */}
            <div className="flex justify-center">
                <div className="bg-[#0a0a0c] border border-white/10 p-1 rounded-xl inline-flex relative">
                    {/* Fond animé (Optionnel, simplifié ici) */}
                    
                    <button 
                        onClick={() => setActiveTab('legends')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'legends' ? 'bg-[#d04fd7] text-black shadow-[0_0_20px_rgba(208,79,215,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <LayoutList size={16} /> CLASSEMENT GÉNÉRAL
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('records')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'records' ? 'bg-[#00f3ff] text-black shadow-[0_0_20px_rgba(0,243,255,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <History size={16} /> MES RECORDS
                    </button>
                </div>
            </div>

            {/* CONTENU */}
            <div className="min-h-[500px]">
                {activeTab === 'legends' ? legendsComponent : recordsComponent}
            </div>
        </div>
    );
}