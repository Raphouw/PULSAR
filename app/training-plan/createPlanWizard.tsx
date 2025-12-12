// Fichier : app/training-plan/createPlanWizard.tsx
"use client"

import React, { useState } from "react"
import { 
  ArrowRight, ArrowLeft, Calendar, Save, Edit3, 
  Search, BarChart2, Check, X, Clock, Zap, Activity, Repeat
} from "lucide-react"
import { TrainingPlan, TrainingWeek, Workout, WorkoutStep, Zone } from "./types"
import { WORKOUT_LIBRARY, WEEK_SCHEMAS, WorkoutTemplate } from "./data/workoutLibrary"

interface WizardProps {
    onBack: () => void;
    onSave: (plan: Partial<TrainingPlan>) => void;
}

// --- UTILS ---
const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
};

const getZoneColor = (zone: string) => {
    switch(zone) {
        case 'Z1': return '#a0a0a0'; case 'Z2': return '#3b82f6';
        case 'Z3': return '#10b981'; case 'Z4': return '#f59e0b';
        case 'Z5': return '#ef4444'; case 'Z6': return '#d04fd7';
        default: return '#555';
    }
};

export default function CreatePlanWizard({ onBack, onSave }: WizardProps) {
  const [step, setStep] = useState(1);
  
  // State du plan
  const [draft, setDraft] = useState<Partial<TrainingPlan>>({
    name: "", description: "", category: "Perso", duration_weeks: 4, weeks: []
  });

  // State UI
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  
  // State Édition Séance
  const [targetSlot, setTargetSlot] = useState<{weekIdx: number, dayNum: number} | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null); // Pour la modale d'édition précise

  // --- LOGIC: GENERATION ---
  const applySchema = (schemaId: string) => {
      const schema = WEEK_SCHEMAS.find(s => s.id === schemaId);
      if(!schema) return;
      
      const newWeeks: TrainingWeek[] = [];
      const totalWeeks = draft.duration_weeks || 4;

      for(let i=1; i <= totalWeeks; i++) {
          const workouts: Workout[] = [];
          const isRecovery = i % 4 === 0; // Cycle 3+1 standard

          Object.entries(schema.structure).forEach(([dayStr, tplId]) => {
              let finalTplId = tplId;
              if(isRecovery && tplId) {
                  // Logique simple pour alléger les semaines de récup
                  const baseTpl = WORKOUT_LIBRARY[tplId];
                  if(baseTpl.tss_est > 60) finalTplId = 'recup_active';
              }

              if(finalTplId && WORKOUT_LIBRARY[finalTplId]) {
                  workouts.push(templateToWorkout(WORKOUT_LIBRARY[finalTplId], i, parseInt(dayStr)));
              }
          });

          newWeeks.push({
              week_number: i,
              theme: isRecovery ? "Récupération" : schema.difficulty,
              workouts: workouts.sort((a, b) => a.day_number - b.day_number)
          });
      }
      setDraft(prev => ({...prev, weeks: newWeeks}));
      setSelectedSchemaId(schemaId);
      setStep(3); // Go to builder
  };

  const templateToWorkout = (tpl: WorkoutTemplate, weekNum: number, dayNum: number): Workout => {
      return {
          id: `w_${weekNum}_${dayNum}_${Date.now()}`,
          template_id: tpl.id,
          name: tpl.name,
          duration_s: tpl.duration_s,
          tss: tpl.tss_est,
          dominant_zone: tpl.dominant_zone,
          day_number: dayNum,
          steps: JSON.parse(JSON.stringify(tpl.steps)), // Deep copy pour édition
          if_est: Math.sqrt(tpl.tss_est / (tpl.duration_s/3600) / 100)
      };
  };

  // --- LOGIC: EDITION STEPS ---
  const handleStepChange = (index: number, field: keyof WorkoutStep, value: number) => {
      if(!editingWorkout) return;
      const newSteps = [...editingWorkout.steps];
      
      // @ts-ignore (TypeScript un peu strict sur le mix number/undefined)
      newSteps[index][field] = value; 
      
      // Recalculs globaux
      const totalDuration = newSteps.reduce((acc, s) => acc + s.duration_s, 0);
      // Recalcul TSS approximatif (Formule simplifiée : (IF^2) * heures * 100)
      // IF = Normalized Power / FTP. Ici on fait une moyenne pondérée grossière pour l'UI
      let weightedPower = 0;
      newSteps.forEach(s => weightedPower += (s.power_pct * s.duration_s));
      const avgPower = weightedPower / totalDuration;
      const newTss = Math.round(((avgPower/100) ** 2) * (totalDuration/3600) * 100);

      setEditingWorkout({
          ...editingWorkout,
          steps: newSteps,
          duration_s: totalDuration,
          tss: newTss
      });
  };

  const saveEditedWorkout = () => {
      if(!editingWorkout || !targetSlot) return;
      const { weekIdx, dayNum } = targetSlot;
      const newWeeks = [...(draft.weeks || [])];
      
      // Nettoyer l'ancien slot
      newWeeks[weekIdx].workouts = newWeeks[weekIdx].workouts.filter(w => w.day_number !== dayNum);
      // Ajouter le nouveau
      newWeeks[weekIdx].workouts.push(editingWorkout);
      newWeeks[weekIdx].workouts.sort((a,b) => a.day_number - b.day_number);

      setDraft({...draft, weeks: newWeeks});
      setEditingWorkout(null);
      setTargetSlot(null);
      setIsCatalogOpen(false);
  };

  // --- RENDERERS ---

  // 1. MODALE CATALOGUE
  const renderCatalogModal = () => (
      <div style={{position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: '90%', maxWidth: '800px', height: '80vh', background: '#0a0a0a', border: '1px solid #333', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
              <div style={{padding: '1.5rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between'}}>
                  <h3 style={{color: '#fff', margin: 0}}>Bibliothèque de Séances</h3>
                  <button onClick={() => {setIsCatalogOpen(false); setTargetSlot(null);}}><X color="#fff" /></button>
              </div>
              <div style={{flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem'}}>
                  {Object.values(WORKOUT_LIBRARY).map(tpl => (
                      <div key={tpl.id} onClick={() => {
                          if(!targetSlot) return;
                          // On ouvre l'éditeur avec ce template
                          setEditingWorkout(templateToWorkout(tpl, targetSlot.weekIdx + 1, targetSlot.dayNum));
                          setIsCatalogOpen(false); // On ferme le catalogue, l'éditeur s'ouvre car editingWorkout est set
                      }} 
                      style={{background: '#161616', border: '1px solid #333', borderRadius: '8px', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s'}} className="hover:border-cyan-400">
                          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                              <span style={{color: getZoneColor(tpl.dominant_zone), fontSize: '0.7rem', fontWeight: 800, border: `1px solid ${getZoneColor(tpl.dominant_zone)}`, padding: '2px 6px', borderRadius: '4px'}}>{tpl.dominant_zone}</span>
                              <span style={{color: '#666', fontSize: '0.7rem'}}>{Math.round(tpl.duration_s/60)}min</span>
                          </div>
                          <div style={{color: '#fff', fontWeight: 700, marginBottom: '4px'}}>{tpl.name}</div>
                          <div style={{color: '#888', fontSize: '0.75rem', marginBottom: '8px'}}>{tpl.description}</div>
                          <div style={{height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden', display: 'flex'}}>
                                {tpl.steps.map((s, i) => <div key={i} style={{width: `${(s.duration_s/tpl.duration_s)*100}%`, background: getZoneColor(s.power_pct > 100 ? 'Z5' : s.power_pct > 85 ? 'Z4' : 'Z2')}} />)}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  // 2. MODALE ÉDITEUR PRÉCIS
  const renderEditorModal = () => {
      if(!editingWorkout) return null;
      return (
        <div style={{position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column'}}>
            {/* Header Editor */}
            <div style={{padding: '1rem 2rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111'}}>
                <div>
                    <h2 style={{color: '#fff', margin: 0, fontSize: '1.2rem'}}>Édition : {editingWorkout.name}</h2>
                    <div style={{display: 'flex', gap: '1rem', marginTop: '4px', fontSize: '0.8rem', color: '#888'}}>
                        <span style={{color: '#00f3ff'}}>{formatTime(editingWorkout.duration_s)} total</span>
                        <span style={{color: '#d04fd7'}}>{editingWorkout.tss} TSS (Est.)</span>
                    </div>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button onClick={() => setEditingWorkout(null)} style={{background: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer'}}>Annuler</button>
                    <button onClick={saveEditedWorkout} style={{background: '#00f3ff', color: '#000', padding: '8px 24px', borderRadius: '8px', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}><Save size={16}/> VALIDER</button>
                </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '350px 1fr', flex: 1, overflow: 'hidden'}}>
                {/* Liste des Steps (Editable) */}
                <div style={{borderRight: '1px solid #333', overflowY: 'auto', padding: '1rem', background: '#0a0a0a'}}>
                    <h4 style={{color: '#666', fontSize: '0.7rem', fontWeight: 800, marginBottom: '1rem', textTransform: 'uppercase'}}>Séquence ({editingWorkout.steps.length} blocs)</h4>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {editingWorkout.steps.map((step, idx) => (
                            <div key={idx} style={{background: '#161616', padding: '10px', borderRadius: '6px', borderLeft: `3px solid ${getZoneColor(step.power_pct < 60 ? 'Z1' : step.power_pct < 90 ? 'Z3' : 'Z5')}`}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                                    <span style={{fontSize: '0.7rem', color: '#fff', fontWeight: 700}}>{step.type.toUpperCase()} {step.label ? `- ${step.label}` : ''}</span>
                                    <button onClick={() => {
                                        const newSteps = [...editingWorkout.steps];
                                        newSteps.splice(idx, 1);
                                        setEditingWorkout({...editingWorkout, steps: newSteps});
                                    }} style={{background: 'none', border: 'none', color: '#444', cursor: 'pointer'}}><X size={12}/></button>
                                </div>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px'}}>
                                    <div>
                                        <label style={{fontSize: '0.55rem', color: '#666'}}>Durée (s)</label>
                                        <input type="number" value={step.duration_s} onChange={(e) => handleStepChange(idx, 'duration_s', parseInt(e.target.value))} style={{width: '100%', background: '#000', border: '1px solid #333', color: '#fff', fontSize: '0.8rem', padding: '4px'}} />
                                    </div>
                                    <div>
                                        <label style={{fontSize: '0.55rem', color: '#666'}}>Puissance %</label>
                                        <input type="number" value={step.power_pct} onChange={(e) => handleStepChange(idx, 'power_pct', parseInt(e.target.value))} style={{width: '100%', background: '#000', border: '1px solid #333', color: '#00f3ff', fontSize: '0.8rem', padding: '4px'}} />
                                    </div>
                                    <div>
                                        <label style={{fontSize: '0.55rem', color: '#666'}}>Cadence</label>
                                        <input type="number" placeholder="-" value={step.cadence || ''} onChange={(e) => handleStepChange(idx, 'cadence', parseInt(e.target.value))} style={{width: '100%', background: '#000', border: '1px solid #333', color: '#ccc', fontSize: '0.8rem', padding: '4px'}} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button 
                            onClick={() => setEditingWorkout({...editingWorkout, steps: [...editingWorkout.steps, {type: 'steady', duration_s: 300, power_pct: 65, label: 'Nouveau bloc'}]})}
                            style={{width: '100%', padding: '10px', border: '1px dashed #444', background: 'transparent', color: '#666', cursor: 'pointer', borderRadius: '6px', fontSize: '0.8rem'}}
                        >
                            + AJOUTER UN BLOC
                        </button>
                    </div>
                </div>

                {/* Graphique Live */}
                <div style={{padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#111'}}>
                    <div style={{height: '300px', display: 'flex', alignItems: 'flex-end', gap: '1px', width: '100%', borderBottom: '1px solid #444'}}>
                        {editingWorkout.steps.map((s, i) => (
                            <div key={i} style={{
                                width: `${(s.duration_s / editingWorkout.duration_s) * 100}%`,
                                height: `${Math.min((s.power_pct/150)*100, 100)}%`,
                                background: getZoneColor(s.power_pct < 60 ? 'Z1' : s.power_pct < 85 ? 'Z3' : 'Z5'),
                                opacity: 0.8, transition: 'all 0.3s'
                            }} title={`${s.power_pct}% FTP`}/>
                        ))}
                    </div>
                    <div style={{textAlign: 'center', marginTop: '1rem', color: '#666', fontStyle: 'italic'}}>Visualisation en temps réel de la structure</div>
                </div>
            </div>
        </div>
      );
  };

  // --- MAIN RENDER ---
  return (
    <div style={{position: 'fixed', inset: 0, zIndex: 100, background: '#050505', color: '#fff', display: 'flex', flexDirection: 'column'}}>
        {/* HEADER */}
        <div style={{padding: '1rem 2rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a'}}>
            <h1 style={{fontSize: '1.2rem', fontWeight: 900}}>
                {step === 1 ? "1. CONFIGURATION" : step === 2 ? "2. BASE DU PLAN" : "3. LABORATOIRE"}
            </h1>
            <div style={{display: 'flex', gap: '1rem'}}>
                <button onClick={onBack} style={{background: 'transparent', color: '#888', border: 'none', cursor: 'pointer'}}>Quitter</button>
                {step === 3 && (
                    <button onClick={() => onSave(draft)} style={{background: '#d04fd7', color: '#fff', padding: '8px 24px', borderRadius: '8px', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 0 15px rgba(208,79,215,0.4)'}}>
                        TERMINER & CRÉER
                    </button>
                )}
            </div>
        </div>

        {/* CONTENU */}
        <div style={{flex: 1, overflowY: 'auto', padding: '2rem'}}>
            <div style={{maxWidth: '1200px', margin: '0 auto'}}>
                
                {/* ETAPE 1 : DURÉE ET NOM */}
                {step === 1 && (
                    <div style={{animation: 'fadeIn 0.5s'}}>
                        <h2 style={{fontSize: '2rem', marginBottom: '2rem', textAlign: 'center'}}>Définissons le cadre</h2>
                        <div style={{maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                            <div>
                                <label style={{color: '#888', fontWeight: 700, fontSize: '0.8rem'}}>NOM DU PLAN</label>
                                <input type="text" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} placeholder="Mon Plan Ultime" style={{width: '100%', padding: '1rem', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '1.1rem'}} />
                            </div>
                            <div>
                                <label style={{color: '#888', fontWeight: 700, fontSize: '0.8rem'}}>DURÉE PERSONNALISÉE (Semaines)</label>
                                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                                    <input type="number" min="1" max="52" value={draft.duration_weeks} onChange={e => setDraft({...draft, duration_weeks: parseInt(e.target.value)})} style={{flex: 1, padding: '1rem', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#00f3ff', fontSize: '1.5rem', fontWeight: 900, textAlign: 'center'}} />
                                    <span style={{color: '#666', fontSize: '0.9rem'}}>Semaines</span>
                                </div>
                            </div>
                            <button disabled={!draft.name} onClick={() => setStep(2)} style={{padding: '1rem', background: draft.name ? '#00f3ff' : '#222', color: '#000', fontWeight: 800, border: 'none', borderRadius: '8px', cursor: draft.name ? 'pointer' : 'not-allowed', marginTop: '1rem'}}>SUIVANT</button>
                        </div>
                    </div>
                )}

                {/* ETAPE 2 : CHOIX DU SCHÉMA */}
                {step === 2 && (
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', animation: 'fadeIn 0.5s'}}>
                        {/* Option Vide */}
                        <div onClick={() => {
                            setDraft({...draft, weeks: Array.from({length: draft.duration_weeks || 4}, (_, i) => ({week_number: i+1, theme: 'Libre', workouts: []}))});
                            setStep(3);
                        }} style={{border: '1px dashed #444', borderRadius: '16px', padding: '2rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#666'}} className="hover:border-white">
                            <Edit3 size={40} style={{marginBottom: '1rem'}}/>
                            <h3 style={{color: '#fff'}}>Page Blanche</h3>
                            <p style={{textAlign: 'center', fontSize: '0.8rem'}}>Construire de zéro, séance par séance.</p>
                        </div>

                        {/* Schemas */}
                        {WEEK_SCHEMAS.map(schema => (
                            <div key={schema.id} onClick={() => applySchema(schema.id)} style={{background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '2rem', cursor: 'pointer', transition: 'transform 0.2s'}} className="hover:scale-105 hover:border-cyan-500">
                                <h3 style={{color: '#fff', fontSize: '1.3rem', marginBottom: '0.5rem'}}>{schema.name}</h3>
                                <p style={{color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem'}}>{schema.description}</p>
                                <div style={{display: 'flex', gap: '4px'}}>
                                    {Object.values(schema.structure).map((id, i) => <div key={i} style={{width: '8px', height: '8px', borderRadius: '50%', background: id ? '#00f3ff' : '#333'}} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ETAPE 3 : BUILDER GRID */}
                {step === 3 && (
                    <div style={{animation: 'fadeIn 0.5s'}}>
                         <div style={{marginBottom: '2rem', background: 'rgba(0,243,255,0.05)', border: '1px solid rgba(0,243,255,0.2)', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'center'}}>
                            <Zap color="#00f3ff" />
                            <p style={{margin: 0, fontSize: '0.9rem', color: '#ccc'}}>Cliquez sur n'importe quel jour pour <strong>Ajouter</strong>, <strong>Changer</strong> ou <strong>Modifier</strong> précisément une séance (Watts, Durée, Cadence).</p>
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                            {draft.weeks?.map((week, wIdx) => (
                                <div key={wIdx} style={{background: '#0e0e0e', border: '1px solid #222', borderRadius: '12px', padding: '1rem'}}>
                                    <div style={{color: '#666', fontWeight: 800, fontSize: '0.8rem', marginBottom: '1rem', textTransform: 'uppercase'}}>Semaine {week.week_number} <span style={{color: '#333'}}>|</span> {week.theme}</div>
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px'}}>
                                        {Array.from({length: 7}).map((_, dIdx) => {
                                            const dayNum = dIdx + 1;
                                            const workout = week.workouts.find(w => w.day_number === dayNum);
                                            return (
                                                <div 
                                                    key={dIdx}
                                                    onClick={() => {
                                                        setTargetSlot({weekIdx: wIdx, dayNum});
                                                        if(workout) {
                                                            setEditingWorkout(workout); // Ouvre l'éditeur direct si existe
                                                        } else {
                                                            setIsCatalogOpen(true); // Ouvre catalogue si vide
                                                        }
                                                    }}
                                                    style={{
                                                        minHeight: '100px', borderRadius: '8px', cursor: 'pointer',
                                                        background: workout ? 'linear-gradient(160deg, #1a1a1a 0%, #111 100%)' : 'rgba(255,255,255,0.02)',
                                                        border: workout ? `1px solid ${getZoneColor(workout.dominant_zone)}40` : '1px dashed #333',
                                                        padding: '10px', position: 'relative', transition: 'all 0.2s',
                                                        display: 'flex', flexDirection: 'column'
                                                    }}
                                                    className="hover:bg-white/5"
                                                >
                                                    <div style={{fontSize: '0.6rem', color: '#555', fontWeight: 700, marginBottom: '6px'}}>J{dayNum}</div>
                                                    {workout ? (
                                                        <>
                                                            <div style={{fontWeight: 700, fontSize: '0.75rem', color: '#fff', lineHeight: 1.2, marginBottom: 'auto'}}>{workout.name}</div>
                                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px'}}>
                                                                <span style={{fontSize: '0.6rem', color: '#aaa'}}>{Math.round(workout.duration_s/60)}'</span>
                                                                <span style={{fontSize: '0.7rem', color: getZoneColor(workout.dominant_zone)}}>{workout.tss} TSS</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div style={{margin: 'auto', color: '#333'}}><Repeat size={14}/></div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* MODALES */}
        {isCatalogOpen && renderCatalogModal()}
        {editingWorkout && renderEditorModal()}
    </div>
  );
}