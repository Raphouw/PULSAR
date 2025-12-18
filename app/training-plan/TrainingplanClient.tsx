// Fichier : app/training-plan/TrainingplanClient.tsx
"use client"

import React, { useState, useMemo, useEffect } from "react"
import { 
  Clock, Zap, Plus, Mountain, Activity, TrendingUp, 
  BarChart3, Dumbbell, Play, CalendarCheck, CheckCircle2, 
  Battery, AlertCircle, ArrowRight, Download, FileText, X,
  Gauge, User
} from "lucide-react"

import { supabase } from '../../lib/supabaseClient'

// Import des types partagés
import { TrainingPlan, TrainingWeek, Workout, Zone } from "./types"
// Import du Wizard
import CreatePlanWizard from "./createPlanWizard"

// --- EXTENSION DES TYPES POUR CETTE VUE ---
// Interface étendue pour inclure les propriétés spécifiques au rendu (steps, if_est)
// qui ne sont pas forcément dans le type de base BDD stricto sensu
interface WorkoutStep {
    duration_s: number;
    power_pct: number;
    type: 'warmup' | 'steady' | 'interval' | 'rest' | 'cooldown' | 'ramp';
    label?: string;
}

interface DetailedWorkout extends Workout {
    steps: WorkoutStep[];
    if_est?: number; 
}

// --- UTILS : EXPORT ZWIFT (.ZWO) ---
const generateZwoFile = (workout: DetailedWorkout, author: string = "PULSAR") => {
    let xml = `<workout_file>\n    <author>${author}</author>\n    <name>${workout.name}</name>\n    <description>Exported from Pulsar</description>\n    <sportType>bike</sportType>\n    <workout>`;
    workout.steps.forEach(step => {
        const power = step.power_pct / 100;
        if (step.type === 'warmup') xml += `\n        <Warmup Duration="${step.duration_s}" PowerLow="0.25" PowerHigh="${power}" />`;
        else if (step.type === 'cooldown') xml += `\n        <Cooldown Duration="${step.duration_s}" PowerLow="${power}" PowerHigh="0.25" />`;
        else xml += `\n        <SteadyState Duration="${step.duration_s}" Power="${power}" />`;
    });
    xml += `\n    </workout>\n</workout_file>`;
    return xml;
};

const downloadWorkout = (workout: DetailedWorkout) => {
    const blob = new Blob([generateZwoFile(workout)], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workout.name.replace(/\s+/g, '_')}.zwo`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// --- MOCK DATA (CATALOGUE PULSAR) ---
const MOCK_PLANS: (TrainingPlan & { weeks: { workouts: DetailedWorkout[] }[] })[] = [
  {
    id: "plan_mount_1",
    name: "GRIMPEUR D'ÉLITE",
    description: "Cycle intensif focalisé sur le rapport W/kg et la tolérance au lactate.",
    category: "Montagne",
    duration_weeks: 4,
    total_tss: 1850,
    avg_hours_week: 8,
    compatibility_score: 92,
    weekly_load_progression: [450, 520, 380, 600], 
    zone_distribution: { Z1: 20, Z2: 40, Z3: 15, Z4: 20, Z5: 5, Z6: 0 },
    tags: ["Seuil", "W/kg", "Endurance de Force"],
    is_active: false,
    weeks: [
      {
        week_number: 1, theme: "Construction",
        workouts: [
          { 
              id: "w1_1", name: "Torque 40rpm", duration_s: 3600, tss: 60, dominant_zone: "Z3", day_number: 2, completed: true, if_est: 0.75,
              steps: [{ type: 'warmup', duration_s: 600, power_pct: 50 }, { type: 'steady', duration_s: 600, power_pct: 75 }, { type: 'rest', duration_s: 300, power_pct: 55 }, { type: 'steady', duration_s: 600, power_pct: 75 }, { type: 'cooldown', duration_s: 1500, power_pct: 50 }]
          },
          { 
              id: "w1_2", name: "Endurance Z2", duration_s: 5400, tss: 70, dominant_zone: "Z2", day_number: 4, completed: true, if_est: 0.65,
              steps: [{ type: 'steady', duration_s: 5400, power_pct: 65 }]
          },
          { 
              id: "w1_3", name: "Seuil 2x10", duration_s: 4500, tss: 90, dominant_zone: "Z4", day_number: 6, if_est: 0.88,
              steps: [{ type: 'warmup', duration_s: 900, power_pct: 55 }, { type: 'interval', duration_s: 600, power_pct: 95 }, { type: 'rest', duration_s: 600, power_pct: 50 }, { type: 'interval', duration_s: 600, power_pct: 95 }, { type: 'cooldown', duration_s: 1800, power_pct: 60 }]
          },
          { 
              id: "w1_4", name: "Sortie Longue", duration_s: 10800, tss: 180, dominant_zone: "Z2", day_number: 7, if_est: 0.70,
              steps: [{ type: 'steady', duration_s: 10800, power_pct: 70 }]
          },
        ]
      },
      {
        week_number: 2, theme: "Surcharge",
        workouts: [
          { id: "w2_1", name: "Over-Under", duration_s: 3600, tss: 85, dominant_zone: "Z4", day_number: 2, if_est: 0.90, steps: [{type:'steady', duration_s: 3600, power_pct: 85}] }, // Simplified steps for mock
          { id: "w2_2", name: "Récup Active", duration_s: 2700, tss: 30, dominant_zone: "Z1", day_number: 3, if_est: 0.50, steps: [{type:'steady', duration_s: 2700, power_pct: 50}] },
          { id: "w2_3", name: "Montagne Sim.", duration_s: 7200, tss: 140, dominant_zone: "Z3", day_number: 6, if_est: 0.80, steps: [{type:'steady', duration_s: 7200, power_pct: 75}] },
        ]
      }
    ]
  }
];

// --- STYLES & HELPERS ---
const ZONE_COLORS: Record<Zone, string> = { Z1: "#a0a0a0", Z2: "#3b82f6", Z3: "#10b981", Z4: "#f59e0b", Z5: "#ef4444", Z6: "#d04fd7" };
const CATEGORY_ICONS: Record<string, React.ElementType> = { 
    'Montagne': Mountain, 'Endurance': Activity, 'Explosivité': Zap, 
    'Force': Dumbbell, 'Seuil': TrendingUp, 'Perso': User 
};
const formatDuration = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${m > 0 ? m : ''}` : `${m}m`; };

const WorkoutProfileGraph = ({ steps }: { steps: WorkoutStep[] }) => {
    const totalDuration = steps.reduce((acc, s) => acc + s.duration_s, 0);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: '1px', width: '100%' }}>
            {steps.map((s, i) => (
                <div key={i} style={{
                    height: `${Math.min((s.power_pct / 150) * 100, 100)}%`, width: `${(s.duration_s / totalDuration) * 100}%`,
                    background: ZONE_COLORS[s.power_pct < 60 ? 'Z1' : s.power_pct < 76 ? 'Z2' : s.power_pct < 90 ? 'Z3' : s.power_pct < 105 ? 'Z4' : s.power_pct < 120 ? 'Z5' : 'Z6'],
                    opacity: 0.8, borderRadius: '1px 1px 0 0'
                }} />
            ))}
        </div>
    );
};

// --- COMPOSANT NOTIFICATION ---
const NeonNotification = ({ message, onClose }: { message: string, onClose: () => void }) => (
    <div style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
        background: 'rgba(10,10,15,0.95)', border: '1px solid #d04fd7',
        boxShadow: '0 0 20px rgba(208, 79, 215, 0.4)', borderRadius: '12px',
        padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem',
        animation: 'slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
        <div style={{width: '10px', height: '10px', borderRadius: '50%', background: '#d04fd7', boxShadow: '0 0 10px #d04fd7'}} />
        <span style={{color: '#fff', fontWeight: 700}}>{message}</span>
        <button onClick={onClose} style={{background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginLeft: '10px'}}>✕</button>
    </div>
);

const getMainSetDescription = (workout: DetailedWorkout) => {
    if (!workout.steps || workout.steps.length === 0) return "Séance libre";
    const efforts = workout.steps.filter(s => s.type === 'interval' || (s.type === 'steady' && s.power_pct > 70));
    if (efforts.length === 0) return "Endurance continue";
    const count = efforts.length;
    const duration = formatDuration(efforts[0].duration_s);
    const zone = efforts[0].power_pct > 105 ? "Z5/Z6" : efforts[0].power_pct > 90 ? "Z4" : "Z3";
    return count === 1 ? `Bloc ${duration} @ ${zone}` : `${count}x ${duration} @ ${zone}`;
};

// --- COMPOSANTS UI ---

const MiniVolumeChart = ({ data }: { data: number[] }) => {
    const max = Math.max(...data, 1);
    const barWidth = 5; const gap = 2; const totalWidth = data.length * (barWidth + gap);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '30px', gap: `${gap}px`, width: `${totalWidth}px`, maxWidth: '140px', minWidth: '40px', justifyContent: 'flex-end' }}>
            {data.map((val, i) => (
                <div key={i} style={{ width: '100%', height: `${(val / max) * 100}%`, background: i === data.length - 1 ? '#fff' : 'rgba(255,255,255,0.4)', borderRadius: '1px', minHeight: '2px' }} />
            ))}
        </div>
    );
};

const WorkoutCard = ({ workout, onClick, userFtp = 250 }: { workout: DetailedWorkout, onClick: () => void, userFtp?: number }) => {
    const [isHovered, setIsHovered] = useState(false);
    const zoneColor = ZONE_COLORS[workout.dominant_zone];
    
    const intensityFactor = workout.if_est || 0.7;
    const targetWatts = Math.round(userFtp * intensityFactor);
    const isCompleted = workout.completed;
    const kj = Math.round((targetWatts * workout.duration_s) / 1000);
    const mainSet = getMainSetDescription(workout);

    return (
        <div 
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                aspectRatio: '1/1',
                borderRadius: '12px',
                position: 'relative', 
                cursor: 'pointer', 
                transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
                transform: isHovered ? 'scale(1.45) translateY(-10px)' : 'scale(1)',
                zIndex: isHovered ? 100 : 1,
                boxShadow: isHovered ? `0 25px 50px -12px ${zoneColor}60` : isCompleted ? 'none' : `0 4px 15px -5px ${zoneColor}10`,
                background: isHovered ? '#121217' : (isCompleted ? 'rgba(20,20,25,0.6)' : `linear-gradient(160deg, rgba(30, 30, 40, 0.9) 0%, ${zoneColor}10 100%)`),
                border: isCompleted ? '1px solid #10b981' : isHovered ? `2px solid ${zoneColor}` : `1px solid ${zoneColor}40`,
                overflow: 'hidden'
            }} 
        >
            <div style={{
                position: 'absolute', inset: 0, padding: '10px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                opacity: isHovered ? 0 : 1, transition: 'opacity 0.1s ease',
            }}>
                <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                        <div style={{fontSize: '0.55rem', fontWeight: 900, color: '#000', background: zoneColor, padding: '2px 6px', borderRadius: '4px'}}>
                            {workout.dominant_zone}
                        </div>
                        {isCompleted && <CheckCircle2 size={14} color="#10b981" />}
                        {!isCompleted && <div style={{fontSize: '0.6rem', color: '#aaa', display: 'flex', gap:'2px'}}><Gauge size={10}/> {intensityFactor.toFixed(2)}</div>}
                    </div>
                    <div style={{fontSize: '0.8rem', fontWeight: 700, color: '#fff', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                        {workout.name}
                    </div>
                </div>
                <div style={{textAlign: 'center'}}>
                    <div style={{fontSize: '1.6rem', fontWeight: 900, color: '#fff', letterSpacing: '-1px'}}>
                        {formatDuration(workout.duration_s)}
                    </div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '4px'}}>
                    <div style={{textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)'}}>
                        <div style={{fontSize: '0.55rem', color: '#888', fontWeight: 700}}>WATTS</div>
                        <div style={{fontSize: '0.8rem', color: '#00f3ff', fontWeight: 700}}>{targetWatts}</div>
                    </div>
                    <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: '0.55rem', color: '#888', fontWeight: 700}}>TSS</div>
                        <div style={{fontSize: '0.8rem', color: '#d04fd7', fontWeight: 700}}>{workout.tss}</div>
                    </div>
                </div>
            </div>

            <div style={{
                position: 'absolute', inset: 0, 
                background: `linear-gradient(180deg, rgba(20,20,30,1) 0%, ${zoneColor}15 100%)`,
                padding: '12px', display: 'flex', flexDirection: 'column',
                opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s ease 0.1s', pointerEvents: 'none'
            }}>
                <div style={{fontSize: '0.6rem', fontWeight: 800, color: zoneColor, textTransform: 'uppercase', marginBottom: '2px'}}>
                    {workout.dominant_zone} • {workout.tss} TSS
                </div>
                <div style={{fontSize: '0.95rem', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 'auto'}}>
                    {workout.name}
                </div>
                <div style={{marginBottom: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px', borderLeft: `2px solid ${zoneColor}`}}>
                    <div style={{fontSize: '0.5rem', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px'}}>MAIN SET</div>
                    <div style={{fontSize: '0.8rem', fontWeight: 600, color: '#fff', lineHeight: 1.3}}>
                        {mainSet}
                    </div>
                </div>
                <div style={{height: '50px', width: '100%', marginBottom: '8px', display: 'flex', alignItems: 'flex-end'}}>
                     <WorkoutProfileGraph steps={workout.steps || []} />
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#fff'}}>
                        <Zap size={10} color="#ffeb3b" /> {kj} kJ
                    </div>
                    <div style={{fontSize: '0.6rem', color: '#aaa', fontWeight: 600}}>
                        CLIQUER +
                    </div>
                </div>
            </div>
        </div>
    );
};

const RestDayCard = () => (
    <div style={{
        aspectRatio: '1/1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(255,255,255,0.02)',
        backgroundImage: `linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.03) 75%, transparent 75%, transparent)`,
        backgroundSize: '8px 8px', backgroundColor: 'rgba(0,0,0,0.2)'
    }}>
        <div style={{width: '8px', height: '8px', borderRadius: '50%', background: '#333', boxShadow: 'inset 0 0 4px #000'}} />
    </div>
);

const PlanListCard = ({ plan, isSelected, onClick }: { plan: TrainingPlan, isSelected: boolean, onClick: () => void }) => {
    const Icon = CATEGORY_ICONS[plan.category] || BarChart3;
    return (
        <div onClick={onClick} style={{
            padding: '1.2rem', margin: '0.8rem 0', borderRadius: '16px',
            background: isSelected ? 'linear-gradient(90deg, rgba(208, 79, 215, 0.1), rgba(20,20,30,0.8))' : 'rgba(30, 30, 40, 0.6)',
            border: isSelected ? '1px solid #d04fd7' : '1px solid rgba(255,255,255,0.05)',
            cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden'
        }} className="group hover:bg-white/5">
            {isSelected && <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#d04fd7', boxShadow: '0 0 10px #d04fd7'}} />}
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <div style={{width: '36px', height: '36px', borderRadius: '8px', background: isSelected ? '#d04fd7' : 'rgba(255,255,255,0.05)', color: isSelected ? '#000' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <Icon size={18} />
                    </div>
                    <div>
                        <div style={{fontSize: '0.9rem', fontWeight: 800, color: '#fff'}}>{plan.name}</div>
                        <div style={{fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px'}}>{plan.category}</div>
                    </div>
                </div>
                <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '0.9rem', fontWeight: 900, color: plan.compatibility_score > 80 ? '#10b981' : plan.compatibility_score > 50 ? '#f59e0b' : '#ef4444'}}>{plan.compatibility_score}%</div>
                    <div style={{fontSize: '0.5rem', color: '#666'}}>MATCH</div>
                </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '60%'}}>
                    {(plan.tags || []).slice(0, 2).map(tag => (
                        <span key={tag} style={{fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)'}}>{tag}</span>
                    ))}
                </div>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px'}}>
                    <MiniVolumeChart data={plan.weekly_load_progression || []} />
                    <span style={{fontSize: '0.6rem', color: '#666'}}>{plan.duration_weeks} SEM.</span>
                </div>
            </div>
        </div>
    );
};

const ZoneDistributionBar = ({ distribution }: { distribution: Record<Zone, number> }) => {
    return (
        <div style={{width: '100%', height: '8px', display: 'flex', borderRadius: '4px', overflow: 'hidden', marginTop: '5px'}}>
            {(Object.keys(distribution) as Zone[]).map(zone => {
                const width = distribution[zone];
                if (width === 0) return null;
                return <div key={zone} style={{width: `${width}%`, height: '100%', background: ZONE_COLORS[zone], boxShadow: `0 0 5px ${ZONE_COLORS[zone]}40`}} title={`${zone}: ${width}%`} />
            })}
        </div>
    );
};

const WeekVisualizer = ({ week, onWorkoutClick }: { week: TrainingWeek, onWorkoutClick: (w: DetailedWorkout) => void }) => {
    return (
        <div style={{marginBottom: '3rem'}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '1rem', paddingLeft: '4px'}}>
                <div style={{fontSize: '2rem', fontWeight: 900, color: 'rgba(255,255,255,0.1)', lineHeight: 1}}>{String(week.week_number).padStart(2, '0')}</div>
                <h3 style={{fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '1px'}}>{week.theme}</h3>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', alignItems: 'start'}}>
                {["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"].map((d, i) => (
                    <div key={i} style={{textAlign: 'center', fontSize: '0.6rem', color: '#444', fontWeight: 800, marginBottom: '4px'}}>{d}</div>
                ))}
                {Array.from({length: 7}).map((_, dayIndex) => {
                    const workout = week.workouts.find(w => w.day_number === dayIndex + 1);
                    return (
                        <div key={dayIndex} style={{position: 'relative'}}>
                            {workout ? <WorkoutCard workout={workout as DetailedWorkout} onClick={() => onWorkoutClick(workout as DetailedWorkout)} /> : <RestDayCard />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const WorkoutDetailModal = ({ workout, onClose, userFtp = 250 }: { workout: DetailedWorkout, onClose: () => void, userFtp?: number }) => {
    const totalDuration = workout.steps.reduce((acc, s) => acc + s.duration_s, 0);
    const zoneColor = ZONE_COLORS[workout.dominant_zone];
    return (
        <div style={{position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={onClose}>
            <div style={{background: '#121217', width: '90%', maxWidth: '700px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: `0 0 100px ${zoneColor}20`, position: 'relative'}} onClick={e => e.stopPropagation()}>
                <div style={{padding: '2.5rem 2rem', background: `radial-gradient(circle at top right, ${zoneColor}40 0%, #121217 70%)`, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <div>
                        <div style={{display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '30px', background: '#000', border: `1px solid ${zoneColor}`, color: zoneColor, fontSize: '0.75rem', fontWeight: 800, marginBottom: '12px', boxShadow: `0 0 15px ${zoneColor}40`}}>
                            <div style={{width: '8px', height: '8px', borderRadius: '50%', background: zoneColor}} /> {workout.dominant_zone} FOCUS
                        </div>
                        <h2 style={{fontSize: '2.5rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.1, textShadow: '0 4px 10px rgba(0,0,0,0.5)'}}>{workout.name}</h2>
                    </div>
                    <button onClick={onClose} style={{background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s'}} className="hover:bg-white/20"><X size={20} /></button>
                </div>
                <div style={{padding: '2rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.5rem'}}>
                        <div style={{textAlign: 'center', flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)'}}><div style={{fontSize: '0.7rem', fontWeight: 700, color: '#666', marginBottom: '4px'}}>DURÉE</div><div style={{fontSize: '1.5rem', fontWeight: 800, color: '#00f3ff'}}>{formatDuration(workout.duration_s)}</div></div>
                        <div style={{textAlign: 'center', flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)'}}><div style={{fontSize: '0.7rem', fontWeight: 700, color: '#666', marginBottom: '4px'}}>CHARGE</div><div style={{fontSize: '1.5rem', fontWeight: 800, color: '#d04fd7'}}>{workout.tss} <span style={{fontSize:'0.8rem'}}>TSS</span></div></div>
                        <div style={{textAlign: 'center', flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)'}}><div style={{fontSize: '0.7rem', fontWeight: 700, color: '#666', marginBottom: '4px'}}>INTENSITÉ</div><div style={{fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b'}}>{workout.if_est?.toFixed(2) || '-'} <span style={{fontSize:'0.8rem'}}>IF</span></div></div>
                        <div style={{textAlign: 'center', flex: 1}}><div style={{fontSize: '0.7rem', fontWeight: 700, color: '#666', marginBottom: '4px'}}>WATTS EST.</div><div style={{fontSize: '1.5rem', fontWeight: 800, color: '#10b981'}}>{Math.round(userFtp * (workout.if_est || 0.6))} <span style={{fontSize:'0.8rem'}}>W</span></div></div>
                    </div>
                    <h4 style={{fontSize: '0.8rem', color: '#888', marginBottom: '1rem', textTransform: 'uppercase'}}>Structure de la séance</h4>
                    <div style={{height: '180px', display: 'flex', alignItems: 'flex-end', gap: '2px', marginBottom: '2.5rem', background: '#0a0a0e', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative'}}>
                        <div style={{position: 'absolute', top: '33%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.15)', pointerEvents: 'none'}} />
                        <span style={{position: 'absolute', top: '30%', right: '10px', fontSize: '0.6rem', color: '#666'}}>FTP</span>
                        {workout.steps.length > 0 ? workout.steps.map((block, i) => (
                            <div key={i} style={{width: `${(block.duration_s / totalDuration) * 100}%`, height: `${Math.min((block.power_pct / 150) * 100, 100)}%`, background: ZONE_COLORS[block.power_pct < 60 ? 'Z1' : block.power_pct < 76 ? 'Z2' : block.power_pct < 90 ? 'Z3' : block.power_pct < 105 ? 'Z4' : block.power_pct < 120 ? 'Z5' : 'Z6'], borderRadius: '4px 4px 0 0', position: 'relative', opacity: 0.9}} title={`${block.type}: ${Math.floor(block.duration_s/60)}' @ ${block.power_pct}%`} />
                        )) : <div style={{width: '100%', textAlign: 'center', color: '#444', alignSelf: 'center', fontStyle: 'italic'}}>Détail graphique non disponible</div>}
                    </div>
                    <div style={{display: 'flex', gap: '1rem'}}>
                        <button onClick={() => downloadWorkout(workout)} style={{flex: 1, background: 'linear-gradient(90deg, #d04fd7, #9c27b0)', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 30px rgba(208, 79, 215, 0.3)', transition: 'transform 0.2s'}} className="hover:scale-[1.02]"><Download size={20} /> EXPORTER .ZWO (ZWIFT)</button>
                        <button style={{flex: 1, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}><FileText size={18} /> COPIER TEXTE</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function TrainingplanClient({ userId }: { userId: string }) {
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan>(MOCK_PLANS[0]);
  const [view, setView] = useState<'LIST' | 'CREATE'>('LIST');
  const [selectedWorkout, setSelectedWorkout] = useState<DetailedWorkout | null>(null);
  const [userPlans, setUserPlans] = useState<TrainingPlan[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Initialisation des plans
  useEffect(() => {
      const fetchPlans = async () => {
          const { data: plansData } = await supabase.from('training_plans').select('*').eq('user_id', userId);
          if(plansData) {
              const parsed = (plansData as any[]).map(p => ({
                  ...p,
                  weeks: typeof p.structure_json === 'string' ? JSON.parse(p.structure_json) : p.structure_json,
                  tags: p.tags || ["Perso"],
                  weekly_load_progression: p.weekly_load_progression || [0,0,0,0],
                  zone_distribution: p.zone_distribution || { Z1:0,Z2:0,Z3:0,Z4:0,Z5:0,Z6:0 },
                  compatibility_score: 100 
              }));
              setUserPlans(parsed as TrainingPlan[]);
          }
      };
      fetchPlans();
  }, [userId, view]);

  const handleSavePlan = async (newPlan: Partial<TrainingPlan>) => {
      try {
          if (!newPlan.name || !newPlan.weeks) return;

          const totalTss = newPlan.weeks.reduce((acc, w) => acc + w.workouts.reduce((wa, wo) => wa + wo.tss, 0), 0);
          
          const { error } = await (supabase.from('training_plans') as any)
              .insert({
                  user_id: userId,
                  name: newPlan.name,
                  description: newPlan.description,
                  category: newPlan.category,
                  duration_weeks: newPlan.duration_weeks,
                  total_tss: totalTss,
                  structure_json: JSON.stringify(newPlan.weeks), // On force le stringify pour la sûreté
                  is_active: false
              })
              .select();

          if (error) throw error;

          setNotification(`Plan "${newPlan.name}" créé avec succès !`);
          setTimeout(() => setNotification(null), 5000);
          setView('LIST');
          
      } catch (err: any) {
          console.error("Erreur sauvegarde:", err);
          alert("Erreur lors de la sauvegarde du plan.");
      }
  };

  if (view === 'CREATE') {
      return (
          <CreatePlanWizard 
              onBack={() => setView('LIST')} 
              onSave={handleSavePlan}
          />
      );
  }

  return (
    <div style={{minHeight: "100vh", background: "radial-gradient(circle at top center, #13131f 0%, #050505 80%)", color: "#fff", fontFamily: '"Inter", sans-serif', padding: "2rem", display: "flex", flexDirection: "column"}}>
      {notification && <NeonNotification message={notification} onClose={() => setNotification(null)} />}

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
          <div>
              <h1 style={{fontSize: "2rem", fontWeight: 900, margin: 0, background: "linear-gradient(90deg, #fff 0%, #00f3ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-1px"}}>CENTRE D'ENTRAÎNEMENT</h1>
              <p style={{color: '#888', fontSize: '0.9rem', marginTop: '4px'}}>Bibliothèque et planification saisonnière</p>
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
              <button onClick={() => alert("Génération du plan complet en cours... (Fonctionnalité complète en Phase 4)")} style={{background: 'rgba(255,255,255,0.05)', color: '#aaa', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '30px', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}><Download size={16} /> EXPORT GLOBAL</button>
              <button onClick={() => setView('CREATE')} style={{background: '#00f3ff', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '30px', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(0, 243, 255, 0.3)', cursor: 'pointer', transition: 'transform 0.2s'}} className="hover:scale-105 hover:shadow-cyan-500/50"><Plus size={18} strokeWidth={3} /> CRÉER UN PLAN</button>
          </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '420px 1fr', gap: '2rem', alignItems: 'start'}}>
          
          {/* SIDEBAR : LISTE DES PLANS */}
          <div style={{position: 'sticky', top: '2rem', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', paddingRight: '12px', scrollbarWidth: 'thin', scrollbarColor: '#333 transparent'}}>
              
              {/* SECTION 1 : MES CRÉATIONS */}
              {userPlans.length > 0 && (
                  <div style={{marginBottom: '2.5rem'}}>
                      <h3 style={{fontSize: '0.7rem', fontWeight: 800, color: '#d04fd7', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                         <User size={14} /> MES CRÉATIONS ({userPlans.length})
                      </h3>
                      {userPlans.map(plan => (
                          <PlanListCard key={plan.id} plan={plan} isSelected={selectedPlan.id === plan.id} onClick={() => setSelectedPlan(plan)} />
                      ))}
                  </div>
              )}

              {/* SECTION 2 : CATALOGUE */}
              <div style={{marginBottom: '2.5rem'}}>
                  <h3 style={{fontSize: '0.7rem', fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      CATALOGUE PULSAR
                  </h3>
                  {/* On groupe les MOCK par catégorie */}
                  {Object.entries(MOCK_PLANS.reduce((acc, p) => {
                      if (!acc[p.category]) acc[p.category] = [];
                      acc[p.category].push(p);
                      return acc;
                  }, {} as Record<string, TrainingPlan[]>)).map(([category, plans]) => (
                      <div key={category}>
                          <div style={{fontSize: '0.65rem', color: '#444', fontWeight: 700, margin: '10px 0 5px 0', textTransform: 'uppercase'}}>{category}</div>
                          {plans.map(plan => <PlanListCard key={plan.id} plan={plan} isSelected={selectedPlan.id === plan.id} onClick={() => setSelectedPlan(plan)} />)}
                      </div>
                  ))}
              </div>
          </div>

          {/* MAIN CONTENT : DÉTAIL DU PLAN */}
          <div style={{background: 'rgba(20, 20, 30, 0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '800px'}}>
              <div style={{padding: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1, background: 'linear-gradient(180deg, rgba(20,20,30,0.8) 0%, rgba(20,20,30,0) 100%)', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem'}}>
                  <div>
                      <div style={{display: 'flex', gap: '10px', marginBottom: '1rem'}}>
                          <div style={{display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(208, 79, 215, 0.1)', color: '#d04fd7', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(208, 79, 215, 0.2)'}}>{selectedPlan.category.toUpperCase()}</div>
                          {selectedPlan.is_active && <div style={{display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(16, 185, 129, 0.2)'}}>EN COURS</div>}
                      </div>
                      <h2 style={{fontSize: '2.5rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.1, marginBottom: '1rem', textShadow: '0 0 30px rgba(255,255,255,0.1)'}}>{selectedPlan.name}</h2>
                      <p style={{color: '#ccc', fontSize: '1rem', lineHeight: 1.5, maxWidth: '600px'}}>{selectedPlan.description}</p>
                      <div style={{marginTop: '1.5rem', display: 'flex', gap: '1.5rem'}}>
                          <div style={{display: 'flex', flexDirection: 'column'}}><span style={{fontSize: '0.7rem', color: '#666', fontWeight: 700}}>DURÉE</span><span style={{fontSize: '1.2rem', color: '#fff', fontWeight: 800}}>{selectedPlan.duration_weeks} sem.</span></div>
                          <div style={{display: 'flex', flexDirection: 'column'}}><span style={{fontSize: '0.7rem', color: '#666', fontWeight: 700}}>VOLUME HEBDO</span><span style={{fontSize: '1.2rem', color: '#fff', fontWeight: 800}}>{selectedPlan.avg_hours_week.toFixed(1)}h</span></div>
                          <div style={{display: 'flex', flexDirection: 'column'}}><span style={{fontSize: '0.7rem', color: '#666', fontWeight: 700}}>CHARGE TOTALE</span><span style={{fontSize: '1.2rem', color: '#d04fd7', fontWeight: 800}}>{selectedPlan.total_tss} TSS</span></div>
                      </div>
                  </div>
                  <div style={{background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                          <span style={{fontSize: '0.75rem', fontWeight: 700, color: '#aaa'}}>COMPATIBILITÉ</span>
                          <span style={{fontSize: '1.2rem', fontWeight: 900, color: selectedPlan.compatibility_score > 80 ? '#10b981' : '#f59e0b'}}>{selectedPlan.compatibility_score}%</span>
                      </div>
                      <div style={{marginBottom: '1rem'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666', marginBottom: '4px', fontWeight: 700}}><span>RÉPARTITION INTENSITÉ (Z1-Z6)</span></div>
                          <ZoneDistributionBar distribution={selectedPlan.zone_distribution} />
                      </div>
                      <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto'}}>
                          {(selectedPlan.tags || []).map((tag: string) => <span key={tag} style={{fontSize: '0.65rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)'}}>#{tag}</span>)}
                      </div>
                  </div>
              </div>

              <div style={{flex: 1, padding: '2.5rem 3rem', overflowY: 'auto'}}>
                  <h3 style={{fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                      <CalendarCheck size={18} color="#00f3ff" /> STRUCTURE DU PROGRAMME
                  </h3>
                  {selectedPlan.weeks.map((week: any) => <WeekVisualizer key={week.week_number} week={week} onWorkoutClick={setSelectedWorkout} />)}
                  
                  <div style={{marginTop: '4rem', display: 'flex', justifyContent: 'center', paddingBottom: '2rem'}}>
                      {selectedPlan.is_active ? (
                          <div style={{textAlign: 'center', width: '100%'}}>
                              <div style={{marginBottom: '1rem', color: '#10b981', fontWeight: 700, fontSize: '0.9rem'}}>PLAN ACTIF • SEMAINE 1 / {selectedPlan.duration_weeks}</div>
                              <button style={{background: '#333', color: '#aaa', border: '1px solid #555', padding: '16px 40px', borderRadius: '12px', fontWeight: 800, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '10px'}}>DÉJÀ EN COURS</button>
                          </div>
                      ) : (
                          <button style={{background: 'linear-gradient(90deg, #d04fd7, #9c27b0)', border: 'none', padding: '16px 50px', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(208, 79, 215, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'transform 0.2s'}} className="hover:scale-105 hover:shadow-purple-500/50">
                              <Play size={20} fill="white" /> DÉMARRER CE PLAN
                          </button>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {selectedWorkout && <WorkoutDetailModal workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} />}
    </div>
  )
}