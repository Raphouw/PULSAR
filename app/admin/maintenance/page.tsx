"use client";

import { useState, useMemo } from "react";
import { Zap, Play, CheckCircle, Loader2, Database, ShieldAlert, ListRestart, Trophy } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient"; 

export default function MaintenancePage() {
  const [status, setStatus] = useState<"idle" | "running" | "finished">("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0, matches: 0, skipped: 0 });
  const [isForceScan, setIsForceScan] = useState(false);

  const startGlobalScan = async () => {
    console.log(">>> [MAINTENANCE] Initialisation du protocole de scan...");
    setStatus("running");
    
    // 1. RÉCUPÉRATION PAGINÉE DE TOUTES LES ACTIVITÉS
    let allActivities: any[] = [];
    let from = 0;
    const PAGE_SIZE = 1000;

    try {
      while (true) {
        console.log(`>>> [FETCH] Récupération du lot ${from / PAGE_SIZE + 1}...`);
        const { data, error } = await supabase
          .from('activities')
          .select('id')
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allActivities = [...allActivities, ...data];
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      // 2. RÉCUPÉRATION DES ACTIVITÉS DÉJÀ SCANNÉES (Sauf si Force Scan)
      let activitiesToScan = allActivities;
      let skippedCount = 0;

      if (!isForceScan) {
        const { data: alreadyScanned, error: scanError } = await supabase
          .from('activity_segments')
          .select('activity_id');
        
        if (!scanError && alreadyScanned) {
          const scannedIds = new Set(alreadyScanned.map(s => s.activity_id));
          activitiesToScan = allActivities.filter(act => !scannedIds.has(act.id));
          skippedCount = allActivities.length - activitiesToScan.length;
        }
      }

      console.log(`>>> [STAGING] Total: ${allActivities.length} | À traiter: ${activitiesToScan.length}`);
      setProgress({ current: skippedCount, total: allActivities.length, matches: 0, skipped: skippedCount });

      if (activitiesToScan.length === 0) {
        setStatus("finished");
        return;
      }

      // 3. BOUCLE DE TRAITEMENT SÉQUENTIELLE
      for (let i = 0; i < activitiesToScan.length; i++) {
        const actId = activitiesToScan[i].id;
        
        try {
          const res = await fetch("/api/admin/scan-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activityId: actId }),
          });
          
          const data = await res.json();
          
          setProgress(prev => ({
            ...prev,
            current: prev.current + 1,
            matches: prev.matches + (data.matchesFound || 0)
          }));
        } catch (e) {
          console.error(`>>> [API ERROR] Échec sur l'ID ${actId}:`, e);
        }
      }

      setStatus("finished");
    } catch (err) {
      console.error(">>> [CRITICAL FAILURE]:", err);
      setStatus("idle");
    }
  };

  const percent = useMemo(() => 
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  , [progress]);

  return (
    <div className="p-8 max-w-2xl mx-auto bg-[#050505] text-[#F1F1F1] min-h-screen">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#d04fd7]/10 rounded-2xl border border-[#d04fd7]/20 shadow-[0_0_15px_rgba(208,79,215,0.2)]">
              <Zap className="text-[#d04fd7] fill-[#d04fd7]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Retro-Scan</h1>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-1">Maintenance du registre Pulsar</p>
            </div>
          </div>
          {status === "running" && <Loader2 className="animate-spin text-[#00f3ff]" size={24} />}
        </div>

        {/* ALERT BOX */}
        <div className="bg-[#d04fd7]/5 border border-[#d04fd7]/10 rounded-2xl p-5 mb-8 flex gap-4 items-start">
          <ShieldAlert className="text-[#d04fd7] shrink-0" size={20} />
          <p className="text-[11px] text-gray-400 leading-relaxed uppercase tracking-wide">
            Cette opération synchronise l'historique GPS mondial. Elle détecte les segments passés et recalcule les records. 
            <span className="text-white font-bold block mt-1">Utiliser avec précaution sur les serveurs de production.</span>
          </p>
        </div>

        {/* OPTIONS */}
        {status === "idle" && (
          <div className="mb-8 flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
            <button 
              onClick={() => setIsForceScan(!isForceScan)}
              className={`w-12 h-6 rounded-full transition-all relative ${isForceScan ? 'bg-[#d04fd7]' : 'bg-white/10'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isForceScan ? 'left-7' : 'left-1'}`} />
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">
              Forcer le re-scan complet <span className="text-[9px] font-normal lowercase">(Ignore la reprise auto)</span>
            </span>
          </div>
        )}

        {/* MAIN ACTION */}
        {status === "idle" && (
          <button 
            onClick={startGlobalScan}
            className="w-full py-6 bg-[#d04fd7] text-black font-black rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(208,79,215,0.2)] uppercase italic group"
          >
            <Play size={20} fill="black" className="group-hover:translate-x-1 transition-transform" /> 
            Lancer la synchronisation
          </button>
        )}

        {/* PROGRESS DISPLAY */}
        {status !== "idle" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">État de la mission</div>
                <div className="text-5xl font-mono font-black text-white">{percent}%</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Index global</div>
                <div className="text-lg font-mono text-[#00f3ff]">{progress.current} <span className="text-gray-700">/</span> {progress.total}</div>
              </div>
            </div>
            
            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
              <div 
                className="h-full bg-gradient-to-r from-[#d04fd7] via-[#8a2be2] to-[#00f3ff] rounded-full transition-all duration-700 shadow-[0_0_20px_rgba(208,79,215,0.4)]"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
               <StatCard label="Matches" value={progress.matches} color="#d04fd7" icon={<Trophy size={12}/>} />
               <StatCard label="Ignorés" value={progress.skipped} color="#666" icon={<Database size={12}/>} />
               <StatCard label="Vitesse" value={status === "running" ? "SCAN_ON" : "SCAN_OFF"} color="#00f3ff" icon={<ListRestart size={12}/>} />
            </div>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {status === "finished" && (
          <div className="mt-10 p-6 bg-[#10b981]/10 border border-[#10b981]/20 rounded-2xl text-[#10b981] flex items-center gap-5 animate-in zoom-in duration-500">
            <div className="p-3 bg-[#10b981]/20 rounded-xl">
                <CheckCircle size={28} />
            </div>
            <div>
              <p className="font-black italic uppercase text-sm tracking-tighter">Synchronisation stabilisée</p>
              <p className="text-[10px] opacity-70 uppercase tracking-widest">Le Hall of Legends est désormais à jour.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: any) {
    return (
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
            <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                {icon} {label}
            </div>
            <div className="text-xl font-black font-mono" style={{ color }}>{value}</div>
        </div>
    )
}