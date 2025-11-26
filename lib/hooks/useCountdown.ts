// Fichier : lib/hooks/useCountdown.ts
import { useState, useEffect } from 'react';

// Fonction pour formater le temps restant en chaîne HH:MM:SS
const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '00h 00m 00s';

    const absSeconds = Math.floor(seconds);
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
};

/**
 * Hook pour calculer et formater un compte à rebours en temps réel.
 * @param targetTimestamp - Le timestamp cible (en millisecondes).
 * @param isActive - Booléen pour activer/désactiver le timer.
 * @returns {object} - Le temps restant formaté et les secondes restantes
 */
export const useCountdown = (targetTimestamp: number, isActive: boolean) => {
    // Calculer le temps restant initial
    const calculateTimeRemaining = (target: number) => Math.max(0, (target - Date.now()) / 1000);
    
    const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(calculateTimeRemaining(targetTimestamp));

    useEffect(() => {
        if (!isActive || timeRemainingSeconds <= 0) {
            // Arrêter le timer si inactif ou si le temps est écoulé
            return;
        }

        const intervalId = setInterval(() => {
            // Mettre à jour le temps restant
            const newTimeRemaining = calculateTimeRemaining(targetTimestamp);
            setTimeRemainingSeconds(newTimeRemaining);
            
            if (newTimeRemaining <= 0) {
                clearInterval(intervalId);
            }
        }, 1000);

        // Nettoyage de l'intervalle lors du démontage
        return () => clearInterval(intervalId);
    }, [targetTimestamp, isActive, timeRemainingSeconds]);

    return {
        formatted: formatTime(timeRemainingSeconds),
        seconds: timeRemainingSeconds,
        isFinished: timeRemainingSeconds <= 0
    };
};