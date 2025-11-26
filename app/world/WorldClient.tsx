// Fichier : app/world/WorldClient.tsx

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ActivityNode, YearStats, DistanceCategory, DISTANCE_PALETTE } from '../../lib/treeUtils'; 
import Link from 'next/link';

// Import dynamique du Canvas
const LivingTree = dynamic(() => import('../../components/ui/LivingTree'), {
    ssr: false,
    loading: () => (
        <div style={loadingStyle}>
            Chargement de la matrice de données...
        </div>
    ),
});

type WorldClientProps = {
    data: ActivityNode[];
    yearStats: YearStats;
};

// --- Helpers de formatage ---
const formatDistance = (km: number) => `${Math.floor(km).toLocaleString('fr-FR')} km`;
const formatElevation = (m: number) => `${Math.floor(m).toLocaleString('fr-FR')} m`;
const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h ${m}m`;
};
const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fr-FR', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    });
};

// --- Composant Stat Card ---
const StatCard = ({ title, value, color }: { title: string; value: string; color: string }) => (
    <div style={statCardStyle}>
        <div style={statCardTitleStyle}>{title}</div>
        <div style={{ ...statCardValueStyle, color }}>{value}</div>
    </div>
);

// --- Composant Filter Button ---
const FilterButton = ({ 
    category, 
    isActive, 
    count, 
    color, 
    label, 
    onClick 
}: { 
    category: string;
    isActive: boolean;
    count: number;
    color: string;
    label: string;
    onClick: () => void;
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                ...filterButtonStyle,
                color: isActive ? color : 'var(--text-secondary)',
                borderColor: isActive ? color : 'var(--secondary)',
                background: isActive ? `${color}15` : 'transparent',
                boxShadow: isActive ? `0 0 15px ${color}40` : 'none',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
            }}
        >
            {label} ({count})
        </button>
    );
};

export default function WorldClient({ data, yearStats }: WorldClientProps) {
    const [selectedCategory, setSelectedCategory] = useState<DistanceCategory | 'all' | null>(null);
    const [hoveredNode, setHoveredNode] = useState<ActivityNode | null>(null);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const treeContainerRef = useRef<HTMLDivElement>(null);

    // Référence stable pour la fonction de hover
    const handleNodeHover = useCallback((node: ActivityNode | null) => {
        setHoveredNode(node);
        setTooltipVisible(!!node);
    }, []);

    // Données filtrées
    const filteredData = selectedCategory && selectedCategory !== 'all'
        ? data.filter(node => node.category === selectedCategory)
        : data;

    // Catégories et labels
    const distanceCategories: ('all' | DistanceCategory)[] = ['all', 'short', 'medium', 'long', 'ultra'];
    const categoryLabels: Record<'all' | DistanceCategory, string> = {
        all: "TOUT",
        short: "COURTE (<50km)",
        medium: "MOYENNE (50-100km)",
        long: "LONGUE (100-250km)",
        ultra: "ULTRA (>250km)",
    };

    return (
        <div style={containerStyle}>
            {/* En-tête */}
            <header style={headerStyle}>
                <h1 style={titleStyle}>
                    <span style={titleGlowStyle} />
                    <span style={titleTextStyle}>Arbre-Monde</span>
                </h1>
                <p style={subtitleStyle}>
                    Visualisation 3D de l'historique d'entraînement (Année courante)
                </p>
            </header>

            {/* Barre de contrôle et statistiques */}
            <section style={controlsBarContainerStyle}>
                {/* Filtres de distance */}
                <div style={filterGroupStyle}>
                    {distanceCategories.map(category => {
                        const color = category === 'all' ? DISTANCE_PALETTE.ultra : DISTANCE_PALETTE[category];
                        const isActive = selectedCategory === category;
                        const count = category === 'all' ? yearStats.activityCount : (yearStats.counts[category] || 0);
                        
                        return (
                            <FilterButton
                                key={category}
                                category={category}
                                isActive={isActive}
                                count={count}
                                color={color}
                                label={categoryLabels[category]}
                                onClick={() => setSelectedCategory(category === 'all' ? null : category)}
                            />
                        );
                    })}
                </div>
                
                {/* Statistiques rapides */}
                <div style={statsContainerStyle}>
                    <StatCard 
                        title="TOTAL KM" 
                        value={formatDistance(yearStats.totalDistance)} 
                        color={DISTANCE_PALETTE.medium} 
                    />
                    <StatCard 
                        title="TOTAL D+" 
                        value={formatElevation(yearStats.totalElevation)} 
                        color={DISTANCE_PALETTE.short} 
                    />
                    <StatCard 
                        title="TOTAL TEMPS" 
                        value={formatDuration(yearStats.totalDuration)} 
                        color={DISTANCE_PALETTE.long} 
                    />
                    <StatCard 
                        title="ACTIVITÉS" 
                        value={yearStats.activityCount.toString()} 
                        color={DISTANCE_PALETTE.ultra} 
                    />
                </div>
            </section>

            {/* Zone de visualisation 3D */}
            <section style={treeContainerStyle} ref={treeContainerRef}>
                <LivingTree 
                    data={filteredData} 
                    selectedType={null} 
                    onNodeHover={handleNodeHover} 
                />
                
                {/* Tooltip flottant */}
                <div 
                    style={{
                        ...hoverTooltipStyle,
                        opacity: tooltipVisible ? 1 : 0,
                        transform: tooltipVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-10px)',
                        pointerEvents: tooltipVisible ? 'auto' : 'none',
                    }}
                >
                    {hoveredNode && (
                        <>
                            <div style={tooltipHeaderStyle}>
                                <div style={{ color: hoveredNode.color, fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {hoveredNode.type}
                                </div>
                                <div style={tooltipDateStyle}>
                                    {formatDate(hoveredNode.date)}
                                </div>
                            </div>
                            
                            <div style={hoverStatsGridStyle}>
                                <div style={hoverStatItemStyle}>
                                    <div style={hoverStatLabelStyle}>Distance</div>
                                    <div style={{...hoverStatValueStyle, color: DISTANCE_PALETTE.medium}}>
                                        {formatDistance(hoveredNode.distance)}
                                    </div>
                                </div>
                                <div style={hoverStatItemStyle}>
                                    <div style={hoverStatLabelStyle}>Dénivelé</div>
                                    <div style={{...hoverStatValueStyle, color: DISTANCE_PALETTE.short}}>
                                        {formatElevation(hoveredNode.elevation)}
                                    </div>
                                </div>
                                <div style={hoverStatItemStyle}>
                                    <div style={hoverStatLabelStyle}>Durée</div>
                                    <div style={{...hoverStatValueStyle, color: DISTANCE_PALETTE.long}}>
                                        {formatDuration(hoveredNode.duration)}
                                    </div>
                                </div>
                            </div>
                            
                            <Link 
                                href={`/activities/${hoveredNode.id}`} 
                                style={{
                                    ...viewActivityLinkStyle,
                                    borderColor: hoveredNode.color,
                                    color: hoveredNode.color,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = `${hoveredNode.color}20`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                Voir l'activité &rarr;
                            </Link>
                        </>
                    )}
                </div>

                {/* Indicateur d'interaction */}
                {!tooltipVisible && (
                    <div style={interactionHintStyle}>
                        <div style={hintTextStyle}>Survolez les points pour voir les détails</div>
                        <div style={hintArrowStyle}>↑</div>
                    </div>
                )}
            </section>
            
            {/* Bannière de statistiques détaillées */}
            <section style={bottomBannerStyle}>
                <h3 style={bottomBannerTitleStyle}>
                    Records {selectedCategory === 'all' || !selectedCategory ? 'Globaux' : categoryLabels[selectedCategory]}
                </h3>
                <div style={bottomStatsGridStyle}>
                    <StatCard 
                        title="PLUS GRANDE SORTIE" 
                        value={`${yearStats.biggestRide.toFixed(0)} km`} 
                        color={DISTANCE_PALETTE.medium} 
                    />
                    <StatCard 
                        title="KM MOY./ACTI." 
                        value={`${(yearStats.totalDistance / yearStats.activityCount).toFixed(1)} km`} 
                        color={DISTANCE_PALETTE.long} 
                    />
                    <StatCard 
                        title="D+ MOY./ACTI." 
                        value={`${(yearStats.totalElevation / yearStats.activityCount).toFixed(0)} m`} 
                        color={DISTANCE_PALETTE.ultra} 
                    />
                </div>
            </section>

            {/* Styles d'animation CSS inline */}
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: 0% center; }
                    100% { background-position: 200% center; }
                }
                
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-10px); }
                    60% { transform: translateY(-5px); }
                }
                
                .shimmer-animation {
                    background: linear-gradient(90deg, #00f3ff, #ff00ff, #00f3ff);
                    background-size: 200% auto;
                    animation: shimmer 3s linear infinite;
                }
                
                .bounce-animation {
                    animation: bounce 2s infinite;
                }
            `}</style>
        </div>
    );
}

// --- Styles ---
const containerStyle: React.CSSProperties = {
    padding: '2rem',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #02040a 0%, #0a0f1a 100%)',
};

const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '3rem',
};

const titleStyle: React.CSSProperties = {
    fontSize: '4rem',
    fontWeight: 900,
    margin: '0 0 0.5rem 0',
    position: 'relative',
    letterSpacing: '-2px',
};

const titleTextStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, #00f3ff, #ff00ff, #00f3ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundSize: '200% auto',
    animation: 'shimmer 3s linear infinite',
};

const titleGlowStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle, rgba(255, 0, 255, 0.4) 0%, transparent 60%)',
    filter: 'blur(30px)',
    zIndex: -1,
};

const subtitleStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    color: 'var(--text-secondary)',
    marginBottom: '0',
    opacity: 0.8,
};

const controlsBarContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(14, 14, 20, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '1.5rem 2rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1.5rem',
    backdropFilter: 'blur(10px)',
};

const filterGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
};

const filterButtonStyle: React.CSSProperties = {
    padding: '0.7rem 1.2rem',
    fontSize: '0.85rem',
    background: 'transparent',
    border: '1px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
};

const statsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center',
    flexWrap: 'wrap',
};

const statCardStyle: React.CSSProperties = {
    textAlign: 'right',
    padding: '0.5rem 0',
};

const statCardTitleStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: '0.75rem',
    marginBottom: '0.25rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const statCardValueStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 800,
};

const treeContainerStyle: React.CSSProperties = {
    height: '70vh',
    minHeight: '500px',
    background: 'var(--background)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    cursor: 'crosshair',
    marginBottom: '2rem',
};

const hoverTooltipStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(2, 4, 10, 0.95)',
    border: '2px solid',
    borderRadius: '16px',
    padding: '1.5rem',
    zIndex: 1000,
    maxWidth: '320px',
    width: '90%',
    textAlign: 'left',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    borderColor: 'var(--accent)',
};

const tooltipHeaderStyle: React.CSSProperties = {
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
};

const tooltipDateStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginTop: '0.25rem',
};

const hoverStatsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '1rem',
};

const hoverStatItemStyle: React.CSSProperties = {
    textAlign: 'center',
};

const hoverStatLabelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    marginBottom: '0.25rem',
    letterSpacing: '0.5px',
};

const hoverStatValueStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 'bold',
};

const viewActivityLinkStyle: React.CSSProperties = {
    display: 'block',
    marginTop: '1rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    textDecoration: 'none',
    fontWeight: 'bold',
    padding: '0.5rem 1rem',
    border: '1px solid',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
};

const interactionHintStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    zIndex: 100,
    pointerEvents: 'none',
    opacity: 0.7,
};

const hintTextStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    marginBottom: '0.5rem',
};

const hintArrowStyle: React.CSSProperties = {
    fontSize: '1.5rem',
    animation: 'bounce 2s infinite',
};

const bottomBannerStyle: React.CSSProperties = {
    marginTop: '2rem',
    background: 'rgba(14, 14, 20, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    padding: '2rem',
    backdropFilter: 'blur(10px)',
};

const bottomBannerTitleStyle: React.CSSProperties = {
    margin: '0 0 1.5rem 0',
    color: 'var(--text)',
    fontSize: '1.3rem',
    fontWeight: 700,
    textAlign: 'center',
};

const bottomStatsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '2rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '1.5rem',
};

const loadingStyle: React.CSSProperties = {
    height: '70vh',
    background: 'var(--background)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    fontSize: '1.1rem',
    fontWeight: 600,
};

