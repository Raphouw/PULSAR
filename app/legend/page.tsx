import React from 'react';
import { getServerSession } from 'next-auth'; 
import { authOptions } from '../../lib/auth'; 
import AutoScanner from './AutoScanner';
import LegendTabs from './LegendTabs';
import { Shield } from 'lucide-react';
import { getHallData } from '@/app/actions/getHallData';
import { getLegendsList } from '@/app/actions/getLegendsList';
import HallOfRecords from '../../components/HallOfRecords';
import HallOfLegends from '../../components/HallOfLegends'; // 👈 IMPORT DU FICHIER QUE TU VIENS DE CRÉER

export const dynamic = 'force-dynamic';

export default async function LegendPage() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userWeight = session?.user ? (session.user as any).weight || 75 : 75;

    // Chargement parallèle des données
    const [records, legends] = await Promise.all([
        userId ? getHallData(userId) : Promise.resolve([]),
        getLegendsList() // Appel de la Server Action pour le classement
    ]);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 pt-24">
            {userId && <AutoScanner userId={userId} />}
            <div className="max-w-5xl mx-auto px-4">
                
                <div className="text-center mb-10 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />
                    <h1 className="text-5xl font-black mb-2 tracking-tight uppercase flex items-center justify-center gap-3">
                        <Shield size={48} className="text-[#d04fd7]" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white">PALMARÈS</span>
                    </h1>
                    <p className="text-gray-400 text-lg">L'histoire s'écrit à chaque coup de pédale.</p>
                </div>

                <LegendTabs 
                    legendsComponent={<HallOfLegends legends={legends} />} 
                    recordsComponent={
                        userId ? (
                        <HallOfRecords rawRecords={records} userWeight={userWeight} />                        
                    ) : (
                            <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
                                <p>Connecte-toi pour voir tes records personnels.</p>
                            </div>
                        )
                    }
                />
            </div>
        </div>
    );
}