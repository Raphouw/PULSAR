'use client';

import { useEffect, useState } from 'react';
import { refreshHallOfRecords, getTotalActivitiesCount } from '@/app/actions/refreshHallOfRecords';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Timer, ServerCrash } from 'lucide-react';

export default function AutoScanner({ userId }: { userId: string | number }) {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'scanning' | 'complete' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);
    const [eta, setEta] = useState<string>('--:--');

    // Formatage temps (Minutes:Secondes)
    const formatTime = (seconds: number) => {
        if (!isFinite(seconds) || seconds < 0) return "--:--";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    useEffect(() => {
        let mounted = true;

        const runSmartScan = async () => {
            if (!userId) return;

            try {
                // 1. Init
                const totalCount = await getTotalActivitiesCount(userId);
                if (!mounted) return;
                setTotal(totalCount);

                let keepGoing = true;
                let cursor: string | null = null;
                let processed = 0;
                let isFirstLoop = true;
                const startT = Date.now();

                // 2. Boucle de Scan
                while (keepGoing && mounted) {
                    const res = await refreshHallOfRecords(userId, cursor);

                    if (!mounted) break;

                    if (!res.success) {
                        console.error("Erreur Scan:", res.message);
                        setStatus('error');
                        keepGoing = false;
                        break;
                    }

                    const itemsInBatch = res.count || 0;

                    // Si on trouve des données, on active l'affichage
                    if (itemsInBatch > 0 || isFirstLoop) {
                        if (status === 'idle' && itemsInBatch > 0) {
                            setStatus('scanning');
                        }

                        processed += itemsInBatch;
                        
                        // Progression visuelle (plafonnée au total)
                        setProgress(current => Math.min(current + itemsInBatch, totalCount));

                        // --- CALCUL ETA ROBUSTE ---
                        const now = Date.now();
                        const elapsed = (now - startT) / 1000;
                        const speed = processed / elapsed; // activités/sec
                        const remaining = Math.max(0, totalCount - processed);
                        
                        if (speed > 0) {
                            // On ajoute 30% de marge de sécurité (x1.3) pour ne pas décevoir l'utilisateur
                            const estimatedSeconds = (remaining / speed) * 1.3;
                            setEta(formatTime(estimatedSeconds));
                        }

                        // Refresh UI immédiat au premier lot
                        if (isFirstLoop && itemsInBatch > 0) {
                            router.refresh(); 
                        }
                    }

                    isFirstLoop = false;

                    // Fin de boucle ?
                    if (res.finished || !res.nextCursor) {
                        keepGoing = false;
                    } else {
                        cursor = res.nextCursor;
                        await new Promise(r => setTimeout(r, 50)); // Petite pause
                    }
                }

                // 3. Finalisation
                if (mounted && processed > 0 && status !== 'error') {
                    setProgress(totalCount);
                    setStatus('complete');
                    router.refresh();
                    
                    // Disparaît doucement après 5s
                    setTimeout(() => {
                        if (mounted) setStatus('idle');
                    }, 5000);
                }

            } catch (e) {
                console.error("Crash AutoScanner:", e);
                if (mounted) setStatus('error');
            }
        };

        runSmartScan();

        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // Si inactif, on ne rend rien (pas d'espace vide)
    if (status === 'idle') return null;

    const percent = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;

    return (
        <div className="w-full max-w-5xl mx-auto mb-8 animate-in slide-in-from-top-4 fade-in duration-500">
            <div className="bg-[#0f0f13] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
                
                {/* Background Grid/Noise (Optionnel pour le style) */}
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center justify-between p-4 gap-4 relative z-10">
                    
                    {/* Partie Gauche : Infos */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`p-2.5 rounded-lg shrink-0 ${
                            status === 'complete' ? 'bg-green-500/10 text-green-400' : 
                            status === 'error' ? 'bg-red-500/10 text-red-400' :
                            'bg-[#d04fd7]/10 text-[#d04fd7]'
                        }`}>
                            {status === 'scanning' && <Loader2 size={20} className="animate-spin" />}
                            {status === 'complete' && <CheckCircle2 size={20} />}
                            {status === 'error' && <ServerCrash size={20} />}
                        </div>
                        
                        <div className="flex flex-col min-w-[140px]">
                            <span className="text-sm font-bold text-white tracking-wide">
                                {status === 'scanning' ? 'SYNCHRONISATION...' : 
                                 status === 'complete' ? 'MISES À JOUR TERMINÉES' : 
                                 'ERREUR DE SYNC'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono uppercase">
                                {status === 'scanning' ? `Calcul Physique & Moteur` : 
                                 status === 'complete' ? 'Base de données à jour' : 
                                 'Veuillez réessayer'}
                            </span>
                        </div>
                    </div>

                    {/* Partie Centrale : Barre de Progression */}
                    <div className="w-full flex flex-col gap-1.5 px-2">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                            <span>{progress} / {total} Activités</span>
                            <span>{percent}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-800/50 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-300 ease-out rounded-full ${
                                    status === 'complete' ? 'bg-green-500' : 
                                    status === 'error' ? 'bg-red-500' :
                                    'bg-gradient-to-r from-[#d04fd7] to-[#00f3ff]'
                                }`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>

                    {/* Partie Droite : ETA */}
                    {status === 'scanning' && (
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 shrink-0">
                            <Timer size={14} className="text-gray-400" />
                            <div className="flex flex-col items-end leading-none">
                                <span className="text-[9px] text-gray-500 font-bold uppercase">Temps Est.</span>
                                <span className="text-xs font-mono font-bold text-white">{eta}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Line Colorée */}
                <div className={`h-[1px] w-full ${
                    status === 'complete' ? 'bg-green-500/50' : 
                    status === 'error' ? 'bg-red-500/50' :
                    'bg-gradient-to-r from-[#d04fd7] via-[#00f3ff] to-[#d04fd7]'
                }`} />
            </div>
        </div>
    );
}