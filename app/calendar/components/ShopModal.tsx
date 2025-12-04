"use client"

import React, { useState, useRef, useEffect } from "react";
import { ShoppingBag, X, Sparkles, Check, Backpack, Trash2, MousePointerClick, Activity } from "lucide-react";
import { ShopData, ShopEffect, EffectSlot } from "../types";
import { SHOP_EFFECTS } from "../constants";
import ActivityWeatherIcon from "../ActivityWeatherIcon";
import { createParticles } from "../calendarClient"; 

type ShopTab = { id: EffectSlot, label: string, icon: string }

const SHOP_TABS: ShopTab[] = [
    { id: 'FRAME', label: 'Cadres', icon: '🖼️' },
    { id: 'HOVER', label: 'Survol', icon: '✨' },
    { id: 'TRAIL', label: 'Trainée', icon: '☄️' },
    { id: 'INTERACTION', label: 'Clics', icon: '💥' },
    { id: 'AMBIANCE', label: 'Ambiance', icon: '🌤️' },
    { id: 'TODAY', label: 'Case du jour', icon: '📅' },
    { id: 'SPECIAL', label: 'Spécial', icon: '🎁' },
];

// Données Mock Météo COMPLÈTES (Avec Températures)
const MOCK_WEATHER_CYCLE = [
    { code: 0, min: 18, max: 28, avg: 24, label: "Ensoleillé", bgClass: "sky-noon" },
    { code: 63, min: 8, max: 13, avg: 11, label: "Pluvieux", bgClass: "sky-gray" },
    { code: 71, min: -5, max: 2, avg: -1, label: "Neige", bgClass: "sky-dawn" },
    { code: 95, min: 15, max: 22, avg: 19, label: "Orage", bgClass: "sky-storm" }
];

// Données Mock Visor
const MOCK_VISOR_CYCLE = [
    { class: 'smart-heat', label: 'INTENSITÉ 🔥' },
    { class: 'smart-speed', label: 'VITESSE ⚡' },
    // On force une hauteur de montagne visible
    { class: 'smart-climb', label: 'MONTAGNE ⛰️', style: { "--climb-h": "50%" } } 
];

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    shopData: ShopData;
    currentBalance: number;
    onPurchase: (effect: ShopEffect) => void;
    onToggleEffect: (effect: ShopEffect) => void;
    onUnequipAll: () => void;
}

export default function ShopModal({
    isOpen, onClose, shopData, currentBalance, onPurchase, onToggleEffect, onUnequipAll
}: ShopModalProps) {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState<EffectSlot>("FRAME");
    const [selectedEffect, setSelectedEffect] = useState<ShopEffect | null>(null);
    const [hoveredEffect, setHoveredEffect] = useState<ShopEffect | null>(null);
    
    const [previewCycle, setPreviewCycle] = useState(0);
    const [animClass, setAnimClass] = useState<string>(""); 
    const previewCardRef = useRef<HTMLDivElement>(null);

    const { ownedEffects, loadout } = shopData;
    const ownedSet = new Set(ownedEffects || []);
    const displayEffect = hoveredEffect || selectedEffect;

    // Cycle 3 secondes
    useEffect(() => {
        if (!displayEffect) return;
        const interval = setInterval(() => setPreviewCycle(prev => prev + 1), 3000); 
        return () => clearInterval(interval);
    }, [displayEffect]);

    // Handlers interaction preview
    const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!displayEffect) return;
        if (displayEffect.id === "flashlight") {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
            e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        }
        if (displayEffect.slot === "TRAIL" && Math.random() > 0.3) {
            createParticles(e, displayEffect, "hover");
        }
    };

    const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!displayEffect) return;
        if (displayEffect.slot === "INTERACTION") {
            createParticles(e, displayEffect, "flip");
            let cssAnim = displayEffect.id === "shockwave_click" ? "anim-active" : 
                          (displayEffect.cssClass || "flipping");
            
            if (displayEffect.id === "black_hole") cssAnim = "anim-blackhole";
            if (displayEffect.id === "shatter") cssAnim = "anim-shatter";

            setAnimClass(cssAnim);
            const duration = displayEffect.id === "black_hole" ? 4000 : 600;
            setTimeout(() => setAnimClass(""), duration);
        }
    };

    // --- VARIABLES DE CYCLE ---
    const weatherStep = MOCK_WEATHER_CYCLE[previewCycle % MOCK_WEATHER_CYCLE.length];
    const visorStep = MOCK_VISOR_CYCLE[previewCycle % MOCK_VISOR_CYCLE.length];
    
    const isWeatherActive = displayEffect?.id === "weather_dynamic";

    // --- RENDU CARTE ---
    const renderPreviewCard = () => {
        const effect = displayEffect;
        
        // Flags
        const isReactor = effect?.id === "reactor_today";
        const isSmart = effect?.id === "smart_analysis";
        const isFlashlight = effect?.id === "flashlight";
        const isPulse = effect?.id === "pulse";
        const isJelly = effect?.id === "jelly_hover";
        
        const isNeon = effect?.slot === "FRAME";
        const isHover = effect?.slot === "HOVER";

        // Styles Base
        let classes = `day-cell`;
        let style: React.CSSProperties = { 
            width: '100%', maxWidth: '180px', minHeight: '140px', 
            position: 'relative', display: 'flex', flexDirection: 'column', padding: '0.5rem',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius:'8px',
            margin: '0 auto', cursor: 'pointer', userSelect: 'none', overflow: 'hidden',
            zIndex: 2 // Devant le fond météo du container
        };

        if (effect?.cssClass && (isNeon || isHover)) classes += ` ${effect.cssClass}`;
        if (isFlashlight) classes += ` stealth-mode`;
        if (animClass) classes += ` ${animClass}`;

        // Logique spécifique
        if (isWeatherActive) {
            style.background = "rgba(0,0,0,0.3)"; // Légèrement transparent pour voir le fond
            style.backdropFilter = "blur(2px)";
        }

        let smartLabel = "";
        if (isSmart) {
            classes += ` ${visorStep.class}`;
            if (visorStep.style) Object.assign(style, visorStep.style);
            smartLabel = visorStep.label;
        }

        if (isReactor) {
            classes += " today-reactor";
            style.background = "transparent"; style.border = "none";
        }

        let bpm = 0;
        if (isPulse) {
            const bpms = [60, 110, 165, 85];
            bpm = bpms[previewCycle % bpms.length];
            style.animationDuration = `${60 / bpm}s`;
        }

        // Styles Internes
        const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.65rem", color: "rgba(255,255,255,0.9)", marginTop: "3px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "100%", zIndex: 5, textShadow: '0 1px 2px rgba(0,0,0,0.5)' };
        const dotStyle = (color: string) => ({ width:"4px", height:"4px", borderRadius:"50%", background:color, boxShadow: '0 0 4px '+color });

        return (
            <div 
                ref={previewCardRef} className={classes} style={style}
                onMouseMove={handlePreviewMouseMove} onClick={handlePreviewClick}
                onMouseEnter={(e) => !isJelly && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => !isJelly && (e.currentTarget.style.transform = "translateY(0)")}
            >
                {/* HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', position:'relative', zIndex:5 }}>
                    <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>2</span>
                        {isPulse && (
                            <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 800, background: 'rgba(0,0,0,0.5)', padding:'0 3px', borderRadius:'4px', display: 'flex', alignItems: 'center', gap:'2px' }}>
                                {bpm} <Activity size={8} />
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "#000", background: "#d04fd7", padding: "2px 4px", borderRadius: "4px", boxShadow: `0 0 5px #d04fd7` }}>435</span>
                </div>
                
                {/* CONTENU ACTIVITÉS (Toujours visible et devant la montagne) */}
                <div style={{display:"flex", flexDirection:"column", gap:"2px", overflow:"hidden", flex:1, position:'relative', zIndex:5}}>
                    <div style={rowStyle}><div style={dotStyle("#d04fd7")} /><b>4km</b><span style={{opacity:0.8}}>Sortie SAS...</span></div>
                    <div style={rowStyle}><div style={dotStyle("#d04fd7")} /><b>117km</b><span style={{opacity:0.8}}>Étape du tour...</span></div>
                    <div style={rowStyle}><div style={dotStyle("#d04fd7")} /><b>16km</b><span style={{opacity:0.8}}>Récupération</span></div>
                    
                    {/* Label Smart Analysis en bas si actif */}
                    {isSmart && (
                        <div style={{
                            marginTop:'auto', textAlign:'center', fontSize:'0.7rem', fontWeight:800, 
                            color:'#fff', textShadow:'0 0 4px rgba(0,0,0,1)', background:'rgba(0,0,0,0.4)',
                            padding:'2px', borderRadius:'4px'
                        }}>
                            {smartLabel}
                        </div>
                    )}
                </div>

                {/* ICONE MÉTÉO (Simulation ActivityWeatherIcon) */}
                {isWeatherActive && (
                    <div style={{position:'absolute', bottom:4, left:4, zIndex: 10}}>
                        <ActivityWeatherIcon 
                            activity={{ 
                                weather_code: weatherStep.code, 
                                temp_avg: weatherStep.avg,
                                temp_min: weatherStep.min,
                                temp_max: weatherStep.max 
                            }} 
                            indexDelay={0} active={true} isBigMode={true} 
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" style={{ maxWidth: '1100px', width:'95%', padding: '0', overflow: 'hidden', display:'flex', flexDirection:'column', background: '#121218', border: '1px solid #333' }} onClick={(e) => e.stopPropagation()}>
            
            {/* HEADER */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fff", display: "flex", gap: "0.8rem", alignItems: 'center', margin: 0, letterSpacing:'-1px' }}>
                        <ShoppingBag size={28} color="#d04fd7" /> BOUTIQUE
                    </h2>
                    <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.8rem', fontWeight: 600 }}>PERSONNALISEZ VOTRE EXPÉRIENCE</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: "0.7rem", color: "#888", fontWeight: 700, textTransform: 'uppercase' }}>Solde Disponible</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fff", display: 'flex', alignItems: 'center', gap: '0.5rem', lineHeight: 1 }}>
                            {currentBalance.toLocaleString()} <Sparkles size={20} color="#ffd700" fill="#ffd700" />
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px", width: "40px", height: "40px", cursor:"pointer", display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s' }}>
                        <X size={20}/>
                    </button>
                </div>
            </div>

            {/* LAYOUT */}
            <div className="shop-layout">
                
                {/* 1. PANNEAU GAUCHE */}
                <div className="shop-preview-panel">
                    
                    {/* ZONE DE PREVIEW + FOND MÉTÉO */}
                    <div className="preview-card-container">
                        {/* FOND MÉTÉO (Container Level) */}
                        {isWeatherActive && (
                            <div className={`weather-container-bg ${weatherStep.bgClass}`} />
                        )}
                        
                        {renderPreviewCard()}
                        
                        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.65rem', color: '#666', fontStyle: 'italic', zIndex: 5 }}>
                            {displayEffect?.slot === "INTERACTION" ? "Cliquez sur la carte pour tester !" : "Survolez pour voir l'effet"}
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ minHeight: '140px', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', justifyContent:'space-between', flexShrink: 0 }}>
                        {selectedEffect ? (
                            <>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>{selectedEffect.preview}</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{selectedEffect.name}</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: '#aaa', lineHeight: '1.4', margin: 0 }}>{selectedEffect.description}</p>
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    {ownedSet.has(selectedEffect.id) ? (
                                        <button onClick={() => onToggleEffect(selectedEffect)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: loadout[selectedEffect.slot] === selectedEffect.id ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                                            {loadout[selectedEffect.slot] === selectedEffect.id ? "RETIRER" : "ÉQUIPER"}
                                        </button>
                                    ) : (
                                        <button onClick={() => onPurchase(selectedEffect)} disabled={currentBalance < selectedEffect.price} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: currentBalance >= selectedEffect.price ? 'linear-gradient(90deg, #d04fd7, #8b5cf6)' : '#333', color: currentBalance >= selectedEffect.price ? '#fff' : '#666', fontWeight: 800, cursor: currentBalance >= selectedEffect.price ? 'pointer' : 'not-allowed', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                                            ACHETER ({selectedEffect.price.toLocaleString()})
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.8rem', fontStyle: 'italic', flexDirection:'column', gap:'10px' }}>
                                <MousePointerClick size={24} />
                                Sélectionnez un item
                            </div>
                        )}
                    </div>

                    {/* Inventaire */}
                    <div className="loadout-container">
                        <div className="loadout-header">
                            <div className="loadout-title"><Backpack size={12}/> COSMÉTIQUES</div>
                            <button onClick={onUnequipAll} className="unequip-btn"><Trash2 size={10} /> Tout retirer</button>
                        </div>
                        <div className="inventory-bar">
                            {SHOP_TABS.map(tab => {
                                const activeId = loadout[tab.id];
                                const activeItem = SHOP_EFFECTS.find(e => e.id === activeId);
                                return (
                                    <div key={tab.id} className={`inventory-slot ${activeId ? 'equipped' : ''}`} data-tooltip={activeItem ? activeItem.name : tab.label} onClick={() => setActiveTab(tab.id)}>
                                        {activeItem ? <span>{activeItem.preview}</span> : <span className="slot-icon" style={{opacity:0.3}}>{tab.icon}</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* 2. PANNEAU DROITE */}
                <div className="shop-catalog-panel" style={{ padding: '1.5rem', background: '#121218' }}>
                    <div className="shop-tabs-container">
                        {SHOP_TABS.map(tab => (
                            <button key={tab.id} className={`shop-tab-modern ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
                                <span>{tab.icon}</span> {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="shop-items-grid">
                        {(() => {
                            const items = SHOP_EFFECTS.filter(e => e.slot === activeTab);
                            if (items.length === 0) {
                                return (
                                    <div className="empty-shop-state">
                                        <Sparkles size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                        <p>Rien à voir ici... pour le moment.</p>
                                        <span style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>Revenez lors d'événements spéciaux.</span>
                                    </div>
                                );
                            }
                            return items.map((effect) => {
                                const owned = ownedSet.has(effect.id)
                                const equipped = loadout[effect.slot] === effect.id;
                                const isSelected = selectedEffect?.id === effect.id;
                                return (
                                    <div key={effect.id} className={`shop-item-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}`} style={{ border: isSelected ? '2px solid #fff' : undefined, transform: isSelected ? 'scale(1.02)' : undefined }} onMouseEnter={() => setHoveredEffect(effect)} onMouseLeave={() => setHoveredEffect(null)} onClick={() => setSelectedEffect(effect)}>
                                        {equipped && <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#d04fd7', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', zIndex: 2 }}>ÉQUIPÉ</div>}
                                        <div className="shop-item-preview-icon">{effect.preview}</div>
                                        <div className="shop-item-name">{effect.name}</div>
                                        {owned ? (
                                            <div style={{ marginTop: 'auto', fontSize: '0.7rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> ACQUIS</div>
                                        ) : (
                                            <div className="shop-item-price">{effect.price.toLocaleString()} TSS</div>
                                        )}
                                    </div>
                                )
                            });
                        })()}
                    </div>
                </div>
            </div>
          </div>
        </div>
    );
}