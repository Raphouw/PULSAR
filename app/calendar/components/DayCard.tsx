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
    
    // 1. Analyse IA "Smart"
    let smartStyle = getSmartCardStyle(activities);
    if (isPreview && forcedSmartStyle) {
        smartStyle = forcedSmartStyle;
    }
    
    // 2. Récupération des OBJETS effets (pour avoir leurs cssClass)
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
        // On ne passe pas 'ambiance' ici car on va le forcer manuellement ci-dessous pour être sûr
        ambiance: null 
    };

    let dynamicClasses = resolveCardClass(hasActivity, isToday, slotStyles);
    
    // --- GESTION DES AMBIANCES (Force l'application si activité ou preview) ---
    if (hasActivity || isPreview) {
        if (ambianceEffect === "night_ride") dynamicClasses += " ambiance-night";
        if (ambianceEffect === "velodrome") dynamicClasses += " ambiance-velodrome";
    }

    // --- ANIMATIONS ---
    const isFlipping = flippingCells?.has(dayIndex);
    const isClicking = clickingCells?.has(dayIndex);

    if (isFlipping) dynamicClasses += " flipping";
    
    // 🔥 GESTION DES CLICS (Refactorisée)
    // Si on clique et que l'effet a une classe CSS définie (ex: anim-bell, anim-gear), on l'ajoute
    if (isClicking && clickEffect?.cssClass) {
        dynamicClasses += ` ${clickEffect.cssClass}`;
    }

    // Gestion des animations lourdes/spécifiques qui durent longtemps (Blackhole, Shatter)
    // Ces effets reposent souvent sur l'état 'isFlipping' pour leur durée
    if (isFlipping) {
        if (clickEffect?.id === "black_hole") dynamicClasses += " anim-blackhole";
        if (clickEffect?.id === "shatter") dynamicClasses += " anim-shatter";
    }
    
    // Stealth Mode (Flashlight)
    if ((hasActivity || isPreview) && loadout.HOVER === "flashlight") dynamicClasses += " stealth-mode";
    
    // Overrides externes (ex: depuis la boutique pour la preview)
    if (overrideClasses) dynamicClasses += ` ${overrideClasses}`;

    // 4. Styles Inline
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
        overflow: "visible", 
        zIndex: isPreview ? 2 : 1,
        cursor: "pointer",
        transition: "transform 0.2s ease, border-color 0.2s ease",
        background: (hasActivity || isPreview) ? `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` : "rgba(255, 255, 255, 0.02)",
        ...borderProps, 
        ...overrideStyles
    };

    // Injection variables Smart Analysis
    if (loadout.AMBIANCE === "smart_analysis" && smartStyle?.variable) {
        Object.assign(finalStyle, smartStyle.variable);
    }

    // 🔥 FIX CAS PARTICULIERS TODAY
    // Le "Réacteur" demande un fond transparent pour voir l'animation CSS derrière.
    if (isToday && loadout.TODAY === "reactor_today") {
        finalStyle.background = 'transparent'; 
        finalStyle.borderColor = 'transparent';
        finalStyle.borderWidth = '0px';
    }
    // Note: Maillot Jaune, Start Line, Gift, Snowglobe sont gérés par cssClass + !important dans le CSS

    // Pulse (Cardio)
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

    // Handlers Souris
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
            {!isPreview && showConnector && streakConfig && <div className={streakConfig.className} />}
            
            {!isPreview && streakConfig && (
                <div style={{ position: "absolute", top: "0px", right: "50px", fontSize: "1.2rem", zIndex: 20, filter: "drop-shadow(0 0 8px rgba(0,0,0,0.8))", animation: "bounce 1s infinite alternate" }}>
                    {streakConfig.icon}
                </div>
            )}

            <div style={{ fontSize: "0.85rem", fontWeight: isToday ? 900 : 600, color: isToday ? "#00f3ff" : (hasActivity || isPreview) ? "#fff" : "#666", marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", position:'relative', zIndex:5 }}>
                <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
                    {/* Ajout de la classe today-number pour ciblage CSS précis */}
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