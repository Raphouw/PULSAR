"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { 
  Loader2, Database, ShieldAlert, Settings2, Clock, List, 
  Trash2, Terminal, RefreshCcw, CheckCircle, ShieldCheck, 
  XCircle, Map as MapIcon, Eye, Scissors, Calculator, Mountain
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient"; 
import { getDistanceFromLatLonInMeters } from "../../lib/mapUtils"; 

// --- HELPERS DE CALCUL ---
const calculatePolylineStats = (points: [number, number][]) => {
    if (!points || points.length < 2) return { dist: 0 };
    let dist = 0;
    for (let i = 0; i < points.length - 1; i++) {
        dist += getDistanceFromLatLonInMeters(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
    }
    return { dist };
};

// --- COMPOSANT TAB: MONITOR ---
const SystemMonitorTab = ({ jobs, fetchJobs, isProcessing, handleGlobalRescan, handleClimbScan, deleteJob }: any) => {
    return (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-xl p-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="font-bold text-gray-300 flex items-center gap-2"><List className="text-[#d04fd7]"/> File d'attente</h3>
                
                {/* ZONE DES BOUTONS D'ACTION */}
                <div className="flex gap-3">
                    {/* BOUTON 1 : Rescan Segments Existants (Ton ancien bouton) */}
                    <button 
                        onClick={handleGlobalRescan} 
                        className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-xs font-bold uppercase border border-white/10 flex items-center gap-2 text-gray-300 hover:text-white transition-all"
                        title="Synchroniser les segments existants sur toutes les activités"
                    >
                        <RefreshCcw size={14} className="text-[#00f3ff]"/> Sync Segments
                    </button>

                    {/* BOUTON 2 : Chasseur de Cols (Nouveau) */}
                    <button 
                        onClick={handleClimbScan} 
                        className="bg-[#d04fd7]/10 hover:bg-[#d04fd7]/20 px-4 py-2 rounded-lg text-xs font-bold uppercase border border-[#d04fd7]/30 flex items-center gap-2 text-[#d04fd7] transition-all"
                        title="Détecter de nouveaux cols sur tout l'historique"
                    >
                        <Mountain size={14} /> Scan Cols Historique
                    </button>
                </div>
             </div>

             <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {jobs.length === 0 ? (
                    <div className="p-10 text-center opacity-30 text-xs uppercase font-bold">Aucune tâche en cours</div>
                ) : jobs.map((job: any) => (
                    <div key={job.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            {job.status === 'processing' ? <Loader2 size={16} className="animate-spin text-[#d04fd7]"/> : 
                             job.status === 'completed' ? <CheckCircle size={16} className="text-emerald-500"/> : 
                             <Clock size={16} className="text-gray-500"/>}
                            
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-200">{job.payload?.segmentName || "Tâche Système"}</span>
                                <span className="text-[10px] text-gray-500 uppercase">{job.type}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             {/* Petite barre de progression */}
                             <div className="w-24 h-1.5 bg-black rounded-full overflow-hidden hidden md:block">
                                <div className="h-full bg-[#d04fd7]" style={{ width: `${Math.min((job.progress / Math.max(job.total, 1)) * 100, 100)}%` }}></div>
                             </div>
                             <span className="text-[10px] font-mono text-gray-400 w-16 text-right">{job.progress}/{job.total}</span>
                             <button onClick={() => deleteJob(job.id)} className="p-1.5 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );
};

// --- COMPOSANT TAB: VALIDATION (Inchangé sauf imports) ---
const ValidationTab = () => {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [newName, setNewName] = useState("");
    const [cutStart, setCutStart] = useState(0); 
    const [cutEnd, setCutEnd] = useState(0);

    useEffect(() => {
        const fetchCandidates = async () => {
            const { data } = await supabase.from('segments').select('*').eq('is_official', false).not('tags', 'is', null).order('created_at', { ascending: false });
            if(data) setCandidates(data.filter((s:any) => s.tags?.status === 'pending_review'));
        };
        fetchCandidates();
    }, []);

    useEffect(() => { setCutStart(0); setCutEnd(0); }, [selected?.id]);

    const croppedPolyline = useMemo(() => {
        if (!selected || !selected.polyline) return [];
        const points = selected.polyline as [number, number][];
        const total = points.length;
        const startIndex = Math.floor(total * (cutStart / 100));
        const endIndex = total - Math.floor(total * (cutEnd / 100));
        if (startIndex >= endIndex) return [points[0], points[points.length-1]];
        return points.slice(startIndex, endIndex);
    }, [selected, cutStart, cutEnd]);

    const liveStats = useMemo(() => {
        if (!selected) return { dist: 0, grade: 0, elev: 0 };
        const { dist } = calculatePolylineStats(croppedPolyline);
        const ratio = dist / (selected.distance_m || 1); 
        const newElev = Math.round((selected.elevation_gain_m || 0) * ratio);
        const newGrade = dist > 0 ? (newElev / dist) * 100 : 0;
        return { dist, elev: newElev, grade: newGrade };
    }, [croppedPolyline, selected]);

    const handleDecision = async (approved: boolean) => {
        if(!selected) return;
        if (approved) {
             const finalPoints = croppedPolyline;
             const startPt = finalPoints[0];
             const endPt = finalPoints[finalPoints.length - 1];
             await (supabase.from('segments') as any).update({
                name: newName, is_official: true, polyline: finalPoints,
                start_lat: startPt[0], start_lon: startPt[1], end_lat: endPt[0], end_lon: endPt[1],
                distance_m: liveStats.dist, elevation_gain_m: liveStats.elev, average_grade: parseFloat(liveStats.grade.toFixed(1)),
                tags: { ...selected.tags, status: 'approved', validator: 'ADMIN', edit: 'cropped' }
            }).eq('id', selected.id);
        } else {
            await supabase.from('segments').delete().eq('id', selected.id);
        }
        setCandidates(candidates.filter(c => c.id !== selected.id));
        setSelected(null);
        setNewName("");
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[700px]">
            <div className="w-full lg:w-1/4 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5"><h3 className="font-bold text-xs text-gray-400 uppercase">Candidats ({candidates.length})</h3></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {candidates.map(seg => (
                        <div key={seg.id} onClick={() => { setSelected(seg); setNewName(seg.name.replace("[AUTO] ", "")); }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${selected?.id === seg.id ? 'bg-[#d04fd7]/10 border-[#d04fd7] text-white' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-500'}`}>
                            <div className="font-bold text-xs truncate">{seg.name}</div>
                            <div className="text-[10px] opacity-60">{(seg.distance_m/1000).toFixed(1)}km • {seg.average_grade}%</div>
                        </div>
                    ))}
                    {candidates.length === 0 && <div className="h-full flex items-center justify-center text-gray-600 text-[10px] uppercase">Rien à signaler</div>}
                </div>
            </div>
            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col relative overflow-hidden">
                {selected ? (
                    <>
                        <div className="flex-1 bg-[#050505] relative flex items-center justify-center group border-b border-white/10">
                             <div className="text-center opacity-50 group-hover:opacity-100 transition-opacity">
                                <MapIcon size={48} className="mx-auto text-[#d04fd7] mb-2"/>
                                <p className="text-xs font-mono">MAP PREVIEW</p>
                                <p className="text-[10px] text-gray-500 mt-2">Points: {croppedPolyline.length}</p>
                             </div>
                        </div>
                        <div className="p-6 bg-[#111] space-y-6">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500"><span>Cut Start ({cutStart}%)</span> <Scissors size={12}/></div>
                                    <input type="range" min="0" max="45" step="1" value={cutStart} onChange={(e) => setCutStart(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#d04fd7]"/>
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500"><span>Cut End ({cutEnd}%)</span> <Scissors size={12}/></div>
                                    <input type="range" min="0" max="45" step="1" value={cutEnd} onChange={(e) => setCutEnd(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#d04fd7]"/>
                                </div>
                                <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col justify-center space-y-2">
                                    <div className="flex items-center gap-2 text-[#00f3ff] text-xs font-bold uppercase mb-1"><Calculator size={14}/> Stats Projetées</div>
                                    <div className="flex justify-between text-sm font-mono text-gray-300"><span>Dist:</span> <span className="text-white">{(liveStats.dist/1000).toFixed(2)} km</span></div>
                                    <div className="flex justify-between text-sm font-mono text-gray-300"><span>D+:</span> <span className="text-white">{liveStats.elev} m</span></div>
                                    <div className="flex justify-between text-sm font-mono text-gray-300"><span>Pente:</span> <span className="text-[#d04fd7]">{liveStats.grade.toFixed(1)} %</span></div>
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-sm font-bold text-white focus:border-[#d04fd7] outline-none" placeholder="Nom officiel du segment..." />
                                <div className="flex gap-4">
                                    <button onClick={() => handleDecision(false)} className="flex-1 py-3 rounded-lg bg-red-900/20 text-red-500 font-bold uppercase text-xs hover:bg-red-900/40">Rejeter</button>
                                    <button onClick={() => handleDecision(true)} className="flex-1 py-3 rounded-lg bg-[#d04fd7] text-black font-bold uppercase text-xs hover:bg-white transition-all">Valider</button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700">
                        <Eye size={48} className="mb-4 opacity-20"/>
                        <span className="uppercase tracking-widest text-xs">Sélectionner un candidat</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- PAGE PRINCIPALE ---
export default function CommandCenter() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'monitor' | 'validation'>('monitor');
  const [jobs, setJobs] = useState<any[]>([]);
  const ADMIN_ID = "1"; 

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase.from('admin_jobs').select('*').order('created_at', { ascending: false });
    if (data) setJobs(data as any[]);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || String((session?.user as any)?.id) !== ADMIN_ID) redirect("/dashboard");
    fetchJobs();
    const i = setInterval(fetchJobs, 3000);
    return () => clearInterval(i);
  }, [session, status, fetchJobs]);

  // ACTION 1: RESCAN GLOBAL (Segments existants) - Type: 'global_sync'
  const handleGlobalRescan = async () => {
    if (!confirm("SYNC SEGMENTS : Scanner toutes les activités sur les segments OFFICIELS existants ?")) return;
    
    const { data: acts } = await supabase.from('activities').select('id');
    if (!acts) return;

    // 🔥 FIX: Cast en any pour insert
    await (supabase.from('admin_jobs') as any).insert({
      type: 'global_sync', // IMPORTANT: C'est l'ancien type
      status: 'pending',
      total: acts.length,
      progress: 0,
      payload: { 
        segmentId: null, 
        segmentName: "Synchronisation Globale Segments",
        queue: acts.map((a:any) => a.id)
      }
    });
    fetchJobs();
  };

  // ACTION 2: SCAN COLS (Détection Auto) - Type: 'global_detect'
  const handleClimbScan = async () => {
    if(!confirm("CHASSEUR DE COLS : Détecter de NOUVEAUX cols sur tout l'historique ?")) return;
    
    const { data: acts } = await supabase.from('activities').select('id');
    if(!acts) return;
    
    await (supabase.from('admin_jobs') as any).insert({
      type: 'global_detect', // IMPORTANT: C'est le nouveau type pour le worker
      status: 'pending',
      total: acts.length,
      progress: 0,
      payload: { 
        segmentName: "Détection Historique Cols", 
        queue: acts.map((a:any) => a.id) 
      }
    });
    fetchJobs();
  };
  
  const deleteJob = async (id: string) => { await (supabase.from('admin_jobs') as any).delete().eq('id', id); fetchJobs(); };

  if (status === "loading") return <div className="h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-[#d04fd7]"/></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <h1 className="text-2xl font-bold uppercase italic flex items-center gap-3">
                <Terminal className="text-[#d04fd7]"/> Command Center
            </h1>
            <div className="bg-[#111] p-1 rounded-lg border border-white/10 flex gap-1">
                <button onClick={() => setActiveTab('monitor')} className={`px-4 py-2 rounded text-xs font-bold uppercase ${activeTab==='monitor' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>Système</button>
                <button onClick={() => setActiveTab('validation')} className={`px-4 py-2 rounded text-xs font-bold uppercase ${activeTab==='validation' ? 'bg-[#d04fd7] text-black' : 'text-gray-500'}`}>Validations</button>
            </div>
        </div>
        {activeTab === 'monitor' ? (
            <SystemMonitorTab 
                jobs={jobs} 
                fetchJobs={fetchJobs} 
                handleGlobalRescan={handleGlobalRescan} 
                handleClimbScan={handleClimbScan}
                deleteJob={deleteJob}
            />
        ) : (
            <ValidationTab />
        )}
      </div>
    </div>
  );
}