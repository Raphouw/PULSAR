// fichier : app\admin\page.tsx

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  Loader2, List, Trash2, Terminal, RefreshCcw, CheckCircle, Clock, 
  Map as MapIcon, Eye, Scissors, Calculator, Mountain, TrendingUp
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient"; 
import { getDistanceFromLatLonInMeters } from "../../lib/mapUtils"; 
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// --- IMPORT DYNAMIQUE CARTE ---
const AdminMap = dynamic(() => import("../components/admin/AdminMap"), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-[#050505] text-[#d04fd7] animate-pulse">Chargement matrice...</div>
});

// --- HELPERS ---
const calculatePolylineStats = (points: any[]) => {
    if (!points || points.length < 2) return { dist: 0 };
    let dist = 0;
    for (let i = 0; i < points.length - 1; i++) {
        dist += getDistanceFromLatLonInMeters(points[i][0], points[i][1], points[i+1][0], points[i+1][1]);
    }
    return { dist };
};

const fetchAllActivityIds = async () => {
    let allIds: number[] = [];
    let from = 0;
    const batchSize = 1000;
    let more = true;

    // On prévient l'utilisateur
    const toast = confirm("Je vais scanner la base pour trouver les activités avec GPS. Ça peut prendre quelques secondes...");
    if (!toast) return [];

   console.log("🔄 Démarrage de la récupération des IDs...");

    while (more) {
        // 1. On récupère JUSTE les IDs, sans filtre compliqué sur les colonnes
        const { data, error } = await supabase
            .from('activities')
            .select('id') 
            .order('id', { ascending: false }) // Le tri est crucial pour la pagination
            .range(from, from + batchSize - 1);

        if (error) {
            console.error("Erreur fetch IDs:", error);
            more = false;
        } else if (!data || data.length === 0) {
            more = false;
        } else {
            const ids = data.map((a: any) => a.id);
            allIds = [...allIds, ...ids];
            from += batchSize;
            
            // Si on a reçu moins que le paquet demandé, on est à la fin
            if (data.length < batchSize) more = false;
        }
    }
    
    console.log(`✅ [ADMIN] J'ai trouvé ${allIds.length} activités au total.`);
    return allIds;
  };
const getRouteType = (dist: number, elev: number, grade: number) => {
    // Si c'est très raide et court
    if (grade > 9 && dist < 3000) return "Mur";
    // Si c'est un gros dénivelé (> 300m) ou haute altitude (souvent un Col)
    if (elev > 300) return "Col"; // ou "Montée"
    // Par défaut
    return "Côte";
};

// --- COMPOSANT : LOCALISATION INTELLIGENTE (LAZY LOADING) ---
const SegmentLocation = ({ lat, lon }: { lat: number, lon: number }) => {
  const [location, setLocation] = useState<string | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`)
          .then(res => res.json())
          .then(data => {
            if (data.features?.length > 0) {
              const props = data.features[0].properties;
              const city = props.city || props.municipality || props.village;
              const context = props.context?.split(',')[0];
              setLocation(`${city} (${context})`);
            }
          })
          .catch(() => {});
        observer.disconnect();
      }
    }, { threshold: 0.1 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [lat, lon]);

  return (
    <div ref={elementRef} className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 font-mono uppercase tracking-tight min-h-[15px]">
      {location ? (
        <>
            <MapIcon size={10} className="text-[#d04fd7]" />
            <span className="truncate max-w-[180px]">{location}</span>
        </>
      ) : <span className="opacity-0">...</span>}
    </div>
  );
};

// --- COMPOSANT : PROFIL ALTIMÉTRIQUE ---
const ElevationProfile = ({ points }: { points: any[] }) => {
    const data = useMemo(() => {
        if(!points || points.length < 2) return [];
        let cumDist = 0;
        return points.map((p, i) => {
            if(i > 0) cumDist += getDistanceFromLatLonInMeters(points[i-1][0], points[i-1][1], p[0], p[1]);
            return { dist: (cumDist / 1000).toFixed(1), ele: p[2] || 0 };
        });
    }, [points]);

    if(data.length === 0 || data[0].ele === 0) return (
        <div className="h-24 flex items-center justify-center text-xs text-gray-600 border border-white/5 rounded-xl bg-black/20">Profil indisponible</div>
    );

    const minEle = Math.min(...data.map(d => d.ele));
    const maxEle = Math.max(...data.map(d => d.ele));

    return (
        <div className="h-32 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorEle" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d04fd7" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#d04fd7" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="dist" hide />
                    <YAxis domain={[minEle - 10, maxEle + 10]} hide />
                    <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)} m`, 'Altitude']}
                    labelFormatter={(label) => `${label} km`}
                    contentStyle={{
                        backgroundColor: '#000',
                        borderColor: '#333',
                        color: '#fff',
                        fontSize: '10px'
                    }}
                    />                    
                    <Area type="monotone" dataKey="ele" stroke="#d04fd7" strokeWidth={2} fillOpacity={1} fill="url(#colorEle)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- TAB : SYSTÈME ---
const SystemMonitorTab = ({ jobs, handleGlobalRescan, handleClimbScan, deleteJob }: any) => {
    return (
        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-xl p-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="font-bold text-gray-300 flex items-center gap-2"><List className="text-[#d04fd7]"/> File d'attente</h3>
                <div className="flex gap-3">
                    <button onClick={handleGlobalRescan} className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-xs font-bold uppercase border border-white/10 flex items-center gap-2 text-gray-300 hover:text-white transition-all"><RefreshCcw size={14} className="text-[#00f3ff]"/> Sync Segments</button>
                    <button onClick={handleClimbScan} className="bg-[#d04fd7]/10 hover:bg-[#d04fd7]/20 px-4 py-2 rounded-lg text-xs font-bold uppercase border border-[#d04fd7]/30 flex items-center gap-2 text-[#d04fd7] transition-all"><Mountain size={14} /> Scan Cols Historique</button>
                </div>
             </div>
             <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {jobs.length === 0 ? <div className="p-10 text-center opacity-30 text-xs uppercase font-bold">Aucune tâche en cours</div> : jobs.map((job: any) => (
                    <div key={job.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            {job.status === 'processing' ? <Loader2 size={16} className="animate-spin text-[#d04fd7]"/> : job.status === 'completed' ? <CheckCircle size={16} className="text-emerald-500"/> : <Clock size={16} className="text-gray-500"/>}
                            <div className="flex flex-col"><span className="text-xs font-bold text-gray-200">{job.payload?.segmentName || "Tâche Système"}</span><span className="text-[10px] text-gray-500 uppercase">{job.type}</span></div>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="w-24 h-1.5 bg-black rounded-full overflow-hidden hidden md:block"><div className="h-full bg-[#d04fd7]" style={{ width: `${Math.min((job.progress / Math.max(job.total, 1)) * 100, 100)}%` }}></div></div>
                             <span className="text-[10px] font-mono text-gray-400 w-16 text-right">{job.progress}/{job.total}</span>
                             <button onClick={() => deleteJob(job.id)} className="p-1.5 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
             </div>
        </div>
    );
};

// --- TAB : VALIDATION OPTIMISÉE (PRE-FETCH) ---
// --- TAB : VALIDATION OPTIMISÉE (PRE-FETCH + SMART NAMING) ---
const ValidationTab = ({ onValidationSuccess }: { onValidationSuccess: () => void }) => {
    // 1. Liste légère (ID, Nom, Stats basiques)
    const [queue, setQueue] = useState<any[]>([]);
    
    // 2. Cache Lourd (Map : ID -> Données Complètes avec Polyline)
    const [detailsCache, setDetailsCache] = useState<Record<string, any>>({});
    
    // 3. Sélection actuelle
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // États du formulaire
    const [newName, setNewName] = useState("");
    const [cutStart, setCutStart] = useState(0);
    const [cutEnd, setCutEnd] = useState(0);

    // A. CHARGEMENT INITIAL (LISTE)
    useEffect(() => {
        const loadQueue = async () => {
            try {
                const res = await fetch('/api/admin/candidates');
                if (res.ok) {
                    const data = await res.json();
                    setQueue(data);
                    if (data.length > 0) setSelectedId(data[0].id);
                }
            } catch (e) { console.error(e); }
        };
        loadQueue();
    }, []);

    const fetchingIds = useRef<Set<string>>(new Set());

    // B. LE CRAWLER (PRE-FETCHING)
    useEffect(() => {
        if (queue.length === 0) return;

        const currentIndex = queue.findIndex(q => q.id === selectedId);
        const searchOrder = [ ...queue.slice(currentIndex), ...queue.slice(0, currentIndex) ];

        const nextToLoad = searchOrder.find(item => !detailsCache[item.id] && !fetchingIds.current.has(item.id));

        if (nextToLoad) {
            const fetchNext = async () => {
                fetchingIds.current.add(nextToLoad.id); 
                try {
                    await new Promise(r => setTimeout(r, 200)); 
                    const res = await fetch(`/api/admin/segment-detail?id=${nextToLoad.id}`);
                    if (res.ok) {
                        const fullData = await res.json();
                        if (typeof fullData.polyline === 'string') fullData.polyline = JSON.parse(fullData.polyline);
                        setDetailsCache(prev => ({ ...prev, [nextToLoad.id]: fullData }));
                    }
                } catch (e) { 
                    console.error("Err prefetch", e); 
                    fetchingIds.current.delete(nextToLoad.id);
                }
            };
            fetchNext();
        }
    }, [queue, detailsCache, selectedId]);

    // C. GESTION DE LA SÉLECTION & SMART NAMING 🧠
    useEffect(() => {
        if (!selectedId) return;

        // Fonction locale pour traiter les données et générer le nom
        const processSelection = async (data: any) => {
            setCutStart(0);
            setCutEnd(0);

            const rawName = data.name || "";

            // SI C'EST UN CANDIDAT AUTO : ON GÉNÈRE UN NOM PROPRE
            if (rawName.startsWith("[AUTO]")) {
                try {
                    // 1. Déterminer le type (Col, Côte...)
                    const type = getRouteType(data.distance_m, data.elevation_gain_m, data.average_grade);
                    
                    // 2. Chercher la ville de départ
                    const res = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${data.start_lon}&lat=${data.start_lat}`);
                    const geo = await res.json();
                    
                    let city = "Inconnue";
                    if (geo.features?.length > 0) {
                        const props = geo.features[0].properties;
                        city = props.city || props.municipality || props.village || props.locality;
                    }

                    // 3. Formater : "Col ... par Ville"
                    setNewName(`${type} ... par ${city}`);
                } catch (e) {
                    console.error("Erreur naming auto", e);
                    setNewName(rawName); // Fallback
                }
            } else {
                // Si le nom est déjà défini (ex: import manuel), on garde tel quel
                setNewName(rawName);
            }
        };

        const loadSelected = async () => {
            // Cas 1 : Déjà en cache
            if (detailsCache[selectedId]) {
                processSelection(detailsCache[selectedId]);
                return;
            }

            // Cas 2 : Chargement nécessaire
            setIsLoadingDetail(true);
            try {
                const res = await fetch(`/api/admin/segment-detail?id=${selectedId}`);
                if (res.ok) {
                    const fullData = await res.json();
                    if (typeof fullData.polyline === 'string') fullData.polyline = JSON.parse(fullData.polyline);
                    
                    setDetailsCache(prev => ({ ...prev, [selectedId]: fullData }));
                    processSelection(fullData);
                }
            } finally {
                setIsLoadingDetail(false);
            }
        };

        loadSelected();
    }, [selectedId, detailsCache]);

    // D. CALCULS (MEMO)
    const selectedFull = useMemo(() => detailsCache[selectedId || ""], [detailsCache, selectedId]);

    const croppedPolyline = useMemo(() => {
        if (!selectedFull || !selectedFull.polyline) return [];
        const points = selectedFull.polyline;
        const total = points.length;
        const startIndex = Math.floor(total * (cutStart / 100));
        const endIndex = total - Math.floor(total * (cutEnd / 100));
        if (startIndex >= endIndex) return [points[0], points[points.length-1]];
        return points.slice(startIndex, endIndex);
    }, [selectedFull, cutStart, cutEnd]);

    const liveStats = useMemo(() => {
        if (!selectedFull) return { dist: 0, grade: 0, elev: 0 };
        const { dist } = calculatePolylineStats(croppedPolyline);
        let newElev = 0;
        if (croppedPolyline.length > 0 && croppedPolyline[0].length > 2) {
             newElev = Math.max(0, croppedPolyline[croppedPolyline.length - 1][2] - croppedPolyline[0][2]);
        } else {
             const ratio = dist / (selectedFull.distance_m || 1);
             newElev = Math.round((selectedFull.elevation_gain_m || 0) * ratio);
        }
        const newGrade = dist > 0 ? (newElev / dist) * 100 : 0;
        return { dist, elev: newElev, grade: newGrade };
    }, [croppedPolyline, selectedFull]);

    // E. VALIDATION / REJET
    const handleDecision = async (approved: boolean) => {
        if (!selectedFull) return;

        // 🔥 NETTOYAGE DU NOM AVANT ENVOI
        // Enlève [AUTO] au début et les parenthèses de stats à la fin si l'utilisateur a oublié
        const cleanName = newName
            .replace(/^\[AUTO\]\s*/, '') 
            .replace(/\s*\([^)]*\)$/, '') 
            .trim();

        const payload = {
            id: selectedFull.id,
            decision: approved ? 'approve' : 'reject',
            segmentData: {
                name: cleanName, // Nom propre envoyé
                polyline: croppedPolyline,
                start_lat: croppedPolyline[0][0], start_lon: croppedPolyline[0][1],
                end_lat: croppedPolyline[croppedPolyline.length-1][0], end_lon: croppedPolyline[croppedPolyline.length-1][1],
                distance_m: liveStats.dist, elevation_gain_m: liveStats.elev, average_grade: parseFloat(liveStats.grade.toFixed(1)),
                tags: selectedFull.tags
            }
        };

        // UI Optimiste
        const currentIdx = queue.findIndex(q => q.id === selectedId);
        const nextItem = queue[currentIdx + 1] || queue[currentIdx - 1] || null;
        
        const newQueue = queue.filter(q => q.id !== selectedId);
        setQueue(newQueue);

        if (nextItem) setSelectedId(nextItem.id);
        else setSelectedId(null);

        fetch('/api/admin/segment-decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(res => {
            if (res.ok && approved) onValidationSuccess();
        });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
            {/* --- LISTE --- */}
            <div className="w-full lg:w-1/4 bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/5 bg-[#111] flex justify-between items-center">
                    <h3 className="font-bold text-xs text-gray-400 uppercase tracking-widest">File d'attente ({queue.length})</h3>
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] text-gray-600">Cache: {Object.keys(detailsCache).length}</span>
                        {Object.keys(detailsCache).length < queue.length && <Loader2 size={10} className="animate-spin text-[#d04fd7]" />}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1 relative">
                    {queue.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-600 text-[10px] uppercase">Terminé 🎉</div>
                    ) : (
                        queue.map(seg => {
                            const isCached = !!detailsCache[seg.id];
                            return (
                                <div key={seg.id} onClick={() => setSelectedId(seg.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all relative ${selectedId === seg.id ? 'bg-[#d04fd7]/10 border-[#d04fd7] text-white' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-500'}`}>
                                    <div className="font-bold text-xs truncate flex items-center gap-2">
                                        {seg.name}
                                        {isCached && selectedId !== seg.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />}
                                    </div>
                                    <div className="text-[10px] opacity-60">{(seg.distance_m/1000).toFixed(1)}km • {seg.average_grade}%</div>
                                    <SegmentLocation lat={seg.start_lat} lon={seg.start_lon} />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
            {/* --- DÉTAIL --- */}
            <div className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-2xl flex flex-col relative overflow-hidden">
                {selectedFull ? (
                    <>
                        <div className="flex-1 relative border-b border-white/10 min-h-[300px]">
                            <AdminMap key={selectedFull.id} polyline={croppedPolyline} /> 
                            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-mono text-[#d04fd7] z-[1000]">
                                ID: {selectedFull.id}
                            </div>
                        </div>
                        
                        <div className="p-6 bg-[#111] flex flex-col overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
                                <div className="space-y-4">
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500"><span>Départ ({cutStart}%)</span> <Scissors size={12}/></div>
                                    <input type="range" min="0" max="90" step="0.1" value={cutStart} onChange={(e) => setCutStart(parseFloat(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#d04fd7]"/>
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500"><span>Arrivée ({cutEnd}%)</span> <Scissors size={12}/></div>
                                    <input type="range" min="0" max="90" step="0.1" value={cutEnd} onChange={(e) => setCutEnd(parseFloat(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#d04fd7]"/>
                                </div>
                                <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col justify-center space-y-2">
                                    <div className="flex items-center gap-2 text-[#00f3ff] text-xs font-bold uppercase mb-1"><Calculator size={14}/> Stats Finales</div>
                                    <div className="flex justify-between text-sm font-mono text-gray-300"><span>Dist:</span> <span className="text-white">{(liveStats.dist/1000).toFixed(2)} km</span></div>
                                    <div className="flex justify-between text-sm font-mono text-gray-300"><span>D+:</span> <span className="text-white">{liveStats.elev.toFixed(2)} m</span></div>
                                    <div className="flex justify-between text-sm font-mono text-gray-300"><span>Pente:</span> <span className="text-[#d04fd7]">{liveStats.grade.toFixed(1)} %</span></div>
                                </div>
                            </div>
                            <div className="mb-4 border-t border-white/5 pt-2">
                                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase"><TrendingUp size={12}/> Profil</div>
                                <ElevationProfile points={croppedPolyline} />
                            </div>
                            <div className="space-y-3 pt-2">
                                <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-[#050505] border border-white/10 rounded-lg p-3 text-sm font-bold text-white focus:border-[#d04fd7] outline-none" placeholder="Nom officiel..." />
                                <div className="flex gap-4">
                                    <button onClick={() => handleDecision(false)} className="flex-1 py-3 rounded-lg bg-red-900/10 text-red-500 font-bold uppercase text-xs hover:bg-red-900/30 border border-red-900/20">Rejeter</button>
                                    <button onClick={() => handleDecision(true)} className="flex-1 py-3 rounded-lg bg-[#d04fd7] text-black font-bold uppercase text-xs hover:bg-white transition-all shadow-[0_0_15px_rgba(208,79,215,0.4)]">Valider & Scanner</button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700">
                        {isLoadingDetail ? (
                             <div className="flex flex-col items-center animate-pulse">
                                <Loader2 size={32} className="text-[#d04fd7] mb-2 animate-spin"/>
                                <span className="text-[10px] uppercase font-bold">Chargement prioritaire...</span>
                             </div>
                        ) : (
                            <>
                                <Eye size={48} className="mb-4 opacity-20"/>
                                <span className="uppercase tracking-widest text-xs">Sélectionner un candidat</span>
                            </>
                        )}
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

  const handleGlobalRescan = async () => {
    if (!confirm("SYNC SEGMENTS : Scanner toutes les activités sur les segments OFFICIELS existants ?")) return;
    
    // On utilise le fetcher paginé
    const actIds = await fetchAllActivityIds();
    
    if (actIds.length === 0) {
        alert("Aucune activité trouvée.");
        return;
    }

    await (supabase.from('admin_jobs') as any).insert({
      type: 'global_sync',
      status: 'pending',
      total: actIds.length,
      progress: 0,
      payload: { 
        segmentId: null, 
        segmentName: `Sync Globale (${actIds.length} acts)`, 
        queue: actIds
      }
    });
    fetchJobs();
  };

    const handleClimbScan = async () => {
    // On lance la récupération intelligente
    const actIds = await fetchAllActivityIds();

    if (actIds.length === 0) {
        alert("Aucune activité avec GPS trouvée !");
        return;
    }
    
    // On confirme le nombre RÉEL (ex: 700 au lieu de 1400)
    if(!confirm(`J'ai trouvé ${actIds.length} activités avec GPS valides (sur tout l'historique). Lancer le scan ?`)) return;

    await (supabase.from('admin_jobs') as any).insert({
      type: 'global_detect',
      status: 'pending',
      total: actIds.length,
      progress: 0,
      payload: { 
        segmentName: `Détection Intelligente (${actIds.length} acts)`, 
        queue: actIds // La liste est maintenant propre et sans trous
      }
    });
    fetchJobs();
  };
  
  const deleteJob = async (id: string) => { await (supabase.from('admin_jobs') as any).delete().eq('id', id); fetchJobs(); };

  if (status === "loading") return <div className="h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-[#d04fd7]"/></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <h1 className="text-2xl font-bold uppercase italic flex items-center gap-3">
                <Terminal className="text-[#d04fd7]"/> Command Center
            </h1>
            <div className="bg-[#111] p-1 rounded-lg border border-white/10 flex gap-1">
                <button onClick={() => setActiveTab('monitor')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${activeTab==='monitor' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Système</button>
                <button onClick={() => setActiveTab('validation')} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all ${activeTab==='validation' ? 'bg-[#d04fd7] text-black' : 'text-gray-500 hover:text-gray-300'}`}>Validations</button>
            </div>
        </div>

        {/* CONTENU AVEC PERSISTANCE (CSS HIDDEN) */}
        
        <div className={activeTab === 'monitor' ? 'block' : 'hidden'}>
            <SystemMonitorTab 
                jobs={jobs} 
                handleGlobalRescan={handleGlobalRescan} 
                handleClimbScan={handleClimbScan}
                deleteJob={deleteJob}
            />
        </div>

        <div className={activeTab === 'validation' ? 'block' : 'hidden'}>
            <ValidationTab 
                onValidationSuccess={() => setActiveTab('monitor')} 
            />
        </div>

      </div>
    </div>
  );
}