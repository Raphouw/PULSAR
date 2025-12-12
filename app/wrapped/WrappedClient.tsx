'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ArrowRight, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { WrappedStats } from '../../types/wrapped';
import dynamic from 'next/dynamic';
// --- IMPORTS DES SLIDES ---
// (Décommente les lignes au fur et à mesure qu'on crée les fichiers)

import SlideIntro from './slides/Slide0_Intro';          // Slide 0
import SlideBootUp from './slides/Slide1_BootUp';        // Slide 1
import SlidePowerDNA from './slides/Slide2_PowerDNA';    // Slide 2

import SlideCPCurve from './slides/Slide3_CPCurve';      // Slide 3
import SlideMaxEfforts from './slides/Slide4_MaxEfforts';// Slide 4
import SlidePacing from './slides/Slide5_Pacing';        // Slide 5
import SlideTIZ from './slides/Slide6_TIZ';              // Slide 6
import SlideCharge from './slides/Slide7_Charge';        // Slide 7
import SlideTSS from './slides/Slide8_TSS';              // Slide 8
import SlideMonster from './slides/Slide9_Monster';      // Slide 9
import SlideResilience from './slides/Slide10_Resilience';// Slide 10
import SlideSegPower from './slides/Slide11_SegPower';   // Slide 11
import SlideAero from './slides/Slide12_Aero';           // Slide 12
import SlideBiomech from './slides/Slide13_Biomech';     // Slide 13
import SlideClimbing from './slides/Slide14_Climbing';// Slide 14
import SlideTerritories from './slides/Slide15_Territories';// Slide 15
import SlideEvolution from './slides/Slide16_Evolution'; // Slide 16
import SlideRobustness from './slides/Slide17_Robustness';// Slide 17
import SlideComparison from './slides/Slide18_Comparison';// Slide 18
import SlideProjection from './slides/Slide19_Projection';// Slide 19
import SlideEgoDopa from './slides/Slide20_FinalRecap';     // Slide 20

const SlideDomain = dynamic(() => import('./slides/Slide21_Domain'), { 
  ssr: false, // 🔥 Désactive le rendu serveur pour Leaflet
  loading: () => <div className="h-full w-full bg-black animate-pulse" /> 
});

// --- ANIMATIONS ---
const slideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.9,
    filter: 'blur(10px)',
    zIndex: 0
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    zIndex: 1,
    transition: { duration: 0.6, type: "spring", stiffness: 90, damping: 20 }
  },
  exit: (dir: number) => ({
    x: dir < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 1.1,
    filter: 'blur(20px)',
    zIndex: 0,
    transition: { duration: 0.4 }
  })
};

export default function WrappedClient({ stats }: { stats: WrappedStats }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(0);
  const router = useRouter();

  // --- LOGIQUE DE NAVIGATION (Définie AVANT les slides) ---
  
  const next = () => { 
    setDir(1); 
    setStep(s => s + 1); 
  };
  
  const prev = () => { 
    if (step > 0) { 
        setDir(-1); 
        setStep(s => s - 1); 
    } 
  };

  const finish = () => router.push('/dashboard');

  // --- LISTE DES SLIDES (Mémoïsée) ---
  const SLIDES = useMemo(() => [
    // 0. Intro
    <SlideIntro key="intro" stats={stats} onNext={next} />,
    <SlideBootUp key="bootup" stats={stats} />,
    <SlidePowerDNA key="dna" stats={stats} />,
    <SlideCPCurve key="cp" stats={stats} />,
    <SlideMaxEfforts key="maxefforts" stats={stats} />,
    <SlidePacing key="Pacing" stats={stats}/>,
    <SlideTIZ key="tiz" stats={stats}/>,
    <SlideCharge key="charge" stats={stats} />,
    <SlideTSS key ="TSS" stats={stats}/>,
    <SlideMonster key ="monster" stats={stats}/>,
    <SlideResilience key ="resilience" stats={stats}/>,
    <SlideSegPower key ="seg" stats={stats}/>,
    <SlideAero key ="aero" stats={stats}/>,
    <SlideBiomech key ="Biomech" stats={stats}/>,
    <SlideClimbing key ="climb" stats={stats}/>,
    <SlideTerritories key ="teritory" stats={stats}/>,
    <SlideEvolution key ="Evolution" stats={stats}/>,
    <SlideRobustness key ="Robust" stats={stats}/>,
    <SlideComparison key ="compar" stats={stats}/>,
    <SlideProjection key ="projection" stats={stats}/>,
    <SlideDomain key ="Domain" stats={stats}/>,
    <SlideEgoDopa key ="Share" stats={stats}/>,

    // <SlideEgoDopa key="ego" stats={stats} />

  ], [stats]); // 'next' est stable, pas besoin de le mettre en dépendance si défini hors du useMemo ou s'il utilise des setters stables

  const TOTAL_STEPS = SLIDES.length;

  // Wrapper pour gérer la fin de la séquence
  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) next();
    else finish();
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') handleNext();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [step, TOTAL_STEPS]);

  // Calcul progression (0 à 100%)
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    // FIX IMMERSION : Z-Index max pour passer au-dessus de tout
    <div className="fixed inset-0 z-[9999] h-screen w-screen overflow-hidden bg-[#02040a] text-white font-sans selection:bg-cyan-500 flex flex-col">
      
      {/* --- BACKGROUND WORLD TOUR --- */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[length:50px_50px] opacity-[0.03] pointer-events-none z-0 [mask-image:linear-gradient(to_bottom,transparent,black)]" />
      {/*<div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] pointer-events-none z-0 mix-blend-overlay" />*/}
      
      {/* Spotlights */}
      <div className="absolute -top-[20%] left-[20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute -bottom-[20%] right-[20%] w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      {/* --- HEADER --- */}
      <header className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
            <div className="flex gap-1 h-3">
                <div className="w-1 bg-cyan-500 animate-pulse" />
                <div className="w-1 bg-purple-500 animate-pulse delay-75" />
                <div className="w-1 bg-white animate-pulse delay-150" />
            </div>
            <div className="text-xs font-bold tracking-[0.3em] text-gray-400 uppercase">
                PULSAR <span className="text-cyan-400">///</span> DATA RECAP
            </div>
        </div>
        
        <button 
            onClick={finish} 
            className="group flex items-center gap-3 px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md"
        >
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">QUITTER</span>
            <div className="bg-white/10 p-1 rounded-full group-hover:bg-white/20 transition-colors">
                <X size={12} className="text-white" />
            </div>
        </button>
      </header>

      {/* --- MAIN STAGE --- */}
      <main className="flex-1 relative flex items-center justify-center w-full h-full perspective-1000">
        {SLIDES[step] ? (
            <AnimatePresence initial={false} custom={dir} mode="wait">
            <motion.div
                key={step}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute w-full h-full flex items-center justify-center p-4 md:p-8"
            >
                {SLIDES[step]}
            </motion.div>
            </AnimatePresence>
        ) : (
            <div className="text-red-500 font-mono border border-red-500 p-4 rounded">
                SLIDE {step + 1} NON DISPONIBLE
            </div>
        )}
      </main>

      {/* --- FOOTER CONTROLS --- */}
      <footer className="absolute bottom-0 left-0 w-full p-8 z-50">
        <div className="max-w-[90%] mx-auto flex items-end justify-between gap-8">
            
            {/* PROGRESS BAR */}
            <div className="flex-1 flex flex-col gap-3 pb-2">
                <div className="flex justify-between items-end">
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                        SLIDE <span className="text-white font-bold">{String(step + 1).padStart(2, '0')}</span> / {String(TOTAL_STEPS).padStart(2, '0')}
                    </div>
                    <div className="text-xs font-bold text-cyan-400 font-mono">
                        {progress.toFixed(0)}%
                    </div>
                </div>
                
                {/* Barre segmentée */}
                <div className="flex gap-1 h-1 w-full">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div 
                            key={i} 
                            className={`flex-1 rounded-sm transition-all duration-500 ${
                                i < step ? 'bg-cyan-500' : 
                                i === step ? 'bg-white shadow-[0_0_10px_white]' : 
                                'bg-white/10'
                            }`} 
                        />
                    ))}
                </div>
            </div>

            {/* NAVIGATION */}
            <div className="flex gap-3 pl-8">
                <button 
                    onClick={prev} 
                    disabled={step === 0}
                    className="w-12 h-12 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all backdrop-blur-md"
                >
                    <ChevronLeft size={20} />
                </button>
                <button 
                    onClick={handleNext}
                    className="h-12 px-6 flex items-center justify-center gap-2 rounded-full bg-white text-black font-bold hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all active:scale-95"
                >
                    <span className="text-xs tracking-widest uppercase">{step === TOTAL_STEPS - 1 ? 'TERMINER' : 'SUIVANT'}</span>
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
      </footer>

    </div>
  );
}