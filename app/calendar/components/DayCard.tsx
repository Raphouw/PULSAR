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
    
    // Détection Virtual (Zwift/Indoor)
    const isVirtual = activities.some(a => a.type === "VirtualRide" || a.type === "IndoorCycling" || a.type === "E-Bike Ride");

    // =========================================================================
    // 🔥 LOGIQUE DE PRIORITÉ ABSOLUE (LE FIX EST ICI)
    // =========================================================================
    
    // 1. Est-ce qu'on a un effet "TODAY" actif sur cette case ?
    const activeTodayId = isToday ? loadout.TODAY : null;

    // 2. Si OUI, on force les autres slots visuels à NULL pour ne pas polluer
    // On garde INTERACTION (clic) et TRAIL (souris) car ils ne changent pas le look statique
    const frameId    = activeTodayId ? null : loadout.FRAME;
    const hoverId    = activeTodayId ? null : loadout.HOVER;
    const ambianceId = activeTodayId ? null : loadout.AMBIANCE;
    const auraId     = activeTodayId ? null : loadout.AURA;

    // =========================================================================

    // 3. Récupération des OBJETS effets (basée sur les IDs filtrés)
    const frameEffect = SHOP_EFFECTS.find(e => e.id === frameId);
    const hoverEffect = SHOP_EFFECTS.find(e => e.id === hoverId);
    const todayEffect = SHOP_EFFECTS.find(e => e.id === activeTodayId); 
    const clickEffect = SHOP_EFFECTS.find(e => e.id === loadout.INTERACTION); // On garde toujours le clic
    const auraEffect  = SHOP_EFFECTS.find(e => e.id === auraId); 
    
    // Pour l'ambiance, on utilise la variable filtrée
    const ambianceEffect = ambianceId; 

    // 4. Analyse IA "Smart" (Désactivée si Today est prioritaire)
    let smartStyle = getSmartCardStyle(activities);
    if (activeTodayId) smartStyle = null; // Force null si Today actif
    else if (isPreview && forcedSmartStyle) smartStyle = forcedSmartStyle;
    
    // 5. Construction des styles
    const slotStyles = {
        frame: frameEffect?.cssClass,
        hover: hoverEffect?.cssClass,
        smart: (ambianceEffect === "smart_analysis") ? smartStyle?.class : null,
        today: todayEffect?.cssClass,
        ambiance: null 
    };

    let dynamicClasses = resolveCardClass(hasActivity, isToday, slotStyles);
    let innerBgClasses = ""; 

    // GESTION SPECIALE KING & CHIMNEY (Today Effects)
    if (isToday && activeTodayId === "king_road") {
        dynamicClasses += " today-king-container"; 
        innerBgClasses = "today-king-bg"; 
    }
    // 🔥 AJOUT : Gestion Cheminée (Today)
    if (isToday && activeTodayId === "santa_chimney") {
        // La classe est déjà appliquée via slotStyles.today, mais si tu as besoin
        // d'un background interne spécifique (ex: pour le feu derrière le texte), c'est ici.
        // Pour l'instant, ton CSS today-chimney gère tout sur le parent, donc c'est bon.
    }

    if ((hasActivity || isPreview) && auraEffect?.cssClass) {
        dynamicClasses += ` ${auraEffect.cssClass}`;
    }

    // GESTION SPECIALE AMBIANCES (Seulement si ambianceEffect n'est pas null)
    if ((hasActivity || isPreview) && ambianceEffect) {
        if (ambianceEffect === "hell_north") innerBgClasses = "ambiance-paris-roubaix";
        if (ambianceEffect === "synthwave_grid") innerBgClasses = "ambiance-synthwave";
        
        // Silent Night sur le parent (corrigé précédemment)
       if (ambianceEffect === "silent_night") {
            innerBgClasses = "ambiance-silent-night"; // Visuels (Neige/Sapins) dans le fond
            dynamicClasses += " theme-dark-mode";     // Texte blanc sur le parent
        }
        
        if (ambianceEffect === "forest_night") innerBgClasses = "ambiance-forest";
        if (ambianceEffect === "aurora_sky") innerBgClasses = "ambiance-aurora";
        if (ambianceEffect === "milky_way") innerBgClasses = "ambiance-milkyway";
        if (ambianceEffect === "counting_dreams") innerBgClasses = "ambiance-dreams";
        
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
    
    if ((hasActivity || isPreview) && hoverId === "flashlight") dynamicClasses += " stealth-mode";
    if (overrideClasses) dynamicClasses += ` ${overrideClasses}`;

    // 6. Styles Inline du Background
    let backgroundStyle = (hasActivity || isPreview) 
        ? `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` 
        : "rgba(255, 255, 255, 0.02)";

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
        
        // Si c'est le King ou d'autres effets Today qui dépassent, on laisse visible
        overflow: (isToday && (activeTodayId === "king_road")) ? "visible" : "hidden",
        
        zIndex: isPreview ? 2 : 1,
        cursor: "pointer",
        transition: "transform 0.2s ease, border-color 0.2s ease",
        background: backgroundStyle, 
        ...borderProps, 
        ...overrideStyles
    };
    
    let innerLayerClass = "";
    if (isToday && activeTodayId === "king_road") innerLayerClass = "today-king-bg";
    if ((hasActivity || isPreview) && ambianceEffect === "synthwave_grid") innerLayerClass = "ambiance-synthwave"; 

    if (ambianceEffect === "smart_analysis" && smartStyle?.variable) {
        Object.assign(finalStyle, smartStyle.variable);
    }

    // Fix Réacteur Today
    if (isToday && activeTodayId === "reactor_today") {
        finalStyle.background = 'transparent'; 
        finalStyle.borderColor = 'transparent';
        finalStyle.borderWidth = '0px';
    }

    // Pulse (Seulement si Frame est active, donc pas si Today est actif)
    let pulseBpm: number | null = null;
    const isPulseEquipped = frameId === "pulse";
    
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
        if (hoverId === "flashlight" && (hasActivity || isPreview)) {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
            e.currentTarget.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        }

        const trailId = loadout.TRAIL; // Le trail n'est pas filtré, on le garde toujours
        if (trailId && (hasActivity || isPreview) && Math.random() > 0.3) {
            const effect = SHOP_EFFECTS.find(ef => ef.id === trailId);
            createParticles(e, effect || null, "hover");
        }
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
         const target = e.currentTarget;
         if (hoverId !== "jelly_hover") target.style.transform = "translateY(-2px)";
         
         const effectId = hoverId;
         if ((hasActivity || isPreview) && effectId && effectId !== "flashlight") {
             const effect = SHOP_EFFECTS.find(ef => ef.id === effectId);
             createParticles(e, effect || null, "hover");
         }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        if (hoverId !== "jelly_hover") e.currentTarget.style.transform = "translateY(0)";
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
            {innerLayerClass && (
                <div className={innerLayerClass} style={{position:'absolute', inset:0, borderRadius:'6px', zIndex:-1, pointerEvents:'none'}}></div>
            )}

            {/* MOUTONS SAUTEURS (Seulement si ambiance active) */}
            {(ambianceEffect === "counting_dreams" && (hasActivity || isPreview)) && (
                <>
                    <div className="sheep-jumper" style={{ animationDelay: '0s' }}>🐑</div>
                    <div className="sheep-jumper" style={{ animationDelay: '3s' }}>🐑</div>
                    <div className="sheep-jumper" style={{ animationDelay: '6s' }}>🐑</div>
                    <div className="sheep-jumper" style={{ animationDelay: '9s' }}>🐑</div>
                </>
            )}

            {innerLayerClass && (
                <div className={innerLayerClass}>
                    {ambianceEffect === "aurora_sky" && <div className="shooting-star"></div>}
                </div>
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
                    borderRadius: '7px',
                    overflow: 'hidden', 
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
                
                {isPreview && ambianceEffect === "smart_analysis" && smartStyle?.label && (
                    <div style={{
                        marginTop:'auto', textAlign:'center', fontSize:'0.7rem', fontWeight:800, 
                        color:'#fff', textShadow:'0 0 4px rgba(0,0,0,1)', background:'rgba(0,0,0,0.4)',
                        padding:'2px', borderRadius:'4px'
                    }}>
                        {smartStyle.label}
                    </div>
                )}
            </div>

            {(ambianceEffect === "weather_dynamic") && (
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