import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth'; 
import { authOptions } from '../../lib/auth'; 
import AutoScanner from './AutoScanner';
import LegendTabs from './LegendTabs';
import { Shield, Loader2 } from 'lucide-react'; 
import { getHallData } from '@/app/actions/getHallData';
import { getLegendsList } from '@/app/actions/getLegendsList';
import HallOfRecords from '../../components/HallOfRecords';
import HallOfLegends from '../../components/HallOfLegends';
import PowerRecordsTab from '../../components/PowerRecordsTab';

export const dynamic = 'force-dynamic';

// ----------------------------------------------------------------------
// Composants Asynchrones d'Encapsulation (Résolvent les promesses)
// ----------------------------------------------------------------------

async function AsyncHallOfLegends({ legendsPromise }: { legendsPromise: Promise<any> }) {
    const legends = await legendsPromise;
    return <HallOfLegends legends={legends} />;
}

async function AsyncHallOfRecords({ recordsPromise, userWeight }: { recordsPromise: Promise<any>, userWeight: number }) {
    const records = await recordsPromise;
    return <HallOfRecords rawRecords={records} userWeight={userWeight} />;
}

async function AsyncPowerRecords({ recordsPromise, userWeight }: { recordsPromise: Promise<any>, userWeight: number }) {
    const records = await recordsPromise;
    return <PowerRecordsTab rawRecords={records} userWeight={userWeight} />;
}

// État de chargement élégant pour le Suspense
const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white/5 rounded-2xl border border-white/10">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-500" />
        <p>Récupération des performances historiques...</p>
    </div>
);

// ----------------------------------------------------------------------
// Page Principale
// ----------------------------------------------------------------------

export default async function LegendPage() {
    // 1. Appel indépendant de la session pour ne pas bloquer les requêtes de données
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userWeight = session?.user ? (session.user as any).weight || 75 : 75;

    // 2. Déclenchement simultané des requêtes SANS await bloquant.
    // Les promesses sont passées directement aux sous-composants.
    const legendsPromise = getLegendsList();
    const recordsPromise = userId ? getHallData(userId) : null;

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
                    legendsComponent={
                        <Suspense fallback={<LoadingState />}>
                            <AsyncHallOfLegends legendsPromise={legendsPromise} />
                        </Suspense>
                    } 
                    recordsComponent={
                        userId && recordsPromise ? (
                            <Suspense fallback={<LoadingState />}>
                                <AsyncHallOfRecords recordsPromise={recordsPromise} userWeight={userWeight} />
                            </Suspense>
                        ) : (
                            <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
                                <p>Connecte-toi pour voir tes records personnels.</p>
                            </div>
                        )
                    }
                    powerComponent={
                        userId && recordsPromise ? (
                            <Suspense fallback={<LoadingState />}>
                                <AsyncPowerRecords recordsPromise={recordsPromise} userWeight={userWeight} />
                            </Suspense>
                        ) : (
                            <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
                                <p>Connecte-toi pour voir tes records de puissance.</p>
                            </div>
                        )
                    }
                />
            </div>
        </div>
    );
}