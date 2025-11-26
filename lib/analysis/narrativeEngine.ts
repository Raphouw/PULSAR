// Fichier : lib/analysis/narrativeEngine.ts

import { ActivityStreams } from "../../types/next-auth"; 
import { calculateCardiacDrift, findMaxValue } from "../physics"; 
import { detectClimbs } from '../physics';

// --- TYPES DE DONNÉES ET STRUCTURES REQUISES (Omis) ---
type SegmentMetrics = {
    avgWatts: number;
    avgHr: number;
    avgSpeedKmh: number;
    cvWatts: number; 
    powerDropLast15Pct: number; 
    energyCostKj: number;
};

type SegmentBlock = {
    type: 'CLIMB' | 'FLAT' | 'DESCENT' | 'TRANSITION';
    distanceKm: number;
    avgGrade: number;
    startIndex: number;
    endIndex: number;
    metrics: SegmentMetrics;
};

type UserProfile = {
    ftp: number;
    weight: number;
    maxHr: number;
}

// --- LOGIQUE D'AIDE ET DE JUGEMENT ---

/** Assigne un jugement de qualité à la régularité du pacing. */
function getPacingJudgment(cvWatts: number): string {
    if (cvWatts < 0.08) return "extrêmement régulière";
    if (cvWatts < 0.15) return "acceptable"; 
    return "très irrégulière";
}

/** Détermine le type de terrain basé sur la pente moyenne. */
function determineSegmentType(avgGrade: number): 'CLIMB' | 'DESCENT' | 'FLAT' {
    const CLIMB_THRESHOLD = 2.0; 
    const DESCENT_THRESHOLD = -2.0; 
    
    if (avgGrade > CLIMB_THRESHOLD) return 'CLIMB';
    if (avgGrade < DESCENT_THRESHOLD) return 'DESCENT';
    return 'FLAT';
}

/** Calcule les métriques avancées pour un bloc de stream donné. */
function calculateSegmentMetrics(
    streams: ActivityStreams, 
    start: number, 
    end: number,
    profile: UserProfile
): SegmentMetrics {
    
    const segmentWatts = (streams.watts || []).slice(start, end).filter(v => v !== null) as number[];
    const segmentHr = (streams.heartrate || []).slice(start, end).filter(v => v !== null) as number[];
    
    const totalDuration = (streams.time![end - 1] || 0) - (streams.time![start] || 0); 
    const totalDistance = (streams.distance![end - 1] || 0) - (streams.distance![start] || 0);

    const avgWatts = segmentWatts.length ? segmentWatts.reduce((a, b) => a + b, 0) / segmentWatts.length : 0;
    const avgHr = segmentHr.length ? segmentHr.reduce((a, b) => a + b, 0) / segmentHr.length : 0;
    
    const avgSpeed = totalDistance > 0 && totalDuration > 0 ? (totalDistance / totalDuration) * 3.6 : 0;

    const mean = avgWatts;
    const standardDeviation = Math.sqrt(segmentWatts.map(w => Math.pow(w - mean, 2)).reduce((a, b) => a + b, 0) / segmentWatts.length);
    const cvWatts = mean > 0 ? standardDeviation / mean : 0;

    const dropOffIndex = Math.floor(segmentWatts.length * 0.85);
    const avgWattsInitial = segmentWatts.slice(0, dropOffIndex).reduce((a, b) => a + b, 0) / dropOffIndex;
    const avgWattsFinal = segmentWatts.slice(dropOffIndex).reduce((a, b) => a + b, 0) / (segmentWatts.length - dropOffIndex);
    const powerDropLast15Pct = avgWattsInitial > 0 ? Math.round(((avgWattsInitial - avgWattsFinal) / avgWattsInitial) * 100) : 0;
    
    const energyCostKj = avgWatts * totalDuration / 1000;

    return {
        avgWatts: Math.round(avgWatts),
        avgHr: Math.round(avgHr),
        avgSpeedKmh: parseFloat(avgSpeed.toFixed(1)),
        cvWatts: parseFloat(cvWatts.toFixed(3)),
        powerDropLast15Pct: powerDropLast15Pct,
        energyCostKj: Math.round(energyCostKj)
    };
}

/** Moteur de segmentation simple qui découpe l'activité en blocs principaux. */
function segmentActivity(streams: ActivityStreams, profile: UserProfile): SegmentBlock[] {
    
    const segments: SegmentBlock[] = [];
    const climbs = streams.watts && streams.altitude ? (detectClimbs(streams, 300, 2.5) || []) : [];
    
    let currentStreamIndex = 0;
    const totalLength = streams.time ? streams.time.length : 0;
    
    for (const climb of climbs) {
        if (climb.startIndex > currentStreamIndex + 100) { 
            const prevEndIndex = climb.startIndex;
            const prevMetrics = calculateSegmentMetrics(streams, currentStreamIndex, prevEndIndex, profile);
            
            const prevGrade = (streams.altitude![prevEndIndex]! - streams.altitude![currentStreamIndex]!) / ((streams.distance![prevEndIndex]! - streams.distance![currentStreamIndex]!) || 1);
            const prevType = determineSegmentType(prevGrade * 100);

            const type: 'CLIMB' | 'DESCENT' | 'FLAT' | 'TRANSITION' = (prevType === 'FLAT' || prevType === 'DESCENT') ? 'TRANSITION' : prevType;

            segments.push({
                type: type,
                distanceKm: prevMetrics.avgSpeedKmh * (prevEndIndex - currentStreamIndex) / 3600,
                avgGrade: prevGrade * 100,
                startIndex: currentStreamIndex,
                endIndex: prevEndIndex,
                metrics: prevMetrics
            });
        }
        
        const climbMetrics = calculateSegmentMetrics(streams, climb.startIndex, climb.endIndex, profile);
        
        segments.push({
            type: 'CLIMB',
            distanceKm: climb.distanceMetres / 1000,
            avgGrade: climb.averageGradient,
            startIndex: climb.startIndex,
            endIndex: climb.endIndex,
            metrics: climbMetrics
        });
        
        currentStreamIndex = climb.endIndex;
    }
    
    if (totalLength > currentStreamIndex + 100) {
        const finalMetrics = calculateSegmentMetrics(streams, currentStreamIndex, totalLength, profile);
        const finalGrade = (streams.altitude![totalLength - 1]! - streams.altitude![currentStreamIndex]!) / ((streams.distance![totalLength - 1]! - streams.distance![currentStreamIndex]!) || 1);
        const finalType = determineSegmentType(finalGrade * 100);
        
        segments.push({
            type: finalType,
            distanceKm: finalMetrics.avgSpeedKmh * (totalLength - currentStreamIndex) / 3600,
            avgGrade: finalGrade * 100,
            startIndex: currentStreamIndex,
            endIndex: totalLength,
            metrics: finalMetrics
        });
    }

    return segments;
}


// Helper pour colorer les Zones (Z1, Z2, Z3, Z4/Seuil, Z5/VO2Max)
function getColoredZone(ifScore: number): string {
    let zoneName: string;
    let color: string;

    if (ifScore < 0.55) { zoneName = 'Z1 (Récup. Active)'; color = '#00f3ff'; }
    else if (ifScore < 0.75) { zoneName = 'Z2 (Endurance)'; color = '#10b981'; }
    else if (ifScore < 0.90) { zoneName = 'Z3 (Tempo)'; color = '#f59e0b'; }
    else if (ifScore < 1.05) { zoneName = 'Z4 (Seuil)'; color = '#d04fd7'; }
    else { zoneName = 'Z5+ (VO2 Max / Anaérobie)'; color = '#ff003c'; }

    return `<span style="color: ${color}; font-weight: 700;">${zoneName}</span>`;
}

// Helper pour formater les données critiques (Valeurs Puissance/Vitesse)
function formatDataValue(value: string | number, color: any): string {
    const style = `color: ${color}; font-weight: 700;`;
    return `<span style="${style}">${value}</span>`;
}

// Helper pour la couleur de la dérive cardiaque
function getCDColor(drift: number | null): string {
    if (drift === null || isNaN(drift)) return '#A0A0A0';
    if (drift < 0) return '#10b981'; // Green (Negative drift = Good recovery)
    if (drift < 5) return '#00f3ff'; // Cyan (0% to 5% = Acceptable/Normal)
    return '#ff003c'; // Red (Alert > 5%)
}


// --- LOGIQUE NARRATIVE (MAIN FUNCTION) ---

export function generateActivityNarrative(streams: ActivityStreams, profile: UserProfile): string {
    
    if (!streams.watts || !streams.heartrate || !streams.altitude || !streams.distance || !streams.time || streams.time.length < 600) {
        return "Analyse narrative impossible: Les streams critiques (Puissance, Cardio, Altitude, Distance, Temps) sont incomplets.";
    }

    const segments = segmentActivity(streams, profile);
    let story = "";
    
    // 1. DÉBUT DU RÉCIT ET ANALYSE D'INITIATION (Suppression du terme Mission)
    if (segments.length === 0) {
        return "Analyse narrative: Sortie trop courte ou données insuffisantes pour la segmentation.";
    }
    
    const initialBlock = segments[0];
    const ifInitial = initialBlock.metrics.avgWatts / profile.ftp;
    
    // Fix 3: Utiliser <span> pour le titre au lieu de Markdown
    story += `<p style="margin-bottom: 1.5rem; color: #CCCCCC;">`;
    
    if ((findMaxValue((streams.watts || []).slice(0, 30)) || 0) > (profile.ftp * 1.6)) { 
        story += `<span style="color: #ff003c; font-weight: 700;">[LANCEMENT AGRESSIF]</span> Votre pic de puissance initial a dépassé les 160% de votre FTP. L'effort moyen (${formatDataValue(initialBlock.metrics.avgWatts, '#d04fd7')}W) s'est stabilisé en ${getColoredZone(ifInitial)}.</p>`;
    } else {
         story += `[LANCEMENT PROGRESIF] Le rythme de croisière de ${formatDataValue(initialBlock.metrics.avgSpeedKmh.toFixed(1), '#00f3ff')} km/h et la puissance moyenne de ${formatDataValue(initialBlock.metrics.avgWatts, '#d04fd7')}W sont en ${getColoredZone(ifInitial)}.</p>`;
    }
              
    // 2. ITÉRATION CHRONOLOGIQUE ET ANALYSE (NLG)
    segments.forEach((block, index) => {
        const { type, distanceKm, avgGrade, metrics } = block;
        const ifBlock = metrics.avgWatts / profile.ftp;
        const zoneStyled = getColoredZone(ifBlock);
        const pacingStyle = getPacingJudgment(metrics.cvWatts);
        
        // Séparateur (Remplacé par <hr> simple, moins de marge)
        story += `<hr style="border-top: 1px solid rgba(255,255,255,0.08); margin: 1rem 0;">`;

        if (type === 'CLIMB') {
            // Fix 3: Utilisation de <span> pour le titre
            story += `<p style="margin: 0.5rem 0; color: #CCCCCC;"><span style="font-weight: 700; color: #F1F1F1;">Montée #${index + 1}</span> (${formatDataValue(distanceKm.toFixed(1), '#00f3ff')} km, Pente ${formatDataValue(avgGrade.toFixed(1), '#f59e0b')}%) : L'ascension a été soutenue à ${formatDataValue(metrics.avgWatts, '#d04fd7')}W (${zoneStyled}).</p>`;

            // Jugement de Gestion et Régularité
            if (metrics.powerDropLast15Pct > 18) {
                story += `<p style="margin: 0; color: #ff003c; font-weight: 600;">⚠️ Chute brutale (${metrics.powerDropLast15Pct.toFixed(0)}%) de puissance sur la fin. Gestion trop agressive.</p>`;
            } else if (metrics.cvWatts > 0.15) {
                 story += `<p style="margin: 0; color: #f97316;">Le pacing était ${pacingStyle} (${(metrics.cvWatts * 100).toFixed(1)}% CV), ce qui a augmenté la dépense énergétique.</p>`;
            } else {
                 story += `<p style="margin: 0; color: #10b981;">Gestion du rythme ${pacingStyle}, maintenant une puissance stable.</p>`;
            }

        } else if (type === 'DESCENT') {
            story += `<p style="margin: 0.5rem 0; color: #CCCCCC;">**Descente :** Transition rapide sur ${distanceKm.toFixed(1)} km. Vitesse moyenne ${formatDataValue(metrics.avgSpeedKmh.toFixed(1), '#00f3ff')} km/h. Cardio ${formatDataValue(metrics.avgHr, '#ef4444')} bpm.</p>`;

        } else if (type === 'TRANSITION') {
            story += `<p style="margin: 0.5rem 0; color: #CCCCCC;"><span style="font-weight: 700; color: #F1F1F1;">Phase de Transition</span> : Intensité de ${formatDataValue(metrics.avgWatts, '#d04fd7')}W (IF ${formatDataValue(ifBlock.toFixed(2), '#d04fd7')}) sur ${distanceKm.toFixed(1)} km. </p>`;

            if (ifBlock > 0.80) {
                story += `<p style="margin: 0; color: #f97316; font-weight: 600;">ALERTE : L'effort de Tempo (${zoneStyled}) était trop élevé, entamant les réserves avant le segment suivant.</p>`;
            } else {
                story += `<p style="margin: 0; color: #10b981;">L'effort était modéré, assurant une bonne récupération active.</p>`;
            }
        
        } else if (type === 'FLAT') {
             story += `<p style="margin: 0.5rem 0; color: #CCCCCC;"><span style="font-weight: 700; color: #F1F1F1;">Plat :</span> Segment de ${distanceKm.toFixed(1)} km géré à ${formatDataValue(metrics.avgWatts, '#d04fd7')}W (${zoneStyled}). Rythme maintenu.</p>`;
        }
    });

    // 3. JUGEMENT PHYSIOLOGIQUE GLOBAL ET CONSEILS ACTIONNABLES
    
    story += `<h3 style="color: #00f3ff; margin-top: 2rem; margin-bottom: 1rem;">BILAN POST-SORTIE & CONSEILS ACTIONNABLES</h3>`;

    const totalDurationHours = (segments[segments.length - 1]?.endIndex || 0) / 3600;
    const totalTssScore = segments.reduce((sum, block) => sum + (block.metrics.avgWatts / profile.ftp * (block.endIndex - block.startIndex) / 3600 * 100), 0);
    const drift = streams.watts && streams.heartrate ? calculateCardiacDrift(streams.watts as number[], streams.heartrate as number[]) : null;
    const cdColor = getCDColor(drift);

    // a) Tableau Récapitulatif (Fix Spacing)
    story += `
        <h4 style="margin-top: 1.5rem; color: #d04fd7; margin-bottom: 0.5rem;">Synthèse des Métriques Clés</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem; font-family: monospace; margin-bottom: 0.5rem;">
            <tr style="background: rgba(208, 79, 215, 0.1);">
                <td style="padding: 6px 8px; border: 1px solid #3A3A3A;">FTP Utilisée</td>
                <td style="padding: 6px 8px; border: 1px solid #3A3A3A; text-align: right;">${formatDataValue(profile.ftp, '#d04fd7')} W</td>
            </tr>
            <tr>
                <td style="padding: 6px 8px; border: 1px solid #3A3A3A;">Distance Totale</td>
                <td style="padding: 6px 8px; border: 1px solid #3A3A3A; text-align: right;">${formatDataValue(segments.reduce((sum, block) => sum + block.distanceKm, 0).toFixed(1), '#00f3ff')} km</td>
            </tr>
            <tr style="background: rgba(208, 79, 215, 0.1);">
                <td style="padding: 6px 8px; border: 1px solid #3A3A3A;">Charge TSS Totale</td>
                <td style="padding: 6px 8px; border: 1px solid #3A3A3A; text-align: right;">${formatDataValue(Math.round(totalTssScore), '#d04fd7')}</td>
            </tr>
            <tr>
                <td style="padding: 6px 8px; border: 1px solid #3A3A3A;">Dérive Cardiaque (CD)</td>
                <td style="padding: 6px 8px; border: 1px solid #3A3A3A; text-align: right;">${formatDataValue(drift !== null ? drift.toFixed(1) + '%' : 'N/D', cdColor)}</td>
            </tr>
        </table>
    `;

    // c) Conseils Actionnables (Liste finale avec styles réduits)
    const recoveryHours = Math.round(totalTssScore / 80 * 24); 
    const bidonsNeeded = Math.ceil(totalDurationHours * 1.5); 
    const carbsNeededGrams = Math.round(totalDurationHours * 60); 
    
    story += `<p style="margin: 0.5rem 0; color: #A0A0A0; font-size: 0.9rem;">* **Info CD :** Un CD > 5% est un signal d'alerte de fatigue/déshydratation.</p>`;

    story += `
        <h4 style="margin-top: 1.5rem; color: #10b981;">Conseils Actionnables</h4>
        <ul style="list-style: none; padding-left: 0; margin: 0; font-size: 0.95rem; color: #CCCCCC;">
            <li style="margin-bottom: 5px; padding-left: 10px;">• <span style="font-weight: 700;">Nutrition :</span> Visez ${formatDataValue(bidonsNeeded, '#d04fd7')} bidons et ${formatDataValue(carbsNeededGrams, '#d04fd7')}g de glucides par heure.</li>
            <li style="margin-bottom: 5px; padding-left: 10px;">• <span style="font-weight: 700;">Pacing :</span> ${segments.some(b => b.metrics.powerDropLast15Pct > 18) ? formatDataValue("Concentrez-vous sur la régularité (CV < 10%) pour éviter les explosions en fin de montée.", '#ff003c') : formatDataValue("Maintenez cette excellente stabilité du pacing.", '#10b981')}</li>
            <li style="margin-bottom: 5px; padding-left: 10px;">• <span style="font-weight: 700;">Récupération :</span> Planifiez ${formatDataValue(recoveryHours, '#00f3ff')} heures de récupération légère.</li>
        </ul>
    `;


    return story;
}