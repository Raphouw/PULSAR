"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { 
  Zap, CheckCircle, Loader2, Database, ShieldAlert, 
  Settings2, Clock, List, Pause, Play, Trash2, Terminal, RefreshCcw
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient"; 

const FONT_FAMILY = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

export default function CommandCenter() {
  const { data: session, status: authStatus } = useSession();
  const [jobs, setJobs] = useState<any[]>([]);
  
  // On déduit si ça bosse juste en regardant si un job est "processing" dans la liste
  const isProcessing = jobs.some(j => j.status === 'processing');

  const ADMIN_ID = "1"; 

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.error("Erreur fetch jobs:", error);
    if (data) setJobs(data);
  }, []);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") redirect("/auth/signin");
    if (session?.user && String((session.user as any).id) !== ADMIN_ID) redirect("/dashboard");

    // 1. Fetch initial
    fetchJobs();
    
    // 2. Abonnement Realtime (Le plan A : Rapide)
    const channel = supabase
      .channel('admin_jobs_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_jobs' }, (payload) => {
        console.log("⚡ Realtime update reçu:", payload); // Pour débugger
        fetchJobs();
      })
      .subscribe();

    // 3. Polling de secours (Le plan B : Robuste)
    // Toutes les 2 secondes, on rafraichit doucement pour être sûr que l'UI ne fige pas
    const interval = setInterval(() => {
        fetchJobs();
    }, 2000);

    return () => { 
        supabase.removeChannel(channel); 
        clearInterval(interval); // Nettoyage
    };
  }, [session, authStatus, fetchJobs]);

  // ❌ J'AI SUPPRIMÉ TOUT LE BLOC "useEffect -> runWorker" ICI. 
  // C'est AdminWorker.tsx qui fait le sale boulot en background.

  // --- ACTION : RESCAN GLOBAL (Juste l'insertion en BDD) ---
  const handleGlobalRescan = async () => {
    if (!confirm("Voulez-vous lancer un scan de TOUTES les activités sur TOUS les segments ?")) return;
    
    const { data: activities } = await supabase.from('activities').select('id');
    if (!activities) return;

    await supabase.from('admin_jobs').insert({
      type: 'global_sync',
      status: 'pending',
      total: activities.length,
      progress: 0,
      payload: { 
        segmentId: null, 
        segmentName: "Synchronisation Globale",
        queue: activities.map(a => a.id)
      }
    });
    fetchJobs();
  };

  const updateJobStatus = async (id: string, newStatus: string) => {
    await supabase.from('admin_jobs').update({ status: newStatus }).eq('id', id);
    fetchJobs();
  };

  const deleteJob = async (id: string) => {
    if (confirm("Supprimer cette tâche ?")) {
      await supabase.from('admin_jobs').delete().eq('id', id);
      fetchJobs();
    }
  };

  if (authStatus === "loading") return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#d04fd7]" /></div>;

  return (
    <div style={{ fontFamily: FONT_FAMILY }} className="p-8 bg-[#050505] min-h-screen text-gray-200">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-[#d04fd7] rounded-2xl shadow-[0_0_30px_rgba(208,79,215,0.2)]">
              <Settings2 className="text-black" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase leading-none tracking-tighter">Command Center</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                <Terminal size={12} className="text-[#d04fd7]" /> Operator: ID {ADMIN_ID}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleGlobalRescan}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl border border-white/10 transition-all text-xs font-black uppercase tracking-widest"
          >
            <RefreshCcw size={16} className="text-[#00f3ff]" /> Rescan Global
          </button>
        </div>

        {/* LOGS & JOBS LIST */}
        <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
            <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em]">
              <List size={20} className="text-[#d04fd7]" /> Registre des missions
            </div>
            <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/5">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse shadow-[0_0_10px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">
                Moteur : {isProcessing ? 'Actif (Background)' : 'En attente'}
              </span>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {jobs.length === 0 ? (
              <div className="p-32 text-center opacity-30 flex flex-col items-center">
                  <Database size={48} className="mb-4" />
                  <p className="font-black uppercase tracking-widest text-xs">Aucune mission enregistrée</p>
              </div>
            ) : jobs.map((job) => (
              <div key={job.id} className="p-8 flex items-center justify-between hover:bg-white/[0.01] transition-all group">
                <div className="flex items-center gap-8 flex-1">
                  <div className={`p-4 rounded-2xl border ${
                    // 🔥 On force le vert si le status est completed OU si on a atteint 100%
                    job.status === 'completed' || job.progress >= job.total ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' :
                    job.status === 'failed' ? 'bg-red-500/5 text-red-500 border-red-500/20' :
                    job.status === 'processing' ? 'bg-[#d04fd7]/5 text-[#d04fd7] border-[#d04fd7]/20' : 
                    'bg-gray-500/5 text-gray-500 border-white/5'
                  }`}>
                    {/* 🔥 Pareil pour l'icône : Check si fini OU 100% */}
                    {job.status === 'completed' || job.progress >= job.total ? <CheckCircle size={22} /> : 
                    job.status === 'processing' ? <Loader2 size={22} className="animate-spin" /> : <Clock size={22} />}
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                      <span className="text-base font-black italic uppercase text-white">{job.payload.segmentName}</span>
                      <span className="text-[9px] font-black bg-white/5 px-2 py-1 rounded text-gray-500 uppercase">{job.type}</span>
                    </div>
                    {/* BARRE DE PROGRESSION */}
                    <div className="flex items-center gap-6">
                      <div className="flex-1 h-2 bg-white/5 rounded-full max-w-md overflow-hidden border border-white/5">
                        <div 
                          className={`h-full transition-all duration-300 ${job.status === 'completed' ? 'bg-emerald-500' : 'bg-[#d04fd7]'}`}
                          style={{ width: `${(job.progress / job.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">{job.progress} / {job.total}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Boutons de contrôle */}
                  {job.status === 'processing' && (
                      <button onClick={() => updateJobStatus(job.id, 'paused')} className="p-3 hover:bg-white/5 rounded-xl text-gray-400" title="Pause"><Pause size={18} /></button>
                  )}
                  {job.status === 'paused' || job.status === 'pending' ? (
                      <button onClick={() => updateJobStatus(job.id, 'processing')} className="p-3 hover:bg-emerald-500/10 rounded-xl text-emerald-500" title="Reprendre"><Play size={18} fill="currentColor" /></button>
                  ) : null}
                  <button onClick={() => deleteJob(job.id)} className="p-3 hover:bg-red-500/10 rounded-xl text-red-500" title="Supprimer"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#d04fd7]/5 border border-[#d04fd7]/10 rounded-3xl p-6 flex gap-5 items-center">
            <ShieldAlert size={24} className="text-[#d04fd7]" />
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Le worker background traite les tâches. Le Realtime met à jour cette interface en direct.
            </div>
        </div>
      </div>
    </div>
  );
}