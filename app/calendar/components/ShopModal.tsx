"use client"

import React, { useState, useEffect } from "react";
import { ShoppingBag, X, Sparkles, Check, Backpack, Trash2, MousePointerClick } from "lucide-react";
import { ShopData, ShopEffect, EffectSlot, CalendarActivity, UserLoadout } from "../types";
import { SHOP_EFFECTS } from "../constants";
import { createParticles } from "../utils"; 
import DayCard from "./DayCard"; 

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

const MOCK_WEATHER_CYCLE = [
    { code: 0, min: 18, max: 28, avg: 24, label: "Ensoleillé", bgClass: "sky-noon", bpm: 140 },
    { code: 63, min: 8, max: 13, avg: 11, label: "Pluvieux", bgClass: "sky-gray", bpm: 165 },
    { code: 71, min: -5, max: 2, avg: -1, label: "Neige", bgClass: "sky-dawn", bpm: 110 },
    { code: 95, min: 15, max: 22, avg: 19, label: "Orage", bgClass: "sky-storm", bpm: 180 }
];

// 🔥 NOUVEAU : Cycle pour le Tactical Visor
const MOCK_SMART_CYCLE = [
    { label: "INTENSITÉ 🔥", class: "smart-heat" },
    { label: "VITESSE ⚡", class: "smart-speed" },
    { label: "MONTAGNE ⛰️", class: "smart-climb", variable: { "--climb-h": "40%" } },
    { label: "MONTAGNE ⛰️", class: "smart-climb", variable: { "--climb-h": "60%" } },
    { label: "MONTAGNE ⛰️", class: "smart-climb", variable: { "--climb-h": "80%" } }
];

const MOCK_ACTIVITIES: CalendarActivity[] = [
    { id: 991, name: "Sortie SAS...", distance_km: 4, duration_s: 1200, tss: 10, start_time: "", elevation_gain_m: 50, avg_speed_kmh: 25, avg_heartrate: 0, type: "Ride", max_heartrate: 190, avg_power_w: 150 },
    { id: 992, name: "Étape du tour...", distance_km: 117, duration_s: 14400, tss: 250, start_time: "", elevation_gain_m: 2000, avg_speed_kmh: 28, avg_heartrate: 0, type: "Ride", max_heartrate: 190, avg_power_w: 220 },
    { id: 993, name: "Récupération", distance_km: 16, duration_s: 3600, tss: 40, start_time: "", elevation_gain_m: 100, avg_speed_kmh: 22, avg_heartrate: 0, type: "Ride", max_heartrate: 190, avg_power_w: 110 },
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
    
    useEffect(() => {
        const interval = setInterval(() => setPreviewCycle(prev => prev + 1), 3000); 
        return () => clearInterval(interval);
    }, []);

    const { ownedEffects, loadout } = shopData;
    const ownedSet = new Set(ownedEffects || []);
    const displayEffect = hoveredEffect || selectedEffect;

    const handlePreviewClick = (e: React.MouseEvent, hasActivity: boolean) => {
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

    // Cycles Variables
    const weatherStep = MOCK_WEATHER_CYCLE[previewCycle % MOCK_WEATHER_CYCLE.length];
    const smartStep = MOCK_SMART_CYCLE[previewCycle % MOCK_SMART_CYCLE.length];

    // Loadout Temporaire
    let previewLoadout: UserLoadout = { 
        FRAME: null, HOVER: null, TRAIL: null, INTERACTION: null, 
        AMBIANCE: null, TODAY: null, SPECIAL: null 
    };

    if (displayEffect) {
        previewLoadout[displayEffect.slot] = displayEffect.id;
    } else {
        previewLoadout = { ...loadout };
    }

    const isWeatherActive = previewLoadout.AMBIANCE === "weather_dynamic";
    // 🔥 Check si c'est le tactical visor
    const isSmartActive = previewLoadout.AMBIANCE === "smart_analysis";

    return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" style={{ maxWidth: '1100px', width:'95%', padding: '0', overflow: 'hidden', display:'flex', flexDirection:'column', background: '#121218', border: '1px solid #333' }} onClick={(e) => e.stopPropagation()}>
            
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

            <div className="shop-layout">
                <div className="shop-preview-panel">
                    <div className="preview-card-container">
                        {isWeatherActive && (
                            <div className={`weather-container-bg ${weatherStep.bgClass}`} />
                        )}
                        
                        <div style={{ width: '100%', maxWidth: '180px', margin: '0 auto', position:'relative', zIndex: 10 }}>
                            <DayCard 
                                dayNum={2}
                                activities={MOCK_ACTIVITIES}
                                totalTSS={435}
                                streakIndex={0}
                                isToday={displayEffect?.slot === "TODAY"}
                                loadout={previewLoadout}
                                isPreview={true}
                                mockWeather={weatherStep}
                                overrideClasses={animClass}
                                // 🔥 FIX : On passe le style forcé si l'effet est Smart Analysis
                                forcedSmartStyle={isSmartActive ? smartStep : undefined}
                                onClick={handlePreviewClick}
                            />
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.65rem', color: '#666', fontStyle: 'italic', zIndex: 5 }}>
                            {displayEffect?.slot === "INTERACTION" ? "Cliquez sur la carte pour tester !" : "Survolez pour voir l'effet"}
                        </div>
                    </div>

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