// Fichier : app/segments/segmentsClient.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search, ArrowUpRight, Mountain, Activity, TrendingUp, Layers, Plus, ArrowDown, ArrowUp, Tag, X, Filter, ChevronDown, Check } from 'lucide-react';
import { Segment } from './page'; 
import 'leaflet/dist/leaflet.css';

// Charge la carte dynamiquement
const GlobalSegmentsMap = dynamic(() => import('./GlobalSegmentsMap'), {
    ssr: false,
    loading: () => <div className="flex h-full w-full items-center justify-center bg-[#050505] text-gray-600 font-mono text-sm animate-pulse">INITIALISATION SYSTÈME...</div>
});

// --- EXTENSION TYPE ---


// --- TYPES UI ---
type SpecialTag = {
  label: string;
  color: string;
  textColor: string;
};

type SegmentAnalysis = {
  score: number; 
  sigma: number; 
  mainCat: SpecialTag;
  specialTags: SpecialTag[];
};

// --- HELPERS MATHS ---
function getDist(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
    const a = Math.sin(((lat2-lat1)*Math.PI/180)/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(((lon2-lon1)*Math.PI/180)/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- ALGO PULSAR INDEX ---
const calculatePulsarIndex = (segment: Segment): { index: number, sigma: number, density: number } => {
    const H = Math.max(1, segment.elevation_gain_m); 
    const L = Math.max(100, segment.distance_m); 
    const AvgP = Math.max(0, segment.average_grade); 
    const density = H / (L / 1000); 

    let maxAlt = -Infinity;
    let sigma = 0;
    let sigmaGrades: number[] = []; 

    if (segment.polyline && Array.isArray(segment.polyline) && segment.polyline.length > 0) {
        const hasZ = segment.polyline[0].length >= 3;
        const polyline = hasZ ? segment.polyline : segment.polyline.map((p: number[]) => [p[0], p[1], 0]);

        maxAlt = polyline.reduce((max: number, p: number[]) => Math.max(max, p[2]), -Infinity);

        if (polyline.length > 5) {
            let distAccSigma = 0;
            let lastEleSigma = polyline[0][2];

            for (let i = 1; i < polyline.length; i++) {
                const p = polyline[i];
                const prevP = polyline[i-1];
                const stepDist = getDist(prevP[0], prevP[1], p[0], p[1]);
                distAccSigma += stepDist;

                if (distAccSigma >= 25) { 
                    const eleDiff = p[2] - lastEleSigma;
                    if (distAccSigma > 0) {
                        const grade = (eleDiff / distAccSigma) * 100;
                        sigmaGrades.push(grade);
                    }
                    distAccSigma = 0; lastEleSigma = p[2];
                }
            }
        }
        if (sigmaGrades.length > 1) {
            const mean = sigmaGrades.reduce((a, b) => a + b, 0) / sigmaGrades.length;
            const variance = sigmaGrades.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sigmaGrades.length;
            sigma = Math.sqrt(variance);
        }
    }
    
    const Alt = (maxAlt > -Infinity && maxAlt > 0) ? maxAlt : H;
    if (sigma === 0) { if (AvgP > 3) sigma = 1.2; else sigma = 0.5; }

    const Base = (20 * (Math.pow(H, 2) / L)) + (3 * H);
    const Oxygen = 1 + (Alt / 8000);
    const Pivot = 1 + ((sigma * (AvgP - 8)) / 50);
    const rawScore = Base * Oxygen * Pivot;
    
    return { index: Math.round(rawScore), sigma, density };
};

const analyzeSegment = (segment: Segment): SegmentAnalysis => {
    const { index, sigma, density } = calculatePulsarIndex(segment);
    const name = segment.name.toLowerCase();
    const catStr = segment.category?.toLowerCase() || '';

    let mainCat: SpecialTag = { label: 'PLAT', color: '#3b82f6', textColor:'#fff' };
    
    if (segment.distance_m >= 50000 && density < 30) mainCat = { label: 'BOUCLE MYTHIQUE', color: '#00f3ff', textColor: '#000' };
    else if (index > 7500) mainCat = { label: 'ICONIC', color: '#000', textColor: '#d04fd7' }; 
    else if (index > 6500) mainCat = { label: 'HC', color: '#ef4444', textColor: '#fff' }; 
    else if (index > 5000) mainCat = { label: 'CAT 1', color: '#f97316', textColor: '#fff' }; 
    else if (index > 3000) mainCat = { label: 'CAT 2', color: '#eab308', textColor: '#000' }; 
    else if (index > 1500) mainCat = { label: 'CAT 3', color: '#84cc16', textColor: '#000' }; 
    else if (index > 1000) mainCat = { label: 'CAT 4', color: '#10b981', textColor: '#fff' }; 
    else if (index > 500) mainCat = { label: 'COTE REGION', color: '#0077B6', textColor:'#fff' }; 

    const specialTags: SpecialTag[] = [];
    if (name.includes('pavé') || name.includes('cobble') || catStr.includes('pavé')) specialTags.push({ label: 'PAVÉ *****', color: '#fbbf24', textColor: '#000' });
    if (name.includes('gravel') || name.includes('chemin') || catStr.includes('gravel')) specialTags.push({ label: 'GRAVEL', color: '#a8a29e', textColor: '#000' });
    if (segment.tags && Array.isArray(segment.tags)) {
        segment.tags.forEach(tag => {
            const isBright = ['#00f3ff', '#6AA84F', '#FF9900'].includes(tag.color);
            specialTags.push({ label: tag.label, color: tag.color, textColor: isBright ? '#000' : '#fff' });
        });
    }

    return { score: index, sigma, mainCat, specialTags };
};

// --- COMPOSANTS UI ---

const Badge = ({ data, border = false }: { data: any, border?: boolean }) => (
    <span style={{ 
        background: data.color, color: data.textColor, padding: '3px 8px', borderRadius: '6px', 
        fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.5px', 
        border: border && data.label === 'ICONIC' ? '1px solid #d04fd7' : '1px solid transparent', 
        boxShadow: data.label === 'ICONIC' ? '0 0 15px rgba(208, 79, 215, 0.4)' : 'none', 
        whiteSpace: 'nowrap', display: 'inline-block'
    }}>
        {data.label}
    </span>
);

// Pillule de Catégorie (Simple Toggle)
const FilterPill = ({ label, active, onClick, color }: any) => (
    <button 
        onClick={onClick} 
        style={{ 
            background: active ? color : 'rgba(255,255,255,0.05)', 
            border: active ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)', 
            color: active ? (['PAVÉ','GRAVEL','ICONIC','CAT 2','CAT 3', 'BOUCLE MYTHIQUE'].includes(label) ? '#000' : '#fff') : '#888', 
            padding: '6px 14px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700, 
            cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', whiteSpace: 'nowrap',
            boxShadow: active ? `0 0 15px ${color}40` : 'none'
        }}
        className="hover:bg-white/10"
    >
        {label}
    </button>
);

// 🔥 NOUVEAU : MENU DÉROULANT POUR LES TAGS
const TagsFilterMenu = ({ availableTags, selectedTags, onToggle }: { availableTags: string[], selectedTags: string[], onToggle: (t: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div style={{ position: 'relative' }} ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    background: isOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                    padding: '8px 12px', color: '#fff', fontSize: '0.7rem', fontWeight: 700, 
                    display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s'
                }}
                className="hover:bg-white/10"
            >
                <Filter size={12} color="#d04fd7" /> 
                FILTRER PAR TAGS 
                <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div style={{ 
                    position: 'absolute', top: '110%', left: 0, width: '220px', maxHeight: '250px', overflowY: 'auto',
                    background: '#141419', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)', zIndex: 1000, padding: '4px'
                }} className="no-scrollbar">
                    {availableTags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                            <div 
                                key={tag} 
                                onClick={() => onToggle(tag)}
                                style={{ 
                                    padding: '8px 12px', fontSize: '0.75rem', fontWeight: 500, color: isSelected ? '#fff' : '#aaa',
                                    cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: isSelected ? 'rgba(208, 79, 215, 0.15)' : 'transparent'
                                }}
                                className="hover:bg-white/5"
                            >
                                {tag}
                                {isSelected && <Check size={12} color="#d04fd7" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Chip pour tag sélectionné (Amovible)
const ActiveTagChip = ({ label, onRemove }: { label: string, onRemove: () => void }) => (
    <div style={{ 
        display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '16px', 
        background: 'rgba(208, 79, 215, 0.15)', border: '1px solid rgba(208, 79, 215, 0.3)', 
        color: '#d04fd7', fontSize: '0.65rem', fontWeight: 700 
    }}>
        {label}
        <div onClick={onRemove} style={{ cursor: 'pointer', display: 'flex' }} className="hover:text-white"><X size={10} /></div>
    </div>
);


export default function SegmentsClient({ initialSegments, userId }: { initialSegments: Segment[], userId: string }) {
    const router = useRouter();
    const isAdmin = userId === '1' || userId === '2';
    const ITEMS_PER_PAGE = 50;

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCats, setSelectedCats] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    
    const [sortKey, setSortKey] = useState<'score' | 'distance' | 'grade' | 'elevation'>('score');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
    const [isListHovering, setIsListHovering] = useState(false);
    const [expandedTagsId, setExpandedTagsId] = useState<number | null>(null);

    const scrollbarStyle = `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;

    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        initialSegments.forEach(s => {
            if (s.tags && Array.isArray(s.tags)) s.tags.forEach(t => tags.add(t.label));
            if (s.name.toLowerCase().includes('pavé') || s.category?.toLowerCase().includes('pavé')) tags.add('PAVÉ *****');
            if (s.name.toLowerCase().includes('gravel') || s.category?.toLowerCase().includes('gravel')) tags.add('GRAVEL');
        });
        return Array.from(tags);
    }, [initialSegments]);

    useEffect(() => {
        if (hoveredId && !isListHovering) { 
            const element = document.getElementById(`segment-card-${hoveredId}`);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [hoveredId, isListHovering]);

    const processedSegments = useMemo(() => {
        let data = initialSegments.map(s => ({ ...s, analysis: analyzeSegment(s) }));
        if (searchQuery) data = data.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (selectedCats.length > 0) data = data.filter(s => selectedCats.includes(s.analysis.mainCat.label));
        if (selectedTags.length > 0) data = data.filter(s => s.analysis.specialTags.some(t => selectedTags.includes(t.label)));

        data.sort((a, b) => {
            let valA = 0, valB = 0;
            if (sortKey === 'score') { valA = a.analysis.score; valB = b.analysis.score; }
            if (sortKey === 'distance') { valA = a.distance_m; valB = b.distance_m; }
            if (sortKey === 'grade') { valA = a.average_grade; valB = b.average_grade; }
            if (sortKey === 'elevation') { valA = a.elevation_gain_m; valB = b.elevation_gain_m; } 
            return sortDir === 'asc' ? valA - valB : valB - valA; 
        });
        return data;
    }, [initialSegments, searchQuery, selectedCats, selectedTags, sortKey, sortDir]); 

    const paginatedSegments = processedSegments.slice(0, page * ITEMS_PER_PAGE);
    const hasMore = processedSegments.length > paginatedSegments.length;

    const toggleCat = (cat: string) => { setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]); setPage(1); };
    const toggleTagFilter = (tag: string) => { setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]); setPage(1); };
    const handleSort = (key: 'score' | 'distance' | 'grade' | 'elevation') => { if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('desc'); } };
    const handleSelect = (segment: Segment | null) => { setSelectedSegment(segment); if (!segment) setHoveredId(null); };

    return (
        <div style={{ height: '88vh', width: '100%', display: 'flex', overflow: 'hidden', background: '#000', color: '#F1F1F1', fontFamily: '"Inter", sans-serif' }}>
            <style>{scrollbarStyle}</style>
            
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <GlobalSegmentsMap 
                    segments={paginatedSegments} hoveredId={hoveredId} selectedId={selectedSegment?.id || null}
                    zoomTargetId={isListHovering ? hoveredId : (selectedSegment?.id || null)}
                    onSegmentClick={handleSelect} onBackgroundClick={() => handleSelect(null)} onSegmentHover={(id) => { setHoveredId(id); setIsListHovering(false); }}
                />
            </div>

            <div style={{ 
                position: 'absolute', top: '20px', left: '240px', bottom: '20px', width: '420px', 
                background: 'rgba(10, 10, 12, 0.80)', backdropFilter: 'blur(25px)', 
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', 
                display: 'flex', flexDirection: 'column', zIndex: 20, 
                boxShadow: '0 20px 50px rgba(0,0,0,0.7)', overflow: 'hidden' 
            }}>
                
                <div style={{ padding: '1.2rem 1.2rem 0.5rem 1.2rem', background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ background: '#d04fd7', padding: '6px', borderRadius: '8px', display:'flex', boxShadow:'0 0 15px rgba(208,79,215,0.4)' }}>
                            <Layers color="#fff" size={16} />
                        </div>
                        <h1 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.5px', color: '#fff', flex: 1 }}>CATALOGUE</h1>
                        {isAdmin && (
                            <button onClick={() => router.push('/segments/creator')} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', color: '#fff', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', border: 'none', display:'flex', gap:'4px', alignItems:'center', transition: 'all 0.2s' }} className="hover:bg-white/20">
                                <Plus size={14}/>
                            </button>
                        )}
                    </div>

                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <Search size={14} color="#666" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '90%', padding: '10px 10px 10px 36px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none', fontSize: '0.8rem', transition:'all 0.2s' }} className="focus:border-[#d04fd7]/50 focus:bg-black/50"/>
                    </div>

                    {/* LIGNE 1 : CATÉGORIES */}
                    <div className="no-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '4px', scrollBehavior: 'smooth' }}>
                        {['ICONIC', 'HC', 'CAT 1', 'CAT 2', 'CAT 3', 'CAT 4', 'COTE REGION', 'PLAT'].map(c => ( 
                            <FilterPill key={c} label={c} color={c === 'ICONIC' ? '#d04fd7' : c === 'HC' ? '#ef4444' : c === 'CAT 1' ? '#f97316' : c === 'CAT 2' ? '#eab308' : c === 'CAT 3' ? '#84cc16' : c === 'CAT 4' ? '#10b981' : c === 'COTE REGION' ? '#0077B6' : '#3b82f6'} active={selectedCats.includes(c)} onClick={() => toggleCat(c)} /> 
                        ))}
                    </div>

                    {/* 🔥 LIGNE 2 : TAGS (MENU + CHIPS) */}
                    {availableTags.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                            {/* Menu Déroulant */}
                            <TagsFilterMenu availableTags={availableTags} selectedTags={selectedTags} onToggle={toggleTagFilter} />
                            
                            {/* Chips Sélectionnés */}
                            {selectedTags.map(tag => (
                                <ActiveTagChip key={tag} label={tag} onRemove={() => toggleTagFilter(tag)} />
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: '0.6rem', color: '#666', fontWeight: 700, letterSpacing: '1px' }}>{processedSegments.length} RÉSULTATS</div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.6rem', fontWeight: 700 }}>
                        <span onClick={() => handleSort('score')} style={{ cursor: 'pointer', color: sortKey === 'score' ? '#d04fd7' : '#666', display:'flex', alignItems:'center', gap:'3px', transition:'color 0.2s' }}>
                            DIFFICULTÉ {sortKey === 'score' && (sortDir === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                        </span>
                        <span onClick={() => handleSort('distance')} style={{ cursor: 'pointer', color: sortKey === 'distance' ? '#fff' : '#666', display:'flex', alignItems:'center', gap:'3px', transition:'color 0.2s' }}>
                            KM {sortKey === 'distance' && (sortDir === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                        </span>
                        <span onClick={() => handleSort('elevation')} style={{ cursor: 'pointer', color: sortKey === 'elevation' ? '#10b981' : '#666', display:'flex', alignItems:'center', gap:'3px', transition:'color 0.2s' }}>
                            D+ {sortKey === 'elevation' && (sortDir === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                        </span>
                        <span onClick={() => handleSort('grade')} style={{ cursor: 'pointer', color: sortKey === 'grade' ? '#f59e0b' : '#666', display:'flex', alignItems:'center', gap:'3px', transition:'color 0.2s' }}>
                            % {sortKey === 'grade' && (sortDir === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                        </span>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="no-scrollbar">
                    {paginatedSegments.map((s, i) => {
                        const analysis = s.analysis || analyzeSegment(s);
                        const isSelected = selectedSegment?.id === s.id;
                        const isHovered = hoveredId === s.id;
                        const tagsToShow = analysis.specialTags;
                        const hasMoreTags = tagsToShow.length > 1;
                        const isTagsExpanded = expandedTagsId === s.id;

                        return (
                            <div 
                                key={s.id} 
                                id={`segment-card-${s.id}`}
                                onMouseEnter={() => { setHoveredId(s.id); setIsListHovering(true); }} 
                                onMouseLeave={() => { setHoveredId(null); setIsListHovering(false); }} 
                                onClick={() => handleSelect(s)} 
                                style={{ 
                                    padding: '1.2rem', 
                                    borderBottom: '1px solid rgba(255,255,255,0.03)', 
                                    background: isSelected ? 'rgba(0, 243, 255, 0.08)' : (isHovered ? 'rgba(160, 22, 162, 0.23)' : 'transparent'), 
                                    cursor: 'pointer', 
                                    transition: 'all 0.2s', 
                                    borderLeft: isSelected ? '3px solid #00f3ff' : '3px solid transparent',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#333', fontFamily: 'monospace', width: '24px', textAlign: 'center', opacity: 0.5 }}>{(i+1).toString().padStart(2,'0')}</div>
                                        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', position:'relative' }}>
                                        <Badge data={analysis.mainCat} border />
                                        {tagsToShow.length > 0 && <Badge data={tagsToShow[0]} />}
                                        {hasMoreTags && (
                                            <div onClick={(e) => { e.stopPropagation(); setExpandedTagsId(isTagsExpanded ? null : s.id); }}
                                                style={{ background: 'rgba(232, 5, 5, 0.1)', color: '#fff', padding: '2px 5px', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 800, cursor: 'pointer', border:'1px solid rgba(255,255,255,0.1)' }}>
                                                +{tagsToShow.length - 1}
                                            </div>
                                        )}
                                        {isTagsExpanded && (
                                            <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: '0', zIndex: 100, marginTop: '8px', background: 'rgba(15, 15, 20, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px', backdropFilter: 'blur(10px)' }}>
                                                {tagsToShow.map((t, idx) => <Badge key={idx} data={t} />)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '30px', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: '1.2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#888', fontWeight: 500 }}>
                                            <TrendingUp size={10} color="#00f3ff" /> {(s.distance_m/1000).toFixed(1)} <span style={{fontSize:'0.6rem'}}>km</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#888', fontWeight: 500 }}>
                                            <Mountain size={10} color="#10b981" /> {Math.round(s.elevation_gain_m)} <span style={{fontSize:'0.6rem'}}>m</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#fff', fontWeight: 700 }}>
                                            <Activity size={10} color={s.average_grade > 0 ? '#f59e0b' : '#3b82f6'} /> {s.average_grade.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.9rem', color: analysis.score > 5000 ? '#ef4444' : '#fff', fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>{analysis.score}</div>
                                            <div style={{ fontSize: '0.5rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>IDX</div>
                                        </div>
                                        <div onClick={(e) => { e.stopPropagation(); router.push(`/segments/${s.id}`); }} style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(208, 79, 215, 0.1)', border: '1px solid rgba(208, 79, 215, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d04fd7', cursor: 'pointer', transition: 'all 0.2s' }} className="hover:bg-pink-500/20 hover:scale-105">
                                            <ArrowUpRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {hasMore && <button onClick={() => setPage(p => p + 1)} style={{ width: '100%', padding: '1.5rem', color: '#666', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Charger plus</button>}
                </div>
            </div>
        </div>
    );
}