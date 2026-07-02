'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Zap, 
  Pin, PinOff, 
  Menu, X, 
  Settings2, 
  TrophyIcon
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
  Admin: <Settings2 size={18} strokeWidth={1.5} className="icon-group" />,
  Trophy : <TrophyIcon size={18} strokeWidth={1.5} className="icon-group" />,
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
      { href: '/legend', label: 'PALMARÈS', icon: Icons.Trophy },
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
  const isAdmin = session?.user?.id === "1";
  
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  // La sidebar est considérée comme "ouverte" en mode Desktop si elle est épinglée ou survolée
  const isSidebarOpen = isPinned || isHovered;

  useEffect(() => {
    setMounted(true);
    const savedPinState = localStorage.getItem('sidebar-pinned');
    const initialPinState = savedPinState ? JSON.parse(savedPinState) : true;
    setIsPinned(initialPinState);
  }, []);

  // Met à jour la largeur globale (CSS variable) pour pousser le contenu principal sur Desktop
  useEffect(() => {
    if (!mounted) return;
    const width = isSidebarOpen ? '210px' : '72px';
    updateGlobalWidth(width);
  }, [isSidebarOpen, mounted]);

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isPinned;
    setIsPinned(newState);
    localStorage.setItem('sidebar-pinned', JSON.stringify(newState));
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsHovered(false); 
  }, [pathname]);

  const isLocked = session?.user?.onboarding_completed === false;

  // Render minimal pendant le SSR pour éviter le mismatch d'hydratation
  if (!mounted) return <div className="hidden md:block bg-[#0a0a0c]" style={{ width: isSidebarOpen ? '210px' : '72px' }} />;

  return (
    <>
      <style jsx global>{`
        /* --- ANIMATIONS SVG (Toutes les keyframes conservées) --- */
        .nav-link:hover .icon-dashboard .rect-1 { animation: eqMove 0.6s ease infinite alternate; }
        .nav-link:hover .icon-dashboard .rect-2 { animation: eqMove 0.6s ease infinite alternate 0.1s; }
        .nav-link:hover .icon-dashboard .rect-3 { animation: eqMove 0.6s ease infinite alternate 0.2s; }
        .nav-link:hover .icon-dashboard .rect-4 { animation: eqMove 0.6s ease infinite alternate 0.3s; }
        @keyframes eqMove { 0% { transform: scaleY(1); } 100% { transform: scaleY(0.6); transform-origin: bottom; } }

        .nav-link:hover .icon-activity .pulse-line { animation: pulseGraph 1s ease-in-out infinite; stroke: #fff; }
        @keyframes pulseGraph { 0% { stroke-dasharray: 40; stroke-dashoffset: 40; } 50% { stroke-dasharray: 40; stroke-dashoffset: 0; } 100% { stroke-dasharray: 40; stroke-dashoffset: -40; } }

        .nav-link:hover .icon-calendar .cal-day-1 { animation: dayCycle 2s ease infinite; }
        .nav-link:hover .icon-calendar .cal-day-2 { animation: dayCycle 2s ease infinite 0.25s; }
        .nav-link:hover .icon-calendar .cal-day-3 { animation: dayCycle 2s ease infinite 0.5s; }
        .nav-link:hover .icon-calendar .cal-day-4 { animation: dayCycle 2s ease infinite 0.75s; }
        @keyframes dayCycle { 0% { opacity: 0.3; } 20%, 50% { opacity: 1; fill: #fff; } 80% { opacity: 0.3; fill: currentColor; } 100% { opacity: 0.3; } }

        .nav-link:hover .icon-training .stopwatch-hand { animation: timerSpin 1s linear infinite; transform-origin: 12px 12px; }
        @keyframes timerSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .nav-link:hover .icon-simulation .wind-line-1 { animation: windSpeed 0.8s linear infinite; }
        .nav-link:hover .icon-simulation .wind-line-2 { animation: windSpeed 0.8s linear infinite 0.1s; }
        .nav-link:hover .icon-simulation .wind-line-3 { animation: windSpeed 0.8s linear infinite 0.2s; }
        .nav-link:hover .icon-simulation .wind-obj { stroke: #fff; }
        @keyframes windSpeed { from { stroke-dashoffset: 20; opacity: 0.2; } to { stroke-dashoffset: 0; opacity: 1; stroke: #fff; } }

        .nav-link:hover .icon-events .flag-pole { animation: waveFlag 1s ease-in-out infinite alternate; transform-origin: left center; }
        @keyframes waveFlag { 0% { transform: scaleX(1) skewY(0deg); } 100% { transform: scaleX(0.95) skewY(-10deg); stroke: #fff; } }

        .nav-link:hover .icon-training-plan .line-1 { animation: loadLine 0.8s ease infinite; }
        .nav-link:hover .icon-training-plan .line-2 { animation: loadLine 0.8s ease infinite 0.2s; }
        .nav-link:hover .icon-training-plan .line-3 { animation: loadLine 0.8s ease infinite 0.4s; }
        @keyframes loadLine { 0% { opacity: 0.3; } 50% { opacity: 1; stroke: #fff; transform: translateX(2px); } 100% { opacity: 0.3; } }

        .nav-link:hover .icon-route .arrow-plane { animation: flyPlane 1s ease-in-out infinite alternate; stroke: #fff; transform-origin: center; }
        @keyframes flyPlane { from { transform: translate(0,0); } to { transform: translate(2px, -2px) rotate(5deg); } }

        .nav-link:hover .icon-segment .elev-bar-1 { animation: equalizerWave 1s ease infinite alternate; fill: #fff; }
        .nav-link:hover .icon-segment .elev-bar-2 { animation: equalizerWave 1s ease infinite alternate 0.15s; fill: #fff; }
        .nav-link:hover .icon-segment .elev-bar-3 { animation: equalizerWave 1s ease infinite alternate 0.3s; fill: #fff; }
        .nav-link:hover .icon-segment .elev-bar-4 { animation: equalizerWave 1s ease infinite alternate 0.45s; fill: #fff; }
        .nav-link:hover .icon-segment .elev-bar-5 { animation: equalizerWave 1s ease infinite alternate 0.6s; fill: #fff; }
        @keyframes equalizerWave { 0% { transform: scaleY(0.4); opacity: 0.6; } 100% { transform: scaleY(1); opacity: 1; transform-origin: bottom; } }

        .nav-link:hover .icon-friends .friend-pop { animation: popFriend 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite alternate; stroke: #fff; }
        @keyframes popFriend { from { transform: scale(0.9); opacity: 0.5; transform-origin: center; } to { transform: scale(1.1); opacity: 1; } }

        .nav-link:hover .icon-compare .arrow-tr { animation: expandTr 0.8s ease infinite alternate; stroke: #fff; }
        .nav-link:hover .icon-compare .arrow-bl { animation: expandBl 0.8s ease infinite alternate; stroke: #fff; }
        @keyframes expandTr { to { transform: translate(2px, -2px); } }
        @keyframes expandBl { to { transform: translate(-2px, 2px); } }

        .nav-link:hover .icon-map .gps-dot { fill: #fff; }
        .nav-link:hover .icon-map .gps-ring-1 { animation: radarPulse 1.5s ease-out infinite; stroke: #fff; fill: transparent; }
        .nav-link:hover .icon-map .gps-ring-2 { animation: radarPulse 1.5s ease-out infinite 0.4s; stroke: #fff; fill: transparent; }
        @keyframes radarPulse { 0% { transform: scale(0.1); opacity: 1; transform-origin: center; stroke-width: 2px; } 100% { transform: scale(1); opacity: 0; transform-origin: center; stroke-width: 0px; } }

        .nav-link:hover .icon-algo .chip-core { animation: corePulse 0.8s ease infinite alternate; fill: #fff; }
        .nav-link:hover .icon-algo .chip-legs { animation: legsGlow 0.8s ease infinite alternate; stroke: #fff; }
        @keyframes corePulse { from { opacity: 0.3; } to { opacity: 1; } }
        @keyframes legsGlow { from { opacity: 0.5; } to { opacity: 1; stroke-width: 2px; } }

        .nav-link:hover .icon-world .net-center { fill: #fff; }
        .nav-link:hover .icon-world .net-link-1 { animation: pulseLink 2s ease infinite alternate; stroke: #fff; }
        .nav-link:hover .icon-world .net-link-2 { animation: pulseLink 2s ease infinite alternate 0.3s; stroke: #fff; }
        .nav-link:hover .icon-world .net-link-3 { animation: pulseLink 2s ease infinite alternate 0.6s; stroke: #fff; }
        .nav-link:hover .icon-world .net-node-1 { animation: pulseNode 2s ease infinite alternate; fill: #fff; }
        .nav-link:hover .icon-world .net-node-2 { animation: pulseNode 2s ease infinite alternate 0.3s; fill: #fff; }
        .nav-link:hover .icon-world .net-node-3 { animation: pulseNode 2s ease infinite alternate 0.6s; fill: #fff; }
        @keyframes pulseLink { 0% { stroke-dashoffset: 10; opacity: 0.3; } 100% { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes pulseNode { 0% { opacity: 0.3; r: 1.5; } 100% { opacity: 1; r: 2.2; } }

        .nav-link:hover .icon-profile .scan-beam { animation: scanDown 1.5s linear infinite; stroke: #fff; }
        .nav-link:hover .icon-profile .id-head { stroke: #fff; transition: stroke 0.3s; }
        @keyframes scanDown { 0% { transform: translateY(0); opacity: 0; } 20%, 80% { opacity: 1; } 100% { transform: translateY(12px); opacity: 0; } }

        /* HOVER EFFECTS - WHITE ONLY */
        .nav-link:hover .link-text,
        .nav-link:hover svg, .nav-link:hover svg path, .nav-link:hover svg rect, .nav-link:hover svg circle, .nav-link:hover svg line, .nav-link:hover svg polygon, .nav-link:hover svg g {
            color: #ffffff !important; stroke: #ffffff !important; fill: rgba(255,255,255,0) !important;
        }
        .nav-link:hover svg .chip-core, .nav-link:hover svg .cal-day-1, .nav-link:hover svg .cal-day-2,
        .nav-link:hover svg .cal-day-3, .nav-link:hover svg .cal-day-4, .nav-link:hover svg .gps-dot,
        .nav-link:hover svg .net-center, .nav-link:hover svg .net-node-1, .nav-link:hover svg .net-node-2,
        .nav-link:hover svg .net-node-3, .nav-link:hover svg .elev-bar-1, .nav-link:hover svg .elev-bar-2,
        .nav-link:hover svg .elev-bar-3, .nav-link:hover svg .elev-bar-4, .nav-link:hover svg .elev-bar-5 {
            fill: #ffffff !important; stroke: none !important;
        }
        .nav-link:hover .link-text { transform: translateX(3px); }
      `}</style>

      {/* --- BOUTON MOBILE --- */}
      <button 
        className="md:hidden fixed top-3 left-3 z-[100] bg-[#0f0f14]/90 backdrop-blur-md border border-white/10 text-white p-2 rounded-lg cursor-pointer"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* --- OVERLAY MOBILE --- */}
      <div 
        className={`md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* --- SIDEBAR CONTAINER --- */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen bg-[#0a0a0c] border-r border-white/5 flex flex-col z-50 transition-all duration-400 ease-[cubic-bezier(0.2,0,0,1)] overflow-x-hidden
          ${isMobileMenuOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full md:translate-x-0'}
          ${isSidebarOpen ? 'md:w-[210px]' : 'md:w-[72px]'}
          ${isLocked ? 'opacity-40 pointer-events-none grayscale-[80%]' : ''}
        `}
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* HEADER : LOGO */}
        <div className={`flex items-center px-4 h-[72px] shrink-0 ${!isSidebarOpen && !isMobileMenuOpen ? 'md:justify-center' : 'justify-start'}`}>
            <Link href="/dashboard" className="flex items-center gap-2 group outline-none">
                {!isSidebarOpen && !isMobileMenuOpen ? (
                     <span className="text-[1.4rem] font-black text-[#d04fd7]">P</span>
                ) : (
                    <>
                        <span className="text-[1.4rem] font-[800] tracking-[-0.5px] bg-gradient-to-br from-[#d04fd7] to-white bg-clip-text text-transparent group-hover:tracking-[2px] transition-all duration-300 whitespace-nowrap">PULSAR</span>
                        <span className="text-[0.6rem] px-[5px] py-[1px] rounded bg-[#d04fd7]/10 border border-[#d04fd7]/30 text-[#d04fd7] font-bold mt-[2px]">DEV</span>
                    </>
                )}
            </Link>
        </div>

        {/* NAVIGATION SCROLLABLE */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {groups.map((group, index) => (
            <div key={index} className={isSidebarOpen || isMobileMenuOpen ? 'mb-6' : 'mb-1.5'}>
              {/* TITRE DU GROUPE */}
              <div className={`flex items-center mb-2.5 h-4 ${!isSidebarOpen && !isMobileMenuOpen ? 'justify-center' : 'pl-3.5'}`}>
                 {!isSidebarOpen && !isMobileMenuOpen ? (
                    <div className="w-5 h-[2px] bg-gradient-to-r from-[#d04fd7] to-transparent opacity-50" />
                 ) : (
                    <span className="text-[0.6rem] uppercase font-[800] tracking-[1px] bg-gradient-to-r from-[#d04fd7] to-[#a0a0a0] bg-clip-text text-transparent whitespace-nowrap">
                        {group.title}
                    </span>
                 )}
              </div>
              
              {/* LIENS DU GROUPE */}
              <ul className="space-y-1">
                {group.links.map((link) => {
                  const isActive = pathname?.startsWith(link.href) ?? false;
                  const isHoveredLink = hoveredLink === link.href;

                  return (
                    <li key={link.href} className={!isSidebarOpen && !isMobileMenuOpen ? 'mb-[2px]' : 'mb-1'}>
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        onMouseEnter={() => setHoveredLink(link.href)}
                        onMouseLeave={() => setHoveredLink(null)}
                        className={`nav-link group relative flex items-center mx-2 rounded-lg transition-all duration-200 overflow-hidden cursor-pointer
                          ${!isSidebarOpen && !isMobileMenuOpen ? 'justify-center p-2' : 'justify-start px-3 py-[0.55rem]'}
                          ${isActive ? 'bg-[#d04fd7]/10' : isHoveredLink ? 'bg-white/5' : 'bg-transparent'}
                        `}
                      >
                        {isActive && <div className="absolute left-0 top-[20%] h-[60%] w-[3px] bg-[#d04fd7] rounded-r-md shadow-[0_0_8px_#d04fd7]" />}
                        
                        <span className={`link-icon flex transition-colors duration-200 min-w-[18px] shrink-0
                            ${!isSidebarOpen && !isMobileMenuOpen ? 'mr-0' : 'mr-3'} 
                            ${isActive ? 'text-[#d04fd7]' : 'text-white/60'}
                        `}>
                          {link.icon}
                        </span>
                        
                        <span className={`link-text text-[0.85rem] transition-all duration-300 whitespace-nowrap overflow-hidden
                            ${isActive ? 'font-semibold text-white' : 'font-normal text-white/80'}
                            ${!isSidebarOpen && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                        `}>
                          {link.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* SECTION ADMIN */}
          {isAdmin && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <div className={`flex items-center mb-2.5 h-4 ${!isSidebarOpen && !isMobileMenuOpen ? 'justify-center' : 'pl-3.5'}`}>
                 {!isSidebarOpen && !isMobileMenuOpen ? (
                    <div className="w-5 h-[2px] bg-[#d04fd7] mx-auto" />
                 ) : (
                    <span className="text-[0.6rem] uppercase font-[800] tracking-[1px] bg-gradient-to-r from-[#d04fd7] to-[#a0a0a0] bg-clip-text text-transparent whitespace-nowrap">
                        ADMINISTRATION
                    </span>
                 )}
              </div>
              <ul className="space-y-1">
                <li className={!isSidebarOpen && !isMobileMenuOpen ? 'mb-[2px]' : 'mb-1'}>
                  <Link
                    href="/admin"
                    onMouseEnter={() => setHoveredLink('/admin')}
                    onMouseLeave={() => setHoveredLink(null)}
                    className={`nav-link group relative flex items-center mx-2 rounded-lg transition-all duration-200 overflow-hidden cursor-pointer
                      ${!isSidebarOpen && !isMobileMenuOpen ? 'justify-center p-2' : 'justify-start px-3 py-[0.55rem]'}
                      ${pathname === '/admin' ? 'bg-[#d04fd7]/10' : hoveredLink === '/admin' ? 'bg-white/5' : 'bg-transparent'}
                    `}
                  >
                    {pathname === '/admin' && <div className="absolute left-0 top-[20%] h-[60%] w-[3px] bg-[#d04fd7] rounded-r-md shadow-[0_0_8px_#d04fd7]" />}
                    <span className={`link-icon flex transition-colors duration-200 min-w-[18px] shrink-0
                        ${!isSidebarOpen && !isMobileMenuOpen ? 'mr-0' : 'mr-3'} 
                        ${pathname === '/admin' ? 'text-[#d04fd7]' : 'text-white/60'}
                    `}>
                      {Icons.Admin}
                    </span>
                    <span className={`link-text text-[0.85rem] transition-all duration-300 whitespace-nowrap overflow-hidden
                        ${pathname === '/admin' ? 'font-semibold text-white' : 'font-normal text-white/80'}
                        ${!isSidebarOpen && !isMobileMenuOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                    `}>
                      Command Center
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* --- ZONE DU BAS : PIN BUTTON & USER --- */}
        <div className="mt-auto border-t border-white/5 bg-black/20 shrink-0">
            
            {/* BOUTON PIN (Desktop Seulement, visible quand ouvert) */}
            {(isSidebarOpen || isMobileMenuOpen) && (
                <div className="hidden md:flex justify-end px-4 py-2">
                     <button
                        onClick={togglePin}
                        title={isPinned ? "Détacher la barre" : "Épingler la barre"}
                        className={`p-1.5 rounded-md border transition-all flex items-center justify-center cursor-pointer 
                            ${isPinned ? 'bg-white/10 text-[#d04fd7] border-white/20' : 'bg-transparent text-white/50 border-white/10 hover:bg-white/5 hover:text-white hover:border-white/20'}
                        `}
                     >
                        {isPinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
                     </button>
                </div>
            )}

            {/* USER PROFILE */}
            {session?.user && (
            <div className={`flex justify-center transition-all ${!isSidebarOpen && !isMobileMenuOpen ? 'p-4' : 'px-4 pb-4 pt-2'}`}>
                <div className="flex items-center w-full">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2a2a35] to-[#151520] border border-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                        {session.user.image ? (
                            <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            session.user.name?.charAt(0) || 'R'
                        )}
                    </div>
                    
                    {/* Infos (Nom & Role) */}
                    <div className={`overflow-hidden transition-all duration-300 flex flex-col justify-center
                        ${!isSidebarOpen && !isMobileMenuOpen ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-2.5'}
                    `}>
                        <div className="text-[0.85rem] font-semibold text-white truncate max-w-[120px]">
                            {session.user.name}
                        </div>
                        <div className="text-[0.65rem] text-white/50 flex items-center mt-[-2px]">
                            <Zap size={10} className="mr-[3px] fill-amber-400 stroke-none" />
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