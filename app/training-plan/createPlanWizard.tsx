// Fichier : app/training-plan/CreatePlanWizard.tsx
"use client"

import React, { useState } from "react"
import { 
  ArrowRight, ArrowLeft, Layers, AlertCircle, FileText, Upload, Zap
} from "lucide-react"
import { TrainingPlan } from "./types" // Import des types

const PLAN_CATEGORIES = ['Endurance', 'Montagne', 'Explosivité', 'Force', 'Seuil'];

// Icônes
import { Mountain, Activity, Dumbbell, TrendingUp } from "lucide-react"
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Montagne': Mountain, 'Endurance': Activity, 
  'Explosivité': Zap, 'Force': Dumbbell, 'Seuil': TrendingUp
};

interface WizardProps {
    onBack: () => void;
    onSave: (plan: Partial<TrainingPlan>) => void;
}

export default function CreatePlanWizard({ onBack, onSave }: WizardProps) {
  const [step, setStep] = useState(1);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [showJsonArea, setShowJsonArea] = useState(false);
  
  // État "Persistent" : On ne le reset pas quand on change de step
  const [draft, setDraft] = useState<Partial<TrainingPlan>>({
    name: "",
    description: "",
    category: "Endurance",
    duration_weeks: 4,
    weeks: []
  });

  // VALIDATION
  const isStepValid = () => {
      if (step === 1) {
          // Nom requis et description minime
          return !!(draft.name && draft.name.length >= 3 && draft.description);
      }
      // Step 2 & 3 sont toujours valides par défaut (valeurs par défaut)
      return true;
  };

  // --- LOGIQUE JSON (Autofill) ---
  const processJson = (jsonString: string) => {
    try {
        const json = JSON.parse(jsonString);
        // On fusionne le JSON avec le draft existant
        setDraft(prev => ({ ...prev, ...json }));
        
        setJsonError(null);
        setJsonText(""); 
        setShowJsonArea(false); 
        alert("Champs remplis automatiquement via le fichier !");
    } catch (err: any) {
        setJsonError("JSON Invalide : " + err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => processJson(event.target?.result as string);
    reader.readAsText(file);
  };

  const handleTextPaste = () => {
      if(!jsonText) return;
      processJson(jsonText);
  };

  // --- RENDU ÉTAPE 1 : IDENTITÉ ---
  const renderStep1 = () => (
    <div style={{animation: "fadeIn 0.3s ease"}}>
      
      {/* HEADER ÉTAPE */}
      <div style={{textAlign: 'center', marginBottom: '2rem'}}>
        <h2 style={{fontSize: '1.8rem', fontWeight: 900, color: '#fff'}}>L'ADN DU PLAN</h2>
        <p style={{color: '#888'}}>Définissez l'objectif principal et l'identité visuelle.</p>
        
        {/* BOUTON AUTOFILL DISCRET */}
        <button 
            onClick={() => setShowJsonArea(!showJsonArea)}
            style={{
                background: showJsonArea ? 'rgba(255,255,255,0.1)' : 'transparent', 
                border: '1px dashed #444', color: showJsonArea ? '#fff' : '#666', 
                padding: '6px 12px', borderRadius: '20px', fontSize: '0.7rem', 
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                marginTop: '1rem'
            }}
        >
            <Zap size={12} color={showJsonArea ? "#00f3ff" : "#666"} /> 
            {showJsonArea ? "Masquer l'outil d'import" : "Autofill via JSON (Optionnel)"}
        </button>
      </div>

      {/* ZONE IMPORT (COLLAPSIBLE) */}
      {showJsonArea && (
        <div style={{marginBottom: '2rem', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #d04fd7', animation: 'slideDown 0.3s ease'}}>
            <h4 style={{margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#d04fd7'}}>⚡ REMPLISSAGE AUTOMATIQUE</h4>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                <div style={{textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '1rem'}}>
                    <p style={{color: '#aaa', fontSize: '0.8rem', marginBottom: '1rem'}}>FICHIER .JSON</p>
                    <div style={{position: 'relative', display: 'inline-block'}}>
                        <input type="file" accept=".json" onChange={handleFileUpload} style={{opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer'}} />
                        <button style={{background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <Upload size={16} /> CHOISIR FICHIER
                        </button>
                    </div>
                </div>
                <div>
                    <p style={{color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem'}}>COLLER CODE JSON</p>
                    <div style={{display: 'flex', gap: '10px'}}>
                        <input value={jsonText} onChange={(e) => setJsonText(e.target.value)} placeholder='{ "name": "...", "weeks": [...] }' style={{flex: 1, background: '#111', border: '1px solid #333', color: '#00f3ff', fontFamily: 'monospace', fontSize: '0.7rem', padding: '8px', borderRadius: '6px', outline: 'none'}} />
                        <button onClick={handleTextPaste} disabled={!jsonText} style={{padding: '0 16px', background: jsonText ? '#d04fd7' : '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: jsonText ? 'pointer' : 'not-allowed', fontSize: '0.7rem', fontWeight: 700}}>OK</button>
                    </div>
                </div>
            </div>
            {jsonError && <p style={{color: '#ef4444', fontSize: '0.8rem', marginTop: '10px'}}>{jsonError}</p>}
        </div>
      )}

      {/* FORMULAIRE PRINCIPAL */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          <div>
            <label style={{display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 700}}>
                NOM DU PROGRAMME <span style={{color: '#ef4444'}}>*</span>
            </label>
            <input 
              type="text" 
              value={draft.name} 
              onChange={e => setDraft({...draft, name: e.target.value})}
              placeholder="Ex: Prépa Gran Fondo 2025"
              style={{
                width: '95%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${!draft.name ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.1)'}`, 
                padding: '1rem', borderRadius: '12px', color: '#fff', fontSize: '1.1rem', fontWeight: 700, outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 700}}>
                DESCRIPTION & OBJECTIFS <span style={{color: '#ef4444'}}>*</span>
            </label>
            <textarea 
              value={draft.description} 
              onChange={e => setDraft({...draft, description: e.target.value})}
              rows={4}
              style={{
                width: '95%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${!draft.description ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255,255,255,0.1)'}`, 
                padding: '1rem', borderRadius: '12px', color: '#ccc', fontSize: '0.9rem', resize: 'none', outline: 'none'
              }}
              placeholder="Ex: Augmenter la FTP de 15W avant la saison..."
            />
          </div>
        </div>

        {/* Sélecteur Catégorie */}
        <div style={{background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
          <label style={{display: 'block', color: '#aaa', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 700}}>ARCHÉTYPE</label>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
            {PLAN_CATEGORIES.map(cat => {
              const Icon = CATEGORY_ICONS[cat] || Activity;
              const isSelected = draft.category === cat;
              return (
                <div 
                  key={cat} 
                  onClick={() => setDraft({...draft, category: cat as any})}
                  style={{
                    padding: '0.8rem', borderRadius: '10px', cursor: 'pointer',
                    background: isSelected ? 'rgba(208, 79, 215, 0.2)' : 'transparent',
                    border: isSelected ? '1px solid #d04fd7' : '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', gap: '10px', color: isSelected ? '#fff' : '#888',
                    transition: 'all 0.2s'
                  }}
                >
                  <Icon size={18} color={isSelected ? '#d04fd7' : '#666'} />
                  <span style={{fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase'}}>{cat}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // --- RENDU ÉTAPE 2 : MACRO STRUCTURE (inchangé, sauf state) ---
  const renderStep2 = () => (
    <div style={{animation: "fadeIn 0.3s ease"}}>
        <div style={{textAlign: 'center', marginBottom: '3rem'}}>
            <h2 style={{fontSize: '1.8rem', fontWeight: 900, color: '#fff'}}>PARAMÈTRES STRUCTURELS</h2>
            <p style={{color: '#888'}}>Définissez la durée et le volume cible.</p>
        </div>

        <div style={{maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem'}}>
            
            {/* Slider Durée */}
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                    <span style={{fontWeight: 700, color: '#ccc'}}>DURÉE TOTALE</span>
                    <span style={{fontWeight: 900, color: '#d04fd7', fontSize: '1.2rem'}}>{draft.duration_weeks} SEMAINES</span>
                </div>
                <input 
                    type="range" min="1" max="24" step="1" 
                    value={draft.duration_weeks} 
                    onChange={e => setDraft({...draft, duration_weeks: parseInt(e.target.value)})}
                    style={{width: '100%', accentColor: '#d04fd7', cursor: 'pointer'}} 
                />
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666', marginTop: '5px'}}>
                    <span>1 sem (Micro)</span>
                    <span>24 sem (Saison)</span>
                </div>
            </div>

            {/* Note sur les Zones */}
            <div style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <AlertCircle size={24} color="#3b82f6" />
                <div>
                    <h4 style={{margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6'}}>ADAPTATION AUTOMATIQUE</h4>
                    <p style={{margin: '4px 0 0', fontSize: '0.8rem', color: '#ccc'}}>
                        Tous les entraînements créés seront basés sur des <strong>% de FTP</strong>. Le plan s'adaptera automatiquement au niveau de l'athlète qui l'utilisera.
                    </p>
                </div>
            </div>
        </div>
    </div>
  );

  // --- RENDU ÉTAPE 3 : SÉQUENCEUR ---
  const renderStep3 = () => (
    <div style={{animation: "fadeIn 0.3s ease", textAlign: 'center'}}>
        <div style={{marginBottom: '2rem'}}>
            <h2 style={{fontSize: '1.8rem', fontWeight: 900, color: '#fff'}}>SÉQUENCEUR DE SÉANCES</h2>
            <p style={{color: '#888'}}>Glissez-déposez les blocs ou utilisez l'éditeur détaillé.</p>
        </div>
        
        <div style={{background: 'rgba(255,255,255,0.02)', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px', padding: '4rem'}}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🏗️</div>
            <h3 style={{fontSize: '1.2rem', fontWeight: 800, color: '#fff'}}>MODULE EN CONSTRUCTION (Phase 3)</h3>
            <p style={{color: '#aaa', maxWidth: '400px', margin: '1rem auto'}}>
                C'est ici que tu pourras créer les intervalles précis (ex: 2x20min @ 90%). 
                Pour l'instant, on sauvegarde la structure globale.
            </p>
        </div>
    </div>
  );

  // --- STRUCTURE PRINCIPALE DU WIZARD ---
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, 
      background: 'radial-gradient(circle at center, #1a1a2e 0%, #000 100%)',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* HEADER WIZARD */}
      <div style={{padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        
        <div style={{display: 'flex', gap: '1rem'}}>
            <button onClick={onBack} style={{background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600}}>
                ANNULER
            </button>
            {/* BOUTON PRÉCÉDENT */}
            {step > 1 && (
                <button onClick={() => setStep(step - 1)} style={{background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem'}}>
                    <ArrowLeft size={14} /> PRÉCÉDENT
                </button>
            )}
        </div>

        {/* INDICATEUR DE PROGRESSION */}
        <div style={{display: 'flex', gap: '10px'}}>
            {[1, 2, 3].map(s => (
                <div key={s} style={{
                    width: '40px', height: '6px', borderRadius: '3px',
                    background: s <= step ? (s === step ? '#00f3ff' : '#10b981') : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.3s ease'
                }} />
            ))}
        </div>

        {/* BOUTON SUIVANT / TERMINER AVEC VALIDATION */}
        <button 
            onClick={() => {
                if (!isStepValid()) return;
                step < 3 ? setStep(step + 1) : onSave(draft);
            }}
            disabled={!isStepValid()}
            style={{
                background: isStepValid() ? (step === 3 ? '#10b981' : '#00f3ff') : '#333', 
                color: isStepValid() ? '#000' : '#666', 
                border: 'none', 
                padding: '10px 24px', borderRadius: '8px', fontWeight: 800, cursor: isStepValid() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.2s', opacity: isStepValid() ? 1 : 0.5
            }}
        >
            {step === 3 ? "TERMINER" : "SUIVANT"} <ArrowRight size={16} />
        </button>
      </div>

      {/* CONTENU CENTRAL SCROLLABLE */}
      <div style={{flex: 1, overflowY: 'auto', padding: '3rem 2rem'}}>
        <div style={{maxWidth: '1000px', margin: '0 auto'}}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
};