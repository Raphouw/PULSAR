// Fichier : app/segments/creator/SegmentCreatorClient.tsx
'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic'; 
import { useRouter } from 'next/navigation';
import { UploadCloud, Save, FileCode, Zap, ChevronLeft, ChevronRight, MousePointer2, ArrowLeft, RefreshCw, ArrowUp, ArrowDown, Tag, Plus, X, Check, Search } from 'lucide-react';
import polyline from '@mapbox/polyline';
import toGeoJSON from '@mapbox/togeojson'; 
import { DOMParser } from '@xmldom/xmldom'; 
import { PREDEFINED_SEGMENT_TAGS, TagDefinition } from '../../../lib/segmentTags';

const CreatorMap = dynamic(() => import('./CreatorMap'), { ssr: false, loading: () => <div className="h-full w-full bg-[#050505]" /> });
const CreatorProfile = dynamic(() => import('./CreatorProfile'), { ssr: false });

type Point = { lat: number; lon: number; ele: number; };

// --- STYLES CSS INJECTÉS ---
const sliderStyle = `
  .cyber-slider { -webkit-appearance: none; width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; cursor: pointer; position: relative; z-index: 1; }
  .cyber-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; cursor: pointer; border: 2px solid #fff; margin-top: -6px; transition: transform 0.1s; z-index: 50; position: relative; }
  .slider-start::-webkit-slider-thumb { background: #10b981; box-shadow: 0 0 10px #10b981; }
  .slider-end::-webkit-slider-thumb { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
  .cyber-slider::-webkit-slider-thumb:hover { transform: scale(1.3); }
`;

// --- HELPERS ---
function getDistance(p1: Point, p2: Point) {
    const R = 6371e3; const φ1 = p1.lat * Math.PI / 180; const φ2 = p2.lat * Math.PI / 180;
    const a = Math.sin(((p2.lat-p1.lat)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(((p2.lon-p1.lon)*Math.PI/180)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const parseGpxToPoints = (gpxText: string): Point[] => {
    try {
        const parser = new DOMParser(); const gpxDoc = parser.parseFromString(gpxText, "application/xml");
        const geoJson = toGeoJSON.gpx(gpxDoc); const coordinates = geoJson.features?.[0]?.geometry?.coordinates;
        if (!coordinates || coordinates.length === 0) return [];
        return coordinates.map((p: any) => ({ lat: p[1], lon: p[0], ele: p[2] || 0 }));
    } catch (e) { return []; }
};

function useLongPress(callback: () => void, ms = 50, onStart?: () => void, onEnd?: () => void) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const callbackRef = useRef(callback);
    useEffect(() => { callbackRef.current = callback; }, [callback]);
    const stop = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (onEnd) onEnd();
        window.removeEventListener('mouseup', stop);
        window.removeEventListener('touchend', stop);
    }, [onEnd]);
    const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (onStart) onStart();
        callbackRef.current();
        timerRef.current = setInterval(() => { callbackRef.current(); }, ms);
        window.addEventListener('mouseup', stop);
        window.addEventListener('touchend', stop);
    }, [ms, stop, onStart]);
    return { onMouseDown: start, onTouchStart: start };
}

// --- COMPOSANTS UI ---
const RepeatButton = ({ action, icon: Icon, onFocusStart, onFocusEnd }: any) => {
    const longPressEvents = useLongPress(action, 50, onFocusStart, onFocusEnd);
    return (
        <button {...longPressEvents} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 50 }} className="hover:bg-white/10 hover:border-white/30 active:scale-95 active:bg-white/20">
            <Icon size={16} />
        </button>
    );
};

const MetricBox = ({ label, value, unit, color, icon: Icon }: any) => (
    <div style={{ background: 'rgba(20,20,25,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '0.8rem 1.5rem', minWidth: '130px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>{Icon && <Icon size={12} color={color} />}{label}</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: color, lineHeight: 1, textShadow: `0 0 30px ${color}30` }}>{value}<span style={{ fontSize: '0.5em', color: '#666', marginLeft: '4px', fontWeight: 600 }}>{unit}</span></div>
    </div>
);

const SurfaceButton = ({ label, active, onClick }: any) => (
    <button 
        onClick={onClick}
        style={{ 
            flex: 1, padding: '10px', borderRadius: '8px', border: active ? '1px solid #d04fd7' : '1px solid rgba(255,255,255,0.1)',
            background: active ? 'rgba(208, 79, 215, 0.1)' : 'transparent', color: active ? '#d04fd7' : '#666',
            fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s'
        }}
    >
        {label}
    </button>
);

const TagButton = ({ tag, isActive, onClick, onDelete }: { tag: TagDefinition, isActive: boolean, onClick: (tag: TagDefinition) => void, onDelete?: () => void }) => (
    <button 
        onClick={() => onClick(tag)}
        title={tag.description}
        style={{
            background: isActive ? tag.color : 'rgba(255,255,255,0.05)',
            border: isActive ? `1px solid ${tag.color}` : '1px solid rgba(255,255,255,0.1)',
            color: isActive ? (['#00f3ff', '#6AA84F', '#FF9900', '#d04fd7'].includes(tag.color) ? '#000' : '#fff') : '#888',
            padding: '6px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: isActive ? `0 0 15px ${tag.color}60` : 'none',
            display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px'
        }}
    >
        <Tag size={12} style={{ opacity: isActive ? 1 : 0.5 }} /> {tag.label}
        {onDelete && isActive && (
            <div onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ marginLeft: '6px', padding: '2px', borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }}>
                <X size={10} />
            </div>
        )}
    </button>
);

// --- MAIN COMPONENT ---
export default function SegmentCreatorClient() {
    const router = useRouter();
    
    const [fullTrace, setFullTrace] = useState<Point[]>([]);
    const [segmentName, setSegmentName] = useState('');
    const [startIdx, setStartIdx] = useState(0);
    const [endIdx, setEndIdx] = useState(0);
    const [surface, setSurface] = useState<'Route' | 'Pavé' | 'Gravel'>('Route'); 
    const [selectedTags, setSelectedTags] = useState<TagDefinition[]>([]); 
    
    // STATES POUR CREATION TAG MANUEL
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [newTagLabel, setNewTagLabel] = useState('');
    const [newTagColor, setNewTagColor] = useState('#d04fd7');

    const [isProcessing, setIsProcessing] = useState(false);
    const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
    const [statusMessage, setStatusMessage] = useState<string>(''); // 🔥 Nouveau state pour le message
    const [isDragOver, setIsDragOver] = useState(false);
    const [focusMode, setFocusMode] = useState<'start' | 'end' | null>(null);
    const [hoveredPoint, setHoveredPoint] = useState<{ lat: number, lon: number } | null>(null);
    const focusTimerRef = useRef<NodeJS.Timeout | null>(null);

    const engageFocus = (mode: 'start' | 'end') => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        setFocusMode(mode);
    };
    const releaseFocus = () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        focusTimerRef.current = setTimeout(() => { setFocusMode(null); }, 800);
    };

    const toggleTag = (tag: TagDefinition) => {
        setSelectedTags(prev => 
            prev.some(t => t.value === tag.value) 
            ? prev.filter(t => t.value !== tag.value) 
            : [...prev, tag]
        );
    };

    const handleAddCustomTag = () => {
        if (!newTagLabel.trim()) return;
        const customTag: TagDefinition = {
            label: newTagLabel,
            value: `CUSTOM_${Date.now()}`, 
            color: newTagColor,
            description: 'Tag personnalisé'
        };
        setSelectedTags(prev => [...prev, customTag]);
        setNewTagLabel('');
        setIsCreatingTag(false);
    };

    const metrics = useMemo(() => {
        if (!fullTrace.length || endIdx <= startIdx) return { dist: 0, ele: 0, loss: 0, avg: 0, max: 0 };
        const points = fullTrace.slice(startIdx, endIdx + 1);
        let dist = 0; let gain = 0; let loss = 0; let maxG = -Infinity;
        for (let i = 1; i < points.length; i++) {
            const dStep = getDistance(points[i-1], points[i]); dist += dStep;
            const eStep = points[i].ele - points[i-1].ele;
            if (eStep > 0) gain += eStep; else loss += Math.abs(eStep);
            if (i >= 3) {
                const pPrev = points[i-3]; const pCurr = points[i]; const dSmooth = getDistance(pPrev, pCurr); const eSmooth = pCurr.ele - pPrev.ele;
                if (dSmooth > 10) { const g = (eSmooth / dSmooth) * 100; if (g > maxG) maxG = g; }
            }
        }
        if (maxG === -Infinity) maxG = 0;
        const avg = dist > 0 ? ((points[points.length-1].ele - points[0].ele) / dist) * 100 : 0;
        return { dist: dist / 1000, ele: Math.round(gain), loss: Math.round(loss), avg: avg, max: maxG };
    }, [fullTrace, startIdx, endIdx]);

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const points = parseGpxToPoints(e.target?.result as string);
            if (points.length > 10) { setFullTrace(points); setStartIdx(0); setEndIdx(points.length - 1); }
        };
        reader.readAsText(file);
    };

    const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }, []);
    
    const adjustSlider = (type: 'start'|'end', delta: number) => {
        if (type === 'start') setStartIdx(prev => Math.max(0, Math.min(prev + delta, endIdx - 5)));
        else setEndIdx(prev => Math.max(startIdx + 5, Math.min(prev + delta, fullTrace.length - 1)));
    };
    const handleProfileHover = useCallback((index: number | null) => {
        if (index !== null && fullTrace[index]) { setHoveredPoint({ lat: fullTrace[index].lat, lon: fullTrace[index].lon }); } else { setHoveredPoint(null); }
    }, [fullTrace]);
    
    // 🔥 FONCTION DE SAUVEGARDE AMÉLIORÉE (SCAN RÉTROACTIF)
// 🔥 FONCTION DE SAUVEGARDE SYNCHRONISÉE AVEC LE COMMAND CENTER
    const handleSave = async () => {
        if (!segmentName || fullTrace.length === 0) return;
        setIsProcessing(true);
        setStatusMessage('INITIALISATION DU REGISTRE...'); 

        try {
            const points = fullTrace.slice(startIdx, endIdx + 1);
            const polylineData = points.map(p => [p.lat, p.lon, Math.round(p.ele * 10) / 10]);
            const categoryLabel = surface === 'Route' ? null : surface; 
            const tagsJsonb = selectedTags.map(tag => ({ label: tag.label, color: tag.color }));

            // 1. Création du segment + Injection automatique du JOB côté serveur
            const res = await fetch('/api/admin/create-segment', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: segmentName, 
                    distance_m: metrics.dist * 1000, 
                    elevation_gain_m: metrics.ele, 
                    average_grade: metrics.avg, 
                    max_grade: metrics.max, 
                    start_lat: points[0].lat, 
                    start_lon: points[0].lon, 
                    end_lat: points[points.length-1].lat, 
                    end_lon: points[points.length-1].lon, 
                    polyline: polylineData,
                    category: categoryLabel,
                    tags: tagsJsonb 
                })
            });

            if (!res.ok) throw new Error("Erreur lors de la création");
            
            const data = await res.json();
            
            // 2. Mise à jour de l'UI avec le retour de l'API
            // L'API renvoie { success, segmentId, activitiesCount }
            setScanProgress({ current: 0, total: data.activitiesCount || 0 });
            setStatusMessage(`MISSION TRANSFÉRÉE : ${data.activitiesCount} EFFORTS DÉTECTÉS`);

            // 3. Redirection vers le cockpit après un court délai pour lire le message
            setTimeout(() => {
                router.push(`/admin`); 
            }, 2500);

        } catch (error: any) {
            console.error("Erreur Segment Lab:", error);
            setStatusMessage("ÉCHEC DU PROTOCOLE");
            setIsProcessing(false);
        }
    };

   return (
    <>
        <style>{sliderStyle}</style>
        <div style={{ height: '100vh', width: '100%', background: '#000', color: '#F1F1F1', fontFamily: '"Inter", sans-serif', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ width: '100%', maxWidth: '1600px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                
                {/* ZONE 1 : CARTE */}
                <div style={{ flex: 1, position: 'relative', width: '100%', background: '#050505' }}>
                    <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => router.push('/segments')} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} className="hover:bg-white/10"><ArrowLeft size={20} /></button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}><Zap color="white" size={16} fill="white" /><span style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '0.9rem' }}>SEGMENT LAB</span></div>
                    </div>
                    
                    <CreatorMap fullTrace={fullTrace} startIdx={startIdx} endIdx={endIdx} focusMode={focusMode} hoveredPoint={hoveredPoint} />
                    
                    {fullTrace.length === 0 && (
                        <div onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} onDrop={onDrop} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: isDragOver ? 'rgba(208, 79, 215, 0.15)' : 'rgba(20, 20, 25, 0.8)', backdropFilter: 'blur(20px)', border: isDragOver ? '2px dashed #d04fd7' : '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '4rem', textAlign: 'center', zIndex: 1000, width: '400px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', transition: 'all 0.2s' }}>
                            <UploadCloud size={30} color={isDragOver ? '#d04fd7' : '#888'} className="mx-auto mb-4" />
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Importer GPX</h2>
                            <label style={{ background: '#fff', color: '#000', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-block', marginTop: '1rem' }}>Parcourir<input type="file" accept=".gpx" className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} style={{display:'none'}}/></label>
                        </div>
                    )}
                    
                    {fullTrace.length > 0 && (
                        <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1.5rem', zIndex: 999 }}>
                            <MetricBox label="Distance" value={metrics.dist.toFixed(2)} unit="km" color="#fff" />
                            <MetricBox label="D+" value={metrics.ele} unit="m" color="#10b981" icon={ArrowUp} />
                            <MetricBox label="D-" value={metrics.loss} unit="m" color="#3b82f6" icon={ArrowDown} />
                            <MetricBox label="Pente Moy" value={metrics.avg.toFixed(1)} unit="%" color={metrics.avg > 0 ? '#f59e0b' : '#3b82f6'} />
                            <MetricBox label="Pente Max" value={metrics.max.toFixed(1)} unit="%" color="#ef4444" />
                        </div>
                    )}
                </div>
                
                {/* ZONE 2 : CONTROLS */}
                <div style={{ height: '550px', background: '#0E0E14', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* LIGNE 1 : NOM / SURFACE / SAUVEGARDE ET SCAN PROGRESSIF */}
                    <div style={{ padding: '1.5rem 3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', width: '50%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                <FileCode size={20} color="#666" />
                                <input type="text" placeholder="Nom du Segment" value={segmentName} onChange={e => setSegmentName(e.target.value)} disabled={fullTrace.length === 0 || isProcessing} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', fontWeight: 700, width: '100%', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                                <SurfaceButton label="Route" active={surface === 'Route'} onClick={() => setSurface('Route')} />
                                <SurfaceButton label="Pavé" active={surface === 'Pavé'} onClick={() => setSurface('Pavé')} />
                                <SurfaceButton label="Gravel" active={surface === 'Gravel'} onClick={() => setSurface('Gravel')} />
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            {/* PROGRESSION VISUELLE NÉON PENDANT LE SCAN */}
                            {isProcessing && (
                                <div style={{ minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '9px', color: '#d04fd7', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>{statusMessage}</span>
                                        {scanProgress.total > 0 && (
                                            <span style={{ fontSize: '9px', color: '#666', fontWeight: 800 }}>{scanProgress.current} / {scanProgress.total}</span>
                                        )}
                                    </div>
                                    {scanProgress.total > 0 && (
                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div 
                                                style={{ 
                                                    height: '100%', 
                                                    background: 'linear-gradient(90deg, #d04fd7, #00f3ff)', 
                                                    width: `${(scanProgress.current / scanProgress.total) * 100}%`,
                                                    transition: 'width 0.3s ease',
                                                    boxShadow: '0 0 10px rgba(208, 79, 215, 0.5)'
                                                }} 
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {!isProcessing && (
                                    <label style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#888', padding: '12px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} className="hover:bg-white/10 hover:text-white"><RefreshCw size={16} /> Changer GPX<input type="file" accept=".gpx" className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} style={{display:'none'}}/></label>
                                )}
                                
                                <button 
                                    onClick={handleSave} 
                                    disabled={isProcessing || !segmentName || fullTrace.length === 0} 
                                    style={{ 
                                        background: statusMessage === "SYNCHRONISATION TERMINÉE !" ? 'rgba(16, 185, 129, 0.1)' : (isProcessing ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, #d04fd7, #8a2be2)'), 
                                        color: statusMessage === "SYNCHRONISATION TERMINÉE !" ? '#10b981' : (segmentName && !isProcessing ? '#fff' : '#555'), 
                                        padding: '12px 30px', borderRadius: '8px', border: statusMessage === "SYNCHRONISATION TERMINÉE !" ? '1px solid #10b981' : 'none', 
                                        fontWeight: 800, fontSize: '0.9rem', cursor: segmentName && !isProcessing ? 'pointer' : 'not-allowed', 
                                        display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        textTransform: 'uppercase', letterSpacing: '0.5px'
                                    }}
                                >
                                    {statusMessage === "SYNCHRONISATION TERMINÉE !" ? (
                                        <><Check size={18} /> REDIRECTION...</>
                                    ) : isProcessing ? (
                                        <><RefreshCw size={18} className="animate-spin text-[#d04fd7]" /> ANALYSE</>
                                    ) : (
                                        <><Save size={18} /> CERTIFIER & SCANNER</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* LIGNE 2 : GESTION DES TAGS */}
                    {fullTrace.length > 0 && (
                        <div style={{ padding: '1.5rem 3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}><Tag size={14} color="#d04fd7" /> CLASSIFICATION MANUELLE</div>
                                {!isCreatingTag && !isProcessing && (
                                    <button onClick={() => setIsCreatingTag(true)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '12px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#fff', fontWeight: 700 }}><Plus size={12} /> CRÉER TAG</button>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                                {PREDEFINED_SEGMENT_TAGS.map(tag => (
                                    <TagButton key={tag.value} tag={tag} isActive={selectedTags.some(t => t.value === tag.value)} onClick={isProcessing ? () => {} : toggleTag} />
                                ))}
                                {selectedTags.filter(t => t.value.startsWith('CUSTOM_')).map(tag => (
                                    <TagButton key={tag.value} tag={tag} isActive={true} onClick={isProcessing ? () => {} : () => toggleTag(tag)} onDelete={isProcessing ? undefined : () => toggleTag(tag)} />
                                ))}
                                {isCreatingTag && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '20px', border: '1px solid #d04fd7' }}>
                                        <input autoFocus type="text" placeholder="Nom du tag..." value={newTagLabel} onChange={(e) => setNewTagLabel(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none', width: '120px', fontWeight: 700 }} />
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {['#d04fd7', '#00f3ff', '#10b981', '#ef4444', '#f59e0b'].map(c => (
                                                <div key={c} onClick={() => setNewTagColor(c)} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, cursor: 'pointer', border: newTagColor === c ? '2px solid white' : 'none' }} />
                                            ))}
                                        </div>
                                        <button onClick={handleAddCustomTag} disabled={!newTagLabel} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#10b981' }}><Check size={12} /></button>
                                        <button onClick={() => setIsCreatingTag(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}><X size={12} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LIGNE 3 : PROFIL / SLIDERS */}
                    {fullTrace.length > 0 ? (
                        <div style={{ flex: 1, display: 'flex', padding: '0' }}>
                            <div style={{ flex: '65', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '2rem', position: 'relative', background: 'linear-gradient(180deg, rgba(255,255,255,0.01), transparent)' }}>
                                <div style={{ position: 'absolute', top: '15px', left: '20px', fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>PROFIL ALTIMÉTRIQUE DYNAMIQUE</div>
                                <CreatorProfile fullTrace={fullTrace} startIdx={startIdx} endIdx={endIdx} onHover={handleProfileHover} />
                            </div>
                            <div style={{ flex: '35', padding: '2rem 3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2.5rem', opacity: isProcessing ? 0.3 : 1, pointerEvents: isProcessing ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem', fontWeight: 700, color:'#10b981' }}><span>DÉPART</span></div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
                                        <RepeatButton icon={ChevronLeft} action={() => adjustSlider('start', -1)} onFocusStart={() => engageFocus('start')} onFocusEnd={releaseFocus} />
                                        <input type="range" className="cyber-slider slider-start" min="0" max={fullTrace.length - 1} value={startIdx} onChange={(e) => adjustSlider('start', parseInt(e.target.value) - startIdx)} onMouseDown={() => engageFocus('start')} onMouseUp={releaseFocus} onTouchStart={() => engageFocus('start')} onTouchEnd={releaseFocus} style={{ flex: 1, zIndex: 1 }} />
                                        <RepeatButton icon={ChevronRight} action={() => adjustSlider('start', 1)} onFocusStart={() => engageFocus('start')} onFocusEnd={releaseFocus} />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem', fontWeight: 700, color:'#ef4444' }}><span>ARRIVÉE</span></div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
                                        <RepeatButton icon={ChevronLeft} action={() => adjustSlider('end', -1)} onFocusStart={() => engageFocus('end')} onFocusEnd={releaseFocus} />
                                        <input type="range" className="cyber-slider slider-end" min="0" max={fullTrace.length - 1} value={endIdx} onChange={(e) => adjustSlider('end', parseInt(e.target.value) - endIdx)} onMouseDown={() => engageFocus('end')} onMouseUp={releaseFocus} onTouchStart={() => engageFocus('end')} onTouchEnd={releaseFocus} style={{ flex: 1, zIndex: 1 }} />
                                        <RepeatButton icon={ChevronRight} action={() => adjustSlider('end', 1)} onFocusStart={() => engageFocus('end')} onFocusEnd={releaseFocus} />
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#555', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><MousePointer2 size={12} /> Maintenez les flèches pour défiler rapidement</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: '3rem', fontWeight: 900, opacity: 0.2, letterSpacing: '20px' }}>EN ATTENTE</div>
                    )}
                </div>
            </div>
        </div>
    </>
);
}