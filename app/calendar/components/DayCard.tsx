"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Activity } from "lucide-react"
import { CalendarActivity, CalendarDay, UserLoadout } from "../types"
import { SHOP_EFFECTS } from "../constants"
import {
  getTssColor, getStreakConfig, getSmartCardStyle, resolveCardClass, createParticles
} from "../utils"
import ActivityWeatherIcon from "../ActivityWeatherIcon"

interface DayCardProps {
    dayIndex?: number;
    dayNum: number;
    activities: CalendarActivity[];
    totalTSS: number;
    streakIndex: number;
    isToday: boolean;
    loadout: UserLoadout;
    flippingCells?: Set<number>;
    clickingCells?: Set<number>;
    onClick?: (e: React.MouseEvent, hasActivity: boolean) => void;
    isPreview?: boolean;
    overrideStyles?: React.CSSProperties;
    overrideClasses?: string;
    mockWeather?: any;
    forcedSmartStyle?: { class: string; label: string; variable?: any };
    showConnector?: boolean;
}

export default function DayCard({
    dayIndex = 0,
    dayNum,
    activities,
    totalTSS,
    streakIndex,
    isToday,
    loadout,
    flippingCells,
    clickingCells,
    onClick,
    isPreview = false,
    overrideStyles,
    overrideClasses,
    mockWeather,
    forcedSmartStyle,
    showConnector = false
}: DayCardProps) {
    
    const hasActivity = activities.length > 0;
    const color = getTssColor(totalTSS);
    
    // Détection Virtual (Zwift/Indoor) pour le fond hachuré par défaut
    const isVirtual = activities.some(a => a.type === "VirtualRide" || a.type === "IndoorCycling" || a.type === "E-Bike Ride");

    // 1. Analyse IA "Smart"
    let smartStyle = getSmartCardStyle(activities);
    if (isPreview && forcedSmartStyle) {
        smartStyle = forcedSmartStyle;
    }
    
    // 2. Récupération des OBJETS effets
    const frameEffect = SHOP_EFFECTS.find(e => e.id === loadout.FRAME);
    const hoverEffect = SHOP_EFFECTS.find(e => e.id === loadout.HOVER);
    const todayEffect = SHOP_EFFECTS.find(e => e.id === loadout.TODAY); 
    const clickEffect = SHOP_EFFECTS.find(e => e.id === loadout.INTERACTION);
    const ambianceEffect = loadout.AMBIANCE;

    // 3. Construction des styles via l'utilitaire
    const slotStyles = {
        frame: frameEffect?.cssClass,
        hover: hoverEffect?.cssClass,
        smart: (loadout.AMBIANCE === "smart_analysis") ? smartStyle?.class : null,
        today: todayEffect?.cssClass,
        ambiance: null 
    };

    let dynamicClasses = resolveCardClass(hasActivity, isToday, slotStyles);
    let innerBgClasses = ""; // Pour le fond clippé

    // GESTION SPECIALE KING (On sépare les couches)
    if (isToday && loadout.TODAY === "king_road") {
        // 1. Le parent gère la bordure et la couronne (qui dépasse)
        dynamicClasses += " today-king-container"; 
        // 2. L'enfant gère le fond noir et les rayons (qui sont coupés)
        innerBgClasses = "today-king-bg"; 
    }

    // GESTION SPECIALE SYNTHWAVE & PAVÉS (On met tout dans le fond clippé)
    if (hasActivity || isPreview) {
        if (ambianceEffect === "hell_north") innerBgClasses = "ambiance-paris-roubaix";
        if (ambianceEffect === "synthwave_grid") innerBgClasses = "ambiance-synthwave";

        // Pour les ambiances simples, on garde le comportement standard
        if (ambianceEffect === "night_ride") dynamicClasses += " ambiance-night";
        if (ambianceEffect === "velodrome") dynamicClasses += " ambiance-velodrome";
    }

    // --- ANIMATIONS ---
    const isFlipping = flippingCells?.has(dayIndex);
    const isClicking = clickingCells?.has(dayIndex);

    if (isFlipping) dynamicClasses += " flipping";
    if (isClicking && clickEffect?.cssClass) dynamicClasses += ` ${clickEffect.cssClass}`;

    if (isFlipping) {
        if (clickEffect?.id === "black_hole") dynamicClasses += " anim-blackhole";
        if (clickEffect?.id === "shatter") dynamicClasses += " anim-shatter";
    }
    
    if ((hasActivity || isPreview) && loadout.HOVER === "flashlight") dynamicClasses += " stealth-mode";
    if (overrideClasses) dynamicClasses += ` ${overrideClasses}`;

    // 4. Styles Inline du Background
    // Par défaut : Dégradé simple avec la couleur du TSS
    let backgroundStyle = (hasActivity || isPreview) 
        ? `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` 
        : "rgba(255, 255, 255, 0.02)";

    // Si Virtuel : Motif Hachuré (Rayures 45°) avec la couleur du TSS
    if (isVirtual && (hasActivity || isPreview)) {
        backgroundStyle = `repeating-linear-gradient(
            -45deg,
            ${color}25,
            ${color}15 30px,
            ${color}05 5px,
            ${color}05 10px
        )`;
    }

    const borderProps: React.CSSProperties = {
        borderColor: isToday ? "#00f3ff" : (hasActivity || isPreview) ? `${color}40` : "rgba(255,255,255,0.02)",
        borderWidth: '1px', 
        borderStyle: 'solid',
    };

    const finalStyle: React.CSSProperties = { 
        minHeight: isPreview ? '140px' : "110px",
        borderRadius: "8px",
        padding: "0.5rem",
        display: "flex", 
        flexDirection: "column",
        position: "relative",
        
        // 🔥 LE FIX EST ICI :
        // Si c'est le King, on autorise le dépassement (pour la couronne).
        // Sinon, on clip tout (pour que ce soit propre).
        overflow: (isToday && loadout.TODAY === "king_road") ? "visible" : "hidden",
        
        zIndex: isPreview ? 2 : 1,
        cursor: "pointer",
        transition: "transform 0.2s ease, border-color 0.2s ease",
        background: backgroundStyle, 
        ...borderProps, 
        ...overrideStyles
    };
    
    // Gère le calque interne pour les ambiances qui doivent être coupées (Rayons, Grilles)
    // On ajoute une div interne pour ça
    let innerLayerClass = "";
    if (isToday && loadout.TODAY === "king_road") innerLayerClass = "today-king-bg";
    if ((hasActivity || isPreview) && ambianceEffect === "synthwave_grid") innerLayerClass = "ambiance-synthwave"; 
    // Note: Pour synthwave, on l'applique à l'intérieur pour le clipping, mais on garde la classe externe pour la bordure si besoin

    if (loadout.AMBIANCE === "smart_analysis" && smartStyle?.variable) {
        Object.assign(finalStyle, smartStyle.variable);
    }

    // Fix Réacteur Today
    if (isToday && loadout.TODAY === "reactor_today") {
        finalStyle.background = 'transparent'; 
        finalStyle.borderColor = 'transparent';
        finalStyle.borderWidth = '0px';
    }

    // Pulse
    let pulseBpm: number | null = null;
    const isPulseEquipped = loadout.FRAME === "pulse";
    
    if ((hasActivity || isPreview) && isPulseEquipped) {
        const avgBpm = isPreview ? (mockWeather?.bpm || 140) : (activities[0]?.avg_heartrate || 0);
        if (avgBpm > 0) {
            pulseBpm = Math.round(avgBpm);
            const beatDuration = 60 / avgBpm;
            finalStyle.animationDuration = `${beatDuration}s`;
            // @ts-ignore
            finalStyle['--beat-duration'] = `${beatDuration}s`;
        } else {
            finalStyle.animationDuration = `1s`;
            // @ts-ignore
            finalStyle['--beat-duration'] = `1s`;
        }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (loadout.HOVER === "flashlight" && (hasActivity || isPreview)) {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
            e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        }
        const trailId = loadout.TRAIL;
        if (trailId && (hasActivity || isPreview) && Math.random() > 0.3) {
            const effect = SHOP_EFFECTS.find(ef => ef.id === trailId);
            createParticles(e, effect || null, "hover");
        }
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
         const target = e.currentTarget;
         if (loadout.HOVER !== "jelly_hover") target.style.transform = "translateY(-2px)";
         
         const effectId = loadout.HOVER;
         if ((hasActivity || isPreview) && effectId && effectId !== "flashlight") {
             const effect = SHOP_EFFECTS.find(ef => ef.id === effectId);
             createParticles(e, effect || null, "hover");
         }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        if (loadout.HOVER !== "jelly_hover") e.currentTarget.style.transform = "translateY(0)";
    };

    const streakConfig = getStreakConfig(streakIndex);
    const mainActivity = activities.length > 0 ? activities[0] : null;

    return (
        <div
            className={dynamicClasses}
            style={finalStyle}
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => onClick && onClick(e, hasActivity || isPreview)}
        >
            {/* CALQUE INTERNE POUR LES EFFETS QUI DOIVENT ETRE COUPÉS (Overflow Hidden) */}
            {innerLayerClass && (
                <div className={innerLayerClass} style={{position:'absolute', inset:0, borderRadius:'6px', zIndex:-1, pointerEvents:'none'}}></div>
            )}

            {!isPreview && showConnector && streakConfig && <div className={streakConfig.className} />}
            
            {!isPreview && streakConfig && (
                <div style={{ position: "absolute", top: "0px", right: "50px", fontSize: "1.2rem", zIndex: 20, filter: "drop-shadow(0 0 8px rgba(0,0,0,0.8))", animation: "bounce 1s infinite alternate" }}>
                    {streakConfig.icon}
                </div>
            )}

            <div style={{ fontSize: "0.85rem", fontWeight: isToday ? 900 : 600, color: isToday ? "#00f3ff" : (hasActivity || isPreview) ? "#fff" : "#666", marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", position:'relative', zIndex:5 }}>
                <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                    <span className={isToday ? "today-number" : ""}>{dayNum}</span>
                    {pulseBpm && (
                        <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 800, background: 'rgba(239,68,68,0.1)', padding:'0 3px', borderRadius:'4px', display: 'flex', alignItems: 'center', gap:'2px' }}>
                            {pulseBpm} <Activity size={8} />
                        </span>
                    )}
                </div>
                {(totalTSS > 0 || isPreview) && (
                    <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "#000", background: color, padding: "2px 4px", borderRadius: "4px", boxShadow: `0 0 5px ${color}` }}>
                        {Math.round(totalTSS)} TSS
                    </span>
                )}
            </div>

            {innerBgClasses && (
                <div className={innerBgClasses} style={{
                    position:'absolute', 
                    inset: 0, 
                    borderRadius: '7px', // Un poil moins que le parent (8px) pour pas dépasser de la bordure
                    overflow: 'hidden', // C'est lui qui coupe les rayons !
                    zIndex: -1, 
                    pointerEvents:'none'
                }}></div>
            )}

            <div style={{display:"flex", flexDirection:"column", gap:"2px", overflow:"hidden", flex:1, position:'relative', zIndex:5}}>
                {activities.map(act => (
                    isPreview ? (
                        <div key={act.id} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.65rem", color: "rgba(255,255,255,0.9)", marginTop: "3px" }}>
                            <div style={{width:"4px", height:"4px", borderRadius:"50%", background:color, boxShadow: '0 0 4px '+color}}/>
                            <b>{Math.round(act.distance_km)}km</b>
                            <span style={{opacity:0.8}}>{act.name}</span>
                        </div>
                    ) : (
                        <Link key={act.id} href={`/activities/${act.id}`} style={{textDecoration:"none"}}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.65rem", color: "rgba(255,255,255,0.8)", marginTop: "3px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "100%" }}>
                                <div style={{width:"4px", height:"4px", borderRadius:"50%", background:color}}/>
                                <b>{act.distance_km > 0 ? Math.round(act.distance_km)+'km' : Math.round(act.duration_s/60)+"min"}</b>
                                <span style={{opacity:0.7, overflow:"hidden", textOverflow:"ellipsis"}}>{act.name}</span>
                            </div>
                        </Link>
                    )
                ))}
                
                {isPreview && loadout.AMBIANCE === "smart_analysis" && smartStyle?.label && (
                    <div style={{
                        marginTop:'auto', textAlign:'center', fontSize:'0.7rem', fontWeight:800, 
                        color:'#fff', textShadow:'0 0 4px rgba(0,0,0,1)', background:'rgba(0,0,0,0.4)',
                        padding:'2px', borderRadius:'4px'
                    }}>
                        {smartStyle.label}
                    </div>
                )}
            </div>

            {(loadout.AMBIANCE === "weather_dynamic") && (
                <div style={{position:'absolute', bottom:4, left:4, zIndex: 10}}>
                    {isPreview && mockWeather ? (
                         <ActivityWeatherIcon 
                            activity={{ weather_code: mockWeather.code, temp_avg: mockWeather.avg, temp_min: mockWeather.min, temp_max: mockWeather.max }} 
                            indexDelay={0} active={true} isBigMode={true} 
                        />
                    ) : mainActivity ? (
                        <ActivityWeatherIcon activity={mainActivity} indexDelay={dayIndex} active={true} isBigMode={true} />
                    ) : null}
                </div>
            )}
        </div>
    );
}