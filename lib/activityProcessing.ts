// lib/activityProcessing.ts

/**
 * Déclenche la détection de nouveaux cols (Phantom Hunter) sur une activité.
 * Appel asynchrone (Fire & Forget) pour ne pas bloquer l'UI.
 */
export async function triggerAutoDetection(activityId: number) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    try {
        console.log(`[PULSAR HOOK] 🕵️‍♂️ Triggering Climb Detection for Activity ${activityId}...`);
        
        // On appelle l'API interne qu'on a créée précédemment
        // Pas de 'await' bloquant ici, on veut juste lancer le processus
        fetch(`${baseUrl}/api/admin/detect-climbs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activityId })
        }).catch(err => console.error(`[PULSAR HOOK] Fetch Error:`, err));

    } catch (e) {
        console.error("[PULSAR HOOK] Error:", e);
    }
}