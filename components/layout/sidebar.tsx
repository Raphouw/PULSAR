// Fichier : app/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ChevronRight, Zap, 
  Pin, PinOff, 
  Menu, X, 
  PanelLeftClose, PanelLeftOpen 
} from 'lucide-react';

const HEADER_HEIGHT = 72;

// --- ICÔNES SVG AVEC CLASSES D'ANIMATION ---
const Icons = {
  Dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-dashboard">
      <rect x="3" y="3" width="7" height="9" className="rect-1"></rect>
      <rect x="14" y="3" width="7" height="5" className="rect-2"></rect>
      <rect x="14" y="12" width="7" height="9" className="rect-3"></rect>
      <rect x="3" y="16" width="7" height="5" className="rect-4"></rect>
    </svg>
  ),
  Activity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-activity">
      <path className="pulse-line" d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
    </svg>
  ),
  Calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-calendar">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" className="cal-border"></rect>
      <path d="M16 2v4" className="cal-pin"></path>
      <path d="M8 2v4" className="cal-pin"></path>
      <path d="M3 10h18" className="cal-sep"></path>
      <rect x="7" y="14" width="3" height="3" className="cal-day-1" opacity="0.3" fill="currentColor" stroke="none"></rect>
      <rect x="14" y="14" width="3" height="3" className="cal-day-2" opacity="0.3" fill="currentColor" stroke="none"></rect>
      <rect x="7" y="18" width="3" height="3" className="cal-day-3" opacity="0.3" fill="currentColor" stroke="none"></rect>
      <rect x="14" y="18" width="3" height="3" className="cal-day-4" opacity="0.3" fill="currentColor" stroke="none"></rect>
    </svg>
  ),
  Events: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-events">
      <path className="flag-pole" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
      <line className="flag-stick" x1="4" y1="22" x2="4" y2="15"></line>
    </svg>
  ),
  Training: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-training">
      <circle cx="12" cy="12" r="10" className="stopwatch-body"></circle>
      <path d="M12 6v6l4 2" className="stopwatch-hand"></path>
      <line x1="12" y1="2" x2="12" y2="4" className="stopwatch-btn"></line>
    </svg>
  ),
  TrainingPlan: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-training-plan">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" className="clipboard-body"/>
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="M9 14h6" className="line-1"/>
      <path d="M9 18h6" className="line-2"/>
      <path d="M9 10h2" className="line-3"/>
    </svg>
  ),
  Simulation: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-simulation">
      <path className="wind-line-1" d="M2 6h20" strokeDasharray="12 8"></path>
      <path className="wind-line-2" d="M2 12h20" strokeDasharray="12 8"></path>
      <path className="wind-line-3" d="M2 18h20" strokeDasharray="12 8"></path>
      <circle className="wind-obj" cx="12" cy="12" r="3" fill="transparent"></circle>
    </svg>
  ),
  Route: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-route">
      <polygon points="3 11 22 2 13 21 11 13 3 11" className="arrow-plane"></polygon>
    </svg>
  ),
  Segment: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-segment">
      <rect x="2" y="16" width="3" height="5" rx="1" className="elev-bar-1"></rect>
      <rect x="6" y="12" width="3" height="9" rx="1" className="elev-bar-2"></rect>
      <rect x="10" y="8" width="3" height="13" rx="1" className="elev-bar-3"></rect>
      <rect x="14" y="5" width="3" height="16" rx="1" className="elev-bar-4"></rect>
      <rect x="18" y="10" width="3" height="11" rx="1" className="elev-bar-5"></rect>
    </svg>
  ),
  Friends: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-friends">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" className="friend-pop"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" className="friend-pop"></path>
    </svg>
  ),
  Compare: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-compare">
      <path d="M16 3h5v5" className="arrow-tr"></path>
      <path d="M21 3l-7 7" className="arrow-tr-line"></path>
      <path d="M8 21H3v-5" className="arrow-bl"></path>
      <path d="M3 21l7-7" className="arrow-bl-line"></path>
    </svg>
  ),
  Profile: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-profile">
      <rect x="4" y="3" width="16" height="18" rx="2" className="id-card"></rect>
      <circle cx="12" cy="10" r="3" className="id-head"></circle>
      <line x1="8" y1="16" x2="16" y2="16" className="id-line"></line>
      <line x1="4" y1="8" x2="20" y2="8" className="scan-beam" strokeWidth="1" opacity="0"></line>
    </svg>
  ),
  Map: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-map">
       <circle cx="12" cy="12" r="3" className="gps-dot" fill="currentColor" stroke="none"></circle>
       <circle cx="12" cy="12" r="6" className="gps-ring-1" opacity="0.5"></circle>
       <circle cx="12" cy="12" r="10" className="gps-ring-2" opacity="0.3"></circle>
    </svg>
  ),
  Algo: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-algo">
      <rect x="4" y="4" width="16" height="16" rx="2" className="chip-body"></rect>
      <rect x="9" y="9" width="6" height="6" className="chip-core" fill="currentColor" stroke="none" opacity="0.3"></rect>
      <path d="M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 15h3 M1 9h3 M1 15h3" className="chip-legs"></path>
    </svg>
  ),
  World: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-group icon-world">
      <circle cx="12" cy="12" r="2" className="net-center" fill="currentColor" stroke="none"></circle>
      <line x1="12" y1="12" x2="12" y2="5" className="net-link-1" strokeDasharray="10" strokeDashoffset="10"></line>
      <line x1="12" y1="12" x2="18" y2="15" className="net-link-2" strokeDasharray="10" strokeDashoffset="10"></line>
      <line x1="12" y1="12" x2="6" y2="15" className="net-link-3" strokeDasharray="10" strokeDashoffset="10"></line>
      <circle cx="12" cy="5" r="1.5" className="net-node-1" opacity="0.3"></circle>
      <circle cx="18" cy="15" r="1.5" className="net-node-2" opacity="0.3"></circle>
      <circle cx="6" cy="15" r="1.5" className="net-node-3" opacity="0.3"></circle>
    </svg>
  ),
};

const groups = [
  {
    title: "PERFORMANCE",
    links: [
      { href: '/dashboard', label: 'Dashboard', icon: Icons.Dashboard },
      { href: '/activities', label: 'Activités', icon: Icons.Activity },
      { href: '/calendar', label: 'Calendrier', icon: Icons.Calendar },
      { href: '/trainings', label: 'Entrainements', icon: Icons.Training },
    ]
  },
  {
    title: "PLANIFICATION",
    links: [
      { href: '/training-plan', label: "Plan d'entraînement", icon: Icons.TrainingPlan },
      { href: '/simulations', label: 'Simulations', icon: Icons.Simulation },
      { href: '/comparisons', label: 'Comparaisons', icon: Icons.Compare },
      { href: '/routes', label: 'Itinéraires', icon: Icons.Route },
      { href: '/segments', label: 'Montées & Cols', icon: Icons.Segment },
      { href: '/map', label: 'Carte Globale', icon: Icons.Map },
    ]
  },
  {
    title: "SOCIAL & DONNÉES",
    links: [
      { href: '/friends', label: 'Communauté', icon: Icons.Friends },
      { href: '/world', label: 'Arbre-Monde', icon: Icons.World },
      { href: '/events', label: 'Événements', icon: Icons.Events },
      { href: '/profildata', label: 'Mon Profil', icon: Icons.Profile },
      { href: '/algo', label: 'Algorithmes', icon: Icons.Algo },
    ]
  },
];

const updateGlobalWidth = (width: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--sidebar-width', width);
  }
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // --- ÉTATS ---
  const [isPinned, setIsPinned] = useState(false); // Mode "Épinglé" (Cadenas)
  const [isHovered, setIsHovered] = useState(false); // Mode "Survol temporaire"
  const [mounted, setMounted] = useState(false);

  // La sidebar est ouverte si Épinglée OU Survolée
  const isSidebarOpen = isPinned || isHovered;

  useEffect(() => {
    setMounted(true);
    // Charger la préférence "Pinned" du localStorage
    const savedPinState = localStorage.getItem('sidebar-pinned');
    const initialPinState = savedPinState ? JSON.parse(savedPinState) : true;
    setIsPinned(initialPinState);
  }, []);

  // Met à jour la largeur globale (CSS variable) pour pousser le contenu
  useEffect(() => {
    if (!mounted) return;
    const width = isSidebarOpen ? '210px' : '72px';
    updateGlobalWidth(width);
  }, [isSidebarOpen, mounted]);

  // Action : Clic sur le bouton PIN
  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche de propager le clic
    const newState = !isPinned;
    setIsPinned(newState);
    localStorage.setItem('sidebar-pinned', JSON.stringify(newState));
  };

  // Navigation : Quand l'URL change (nouvelle page chargée), on reset le hover
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsHovered(false); 
  }, [pathname]);

  const isLocked = session?.user?.onboarding_completed === false;
  const currentWidth = isSidebarOpen ? '210px' : '72px';
  const groupMarginBottom = isSidebarOpen ? '1.5rem' : '0.4rem';

  if (!mounted) return <div style={{ width: currentWidth, background: 'var(--background)' }} />;

  return (
    <>
      <style jsx global>{`
        /* --- STRUCTURE PRINCIPALE --- */
        .sidebar-container {
            height: 100vh;
            background: #0a0a0c;
            border-right: 1px solid rgba(255, 255, 255, 0.06);
            display: flex;
            flex-direction: column;
            z-index: 50;
            transition: width 0.4s cubic-bezier(0.2, 0, 0, 1);
            overflow-x: hidden;
            position: fixed;
            top: 0;
            left: 0;
        }

        /* DESKTOP : Sticky */
        @media (min-width: 768px) {
            .sidebar-container {
                position: sticky; 
                top: 0;
            }
        }

        /* --- STYLES TEXTES & LOGO --- */
        .logo-link:hover .logo-text {
            letter-spacing: 2px;
            filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.6));
            background: linear-gradient(135deg, #ffffff 0%, #d04fd7 100%);
            -webkit-background-clip: text;
        }

        /* --- ANIMATIONS SVG (Toutes les keyframes) --- */

        /* Dashboard */
        .nav-link:hover .icon-dashboard .rect-1 { animation: eqMove 0.6s ease infinite alternate; }
        .nav-link:hover .icon-dashboard .rect-2 { animation: eqMove 0.6s ease infinite alternate 0.1s; }
        .nav-link:hover .icon-dashboard .rect-3 { animation: eqMove 0.6s ease infinite alternate 0.2s; }
        .nav-link:hover .icon-dashboard .rect-4 { animation: eqMove 0.6s ease infinite alternate 0.3s; }
        @keyframes eqMove { 0% { transform: scaleY(1); } 100% { transform: scaleY(0.6); transform-origin: bottom; } }

        /* Activity */
        .nav-link:hover .icon-activity .pulse-line { animation: pulseGraph 1s ease-in-out infinite; stroke: #fff; }
        @keyframes pulseGraph { 
          0% { stroke-dasharray: 40; stroke-dashoffset: 40; } 
          50% { stroke-dasharray: 40; stroke-dashoffset: 0; }
          100% { stroke-dasharray: 40; stroke-dashoffset: -40; } 
        }

        /* Calendar */
        .nav-link:hover .icon-calendar .cal-day-1 { animation: dayCycle 2s ease infinite; }
        .nav-link:hover .icon-calendar .cal-day-2 { animation: dayCycle 2s ease infinite 0.25s; }
        .nav-link:hover .icon-calendar .cal-day-3 { animation: dayCycle 2s ease infinite 0.5s; }
        .nav-link:hover .icon-calendar .cal-day-4 { animation: dayCycle 2s ease infinite 0.75s; }
        @keyframes dayCycle { 
            0% { opacity: 0.3; } 
            20% { opacity: 1; fill: #fff; }
            50% { opacity: 1; fill: #fff; }
            80% { opacity: 0.3; fill: currentColor; }
            100% { opacity: 0.3; }
        }

        /* Training */
        .nav-link:hover .icon-training .stopwatch-hand { animation: timerSpin 1s linear infinite; transform-origin: 12px 12px; }
        @keyframes timerSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Simulation */
        .nav-link:hover .icon-simulation .wind-line-1 { animation: windSpeed 0.8s linear infinite; }
        .nav-link:hover .icon-simulation .wind-line-2 { animation: windSpeed 0.8s linear infinite 0.1s; }
        .nav-link:hover .icon-simulation .wind-line-3 { animation: windSpeed 0.8s linear infinite 0.2s; }
        .nav-link:hover .icon-simulation .wind-obj { stroke: #fff; }
        @keyframes windSpeed { 
            from { stroke-dashoffset: 20; opacity: 0.2; } 
            to { stroke-dashoffset: 0; opacity: 1; stroke: #fff; } 
        }

        /* Events */
        .nav-link:hover .icon-events .flag-pole { animation: waveFlag 1s ease-in-out infinite alternate; transform-origin: left center; }
        @keyframes waveFlag { 
            0% { transform: scaleX(1) skewY(0deg); } 
            100% { transform: scaleX(0.95) skewY(-10deg); stroke: #fff; } 
        }

        /* Training Plan */
        .nav-link:hover .icon-training-plan .line-1 { animation: loadLine 0.8s ease infinite; }
        .nav-link:hover .icon-training-plan .line-2 { animation: loadLine 0.8s ease infinite 0.2s; }
        .nav-link:hover .icon-training-plan .line-3 { animation: loadLine 0.8s ease infinite 0.4s; }
        @keyframes loadLine { 0% { opacity: 0.3; } 50% { opacity: 1; stroke: #fff; transform: translateX(2px); } 100% { opacity: 0.3; } }

        /* Route */
        .nav-link:hover .icon-route .arrow-plane { animation: flyPlane 1s ease-in-out infinite alternate; stroke: #fff; transform-origin: center; }
        @keyframes flyPlane { from { transform: translate(0,0); } to { transform: translate(2px, -2px) rotate(5deg); } }

        /* Segment */
        .nav-link:hover .icon-segment .elev-bar-1 { animation: equalizerWave 1s ease infinite alternate; fill: #fff; }
        .nav-link:hover .icon-segment .elev-bar-2 { animation: equalizerWave 1s ease infinite alternate 0.15s; fill: #fff; }
        .nav-link:hover .icon-segment .elev-bar-3 { animation: equalizerWave 1s ease infinite alternate 0.3s; fill: #fff; }
        .nav-link:hover .icon-segment .elev-bar-4 { animation: equalizerWave 1s ease infinite alternate 0.45s; fill: #fff; }
        .nav-link:hover .icon-segment .elev-bar-5 { animation: equalizerWave 1s ease infinite alternate 0.6s; fill: #fff; }
        @keyframes equalizerWave { 
            0% { transform: scaleY(0.4); opacity: 0.6; } 
            100% { transform: scaleY(1); opacity: 1; transform-origin: bottom; } 
        }

        /* Friends */
        .nav-link:hover .icon-friends .friend-pop { animation: popFriend 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite alternate; stroke: #fff; }
        @keyframes popFriend { from { transform: scale(0.9); opacity: 0.5; transform-origin: center; } to { transform: scale(1.1); opacity: 1; } }

        /* Compare */
        .nav-link:hover .icon-compare .arrow-tr { animation: expandTr 0.8s ease infinite alternate; stroke: #fff; }
        .nav-link:hover .icon-compare .arrow-bl { animation: expandBl 0.8s ease infinite alternate; stroke: #fff; }
        @keyframes expandTr { to { transform: translate(2px, -2px); } }
        @keyframes expandBl { to { transform: translate(-2px, 2px); } }

        /* Map */
        .nav-link:hover .icon-map .gps-dot { fill: #fff; }
        .nav-link:hover .icon-map .gps-ring-1 { animation: radarPulse 1.5s ease-out infinite; stroke: #fff; fill: transparent; }
        .nav-link:hover .icon-map .gps-ring-2 { animation: radarPulse 1.5s ease-out infinite 0.4s; stroke: #fff; fill: transparent; }
        @keyframes radarPulse {
            0% { transform: scale(0.1); opacity: 1; transform-origin: center; stroke-width: 2px; }
            100% { transform: scale(1); opacity: 0; transform-origin: center; stroke-width: 0px; }
        }

        /* Algo */
        .nav-link:hover .icon-algo .chip-core { animation: corePulse 0.8s ease infinite alternate; fill: #fff; }
        .nav-link:hover .icon-algo .chip-legs { animation: legsGlow 0.8s ease infinite alternate; stroke: #fff; }
        @keyframes corePulse { from { opacity: 0.3; } to { opacity: 1; } }
        @keyframes legsGlow { from { opacity: 0.5; } to { opacity: 1; stroke-width: 2px; } }

        /* World */
        .nav-link:hover .icon-world .net-center { fill: #fff; }
        .nav-link:hover .icon-world .net-link-1 { animation: pulseLink 2s ease infinite alternate; stroke: #fff; }
        .nav-link:hover .icon-world .net-link-2 { animation: pulseLink 2s ease infinite alternate 0.3s; stroke: #fff; }
        .nav-link:hover .icon-world .net-link-3 { animation: pulseLink 2s ease infinite alternate 0.6s; stroke: #fff; }
        .nav-link:hover .icon-world .net-node-1 { animation: pulseNode 2s ease infinite alternate; fill: #fff; }
        .nav-link:hover .icon-world .net-node-2 { animation: pulseNode 2s ease infinite alternate 0.3s; fill: #fff; }
        .nav-link:hover .icon-world .net-node-3 { animation: pulseNode 2s ease infinite alternate 0.6s; fill: #fff; }
        
        @keyframes pulseLink { 0% { stroke-dashoffset: 10; opacity: 0.3; } 100% { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes pulseNode { 0% { opacity: 0.3; r: 1.5; } 100% { opacity: 1; r: 2.2; } }

        /* Profile */
        .nav-link:hover .icon-profile .scan-beam { animation: scanDown 1.5s linear infinite; stroke: #fff; }
        .nav-link:hover .icon-profile .id-head { stroke: #fff; transition: stroke 0.3s; }
        @keyframes scanDown { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(12px); opacity: 0; } }

        /* HOVER EFFECTS - WHITE ONLY */
        .nav-link:hover .link-text,
        .nav-link:hover svg, .nav-link:hover svg path, .nav-link:hover svg rect, .nav-link:hover svg circle, .nav-link:hover svg line, .nav-link:hover svg polygon, .nav-link:hover svg g {
            color: #ffffff !important;
            stroke: #ffffff !important;
            fill: rgba(255,255,255,0) !important;
        }
        .nav-link:hover svg .chip-core, .nav-link:hover svg .cal-day-1, .nav-link:hover svg .cal-day-2,
        .nav-link:hover svg .cal-day-3, .nav-link:hover svg .cal-day-4, .nav-link:hover svg .gps-dot,
        .nav-link:hover svg .net-center, .nav-link:hover svg .net-node-1, .nav-link:hover svg .net-node-2,
        .nav-link:hover svg .net-node-3, .nav-link:hover svg .elev-bar-1, .nav-link:hover svg .elev-bar-2,
        .nav-link:hover svg .elev-bar-3, .nav-link:hover svg .elev-bar-4, .nav-link:hover svg .elev-bar-5 {
            fill: #ffffff !important;
            stroke: none !important;
        }
        .nav-link:hover .link-text { transform: translateX(3px); }

        /* Styles spécifiques pour le bouton Pin */
        .pin-btn:hover {
            background: rgba(255,255,255,0.08);
            color: #fff;
            border-color: rgba(255,255,255,0.2);
        }
        
        .scroll-area::-webkit-scrollbar { width: 3px; }
        .scroll-area::-webkit-scrollbar-track { background: transparent; }
        .scroll-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>

      {/* BOUTON MOBILE */}
      <button 
        className="mobile-toggle-btn" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{
            position: 'fixed', top: '12px', left: '12px', zIndex: 100,
            background: 'rgba(15, 15, 20, 0.9)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
            padding: '8px', borderRadius: '8px', cursor: 'pointer',
            display: 'none'
        }}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* OVERLAY MOBILE */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'visible' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
        style={{
            display: isMobileMenuOpen ? 'block' : 'none',
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(2px)', zIndex: 45
        }}
      />

      {/* --- SIDEBAR CONTAINER --- */}
      <aside 
        className={`sidebar-container ${isMobileMenuOpen ? 'open' : ''}`}
        // GESTION INTELLIGENTE DU SURVOL
        // Si ce n'est pas épinglé (cadenas ouvert), on ouvre temporairement au survol
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        // Quand on sort la souris, on ferme le mode temporaire
        onMouseLeave={() => setIsHovered(false)}
        style={{
            width: currentWidth, 
            ...(isLocked ? { opacity: 0.4, pointerEvents: 'none', filter: 'grayscale(0.8)' } : {})
        }}
      >
        {/* HEADER : LOGO */}
        <div style={{ 
            display: 'flex', alignItems: 'center', 
            // Si fermé : centré. Si ouvert : aligné à gauche.
            justifyContent: !isSidebarOpen ? 'center' : 'flex-start', 
            padding: '1.2rem 1rem', marginBottom: 0,
            height: HEADER_HEIGHT // Hauteur fixe pour éviter les sauts
        }}>
            <Link href="/dashboard" className="logo-link" style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    {/* Le logo "P" simple si fermé */}
                    {!isSidebarOpen ? (
                         <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d04fd7' }}>P</span>
                    ) : (
                        // Logo complet si ouvert
                        <>
                            <span style={logoTextStyle} className="logo-text">PULSAR</span>
                            <span style={versionBadgeStyle}>DEV</span>
                        </>
                    )}
                </div>
            </Link>
        </div>

        {/* NAVIGATION SCROLLABLE */}
        <div style={scrollAreaStyle} className="scroll-area">
          {groups.map((group, index) => (
            <div key={index} style={{ marginBottom: groupMarginBottom }}>
              {/* TITRE DU GROUPE (Ligne ou Texte) */}
              <div style={{ 
                  marginBottom: '0.6rem', paddingLeft: !isSidebarOpen ? 0 : '0.8rem', 
                  textAlign: !isSidebarOpen ? 'center' : 'left', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: !isSidebarOpen ? 'center' : 'flex-start'
              }}>
                 {!isSidebarOpen ? (
                    <div style={{ width: '20px', height: '2px', background: 'linear-gradient(90deg, #d04fd7 0%, transparent 100%)', opacity: 0.5 }} />
                 ) : (
                    <span style={groupTitleStyle}>{group.title}</span>
                 )}
              </div>
              
              <ul style={ulStyle}>
                {group.links.map((link) => {
                  const isActive = pathname?.startsWith(link.href) ?? false;
                  const isHoveredLink = hoveredLink === link.href;

                  return (
                    <li key={link.href} style={{ marginBottom: !isSidebarOpen ? '2px' : '4px' }}>
                      <Link
                        href={link.href}
                        className="nav-link"
                        // Ferme le menu mobile au clic, mais ne touche pas à la sidebar desktop (gérée par URL)
                        onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}
                        style={{
                            ...getLinkStyle(isActive, isHoveredLink),
                            padding: !isSidebarOpen ? '0.5rem' : '0.55rem 0.8rem',
                            justifyContent: !isSidebarOpen ? 'center' : 'flex-start'
                        }}
                        onMouseEnter={() => setHoveredLink(link.href)}
                        onMouseLeave={() => setHoveredLink(null)}
                      >
                        {isActive && <div style={activeIndicatorStyle} />}
                        
                        <span 
                          className="link-icon"
                          style={{ 
                            marginRight: !isSidebarOpen ? 0 : '12px', display: 'flex',
                            transition: 'color 0.2s', color: isActive ? '#d04fd7' : 'rgba(255,255,255,0.6)',
                            minWidth: '18px'
                          }}
                        >
                          {link.icon}
                        </span>
                        
                        <span 
                          className="link-text"
                          style={{ 
                            fontSize: '0.85rem', fontWeight: isActive ? 600 : 400,
                            color: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
                            transition: 'all 0.3s', opacity: !isSidebarOpen ? 0 : 1,
                            width: !isSidebarOpen ? 0 : 'auto', overflow: 'hidden', whiteSpace: 'nowrap'
                          }}
                        >
                          {link.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* --- ZONE DU BAS : PIN BUTTON & USER --- */}
        <div style={{ marginTop: 0, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
            
            {/* BOUTON PIN (Uniquement visible quand ouvert pour éviter le bruit visuel fermé) */}
            {isSidebarOpen && (
                <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'flex-end' }}>
                     <button
                        onClick={togglePin}
                        className="pin-btn"
                        title={isPinned ? "Détacher la barre" : "Épingler la barre"}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            color: isPinned ? '#d04fd7' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                     >
                        {isPinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
                     </button>
                </div>
            )}

            {/* USER PROFILE */}
            {session?.user && (
            <div style={{ padding: !isSidebarOpen ? '1rem 0.5rem' : '0.5rem 1rem 1rem 1rem', display: 'flex', justifyContent: 'center' }}>
                <div style={footerProfileStyle}>
                <div style={avatarPlaceholderStyle}>
                    {session.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={session.user.image} alt="" style={{width:'100%', height:'100%', borderRadius:'50%'}}/>
                    ) : (
                        session.user.name?.charAt(0) || 'R'
                    )}
                </div>
                
                <div style={{ 
                    overflow: 'hidden', transition: 'all 0.3s', opacity: !isSidebarOpen ? 0 : 1,
                    width: !isSidebarOpen ? 0 : 'auto', marginLeft: !isSidebarOpen ? 0 : '10px'
                }}>
                    <div style={userNameStyle}>{session.user.name}</div>
                    <div style={userRoleStyle}>
                        <Zap size={10} style={{ marginRight: 3, fill: '#fbbf24', stroke: 'none' }} />
                        Athlète
                    </div>
                </div>
                </div>
            </div>
            )}
        </div>
      </aside>
    </>
  );
}

// ... STYLES UTILS ...
const logoTextStyle: React.CSSProperties = {
  fontSize: '1.4rem', fontWeight: 800, fontFamily: 'system-ui, sans-serif',
  letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #d04fd7 0%, #ffffff 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', transition: 'all 0.3s ease', whiteSpace: 'nowrap'
};

const versionBadgeStyle: React.CSSProperties = {
  fontSize: '0.6rem', padding: '1px 5px', borderRadius: '4px',
  background: 'rgba(208, 79, 215, 0.1)', border: '1px solid rgba(208, 79, 215, 0.25)',
  color: '#d04fd7', fontWeight: 700, marginTop: '2px'
};

const scrollAreaStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0.5rem 0',
};

const groupTitleStyle: React.CSSProperties = {
  fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px',
  background: 'linear-gradient(90deg, #d04fd7 0%, #a0a0a0 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', opacity: 1, whiteSpace: 'nowrap',
};

const ulStyle: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0 };

const getLinkStyle = (isActive: boolean, isHovered: boolean): React.CSSProperties => {
  return {
    display: 'flex', alignItems: 'center', textDecoration: 'none',
    margin: '0 0.5rem', borderRadius: '8px', transition: 'all 0.2s ease',
    position: 'relative', overflow: 'hidden', cursor: 'pointer',
    background: isActive ? 'rgba(208, 79, 215, 0.12)' : isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
  };
};

const activeIndicatorStyle: React.CSSProperties = {
  position: 'absolute', left: 0, top: '20%', height: '60%', width: '3px',
  background: '#d04fd7', borderRadius: '0 4px 4px 0', boxShadow: '0 0 8px #d04fd7',
};

const footerProfileStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', width: '100%' };

const avatarPlaceholderStyle: React.CSSProperties = {
  width: '32px', height: '32px', borderRadius: '50%',
  background: 'linear-gradient(135deg, #2a2a35 0%, #151520 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0
};

const userNameStyle: React.CSSProperties = {
  fontSize: '0.85rem', fontWeight: 600, color: '#fff',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px'
};

const userRoleStyle: React.CSSProperties = {
  fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center'
};