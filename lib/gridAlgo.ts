// lib/gridAlgo.ts
import { tile2lat, tile2lon } from './mapUtils';

export type TileCoord = { x: number; y: number; key: string };

// --- 1. MAX SQUARE (Inchangé) ---
export function calculateMaxSquare(tiles: Set<string>): { maxSquare: number; topLeft: TileCoord | null } {
    if (tiles.size === 0) return { maxSquare: 0, topLeft: null };
    const coords = Array.from(tiles).map(t => { const [x, y] = t.split(',').map(Number); return { x, y }; });
    const gridMap = new Map<string, boolean>();
    tiles.forEach(t => gridMap.set(t, true));
    
    let maxSquareSize = 0;
    let maxSquareTopLeft: TileCoord | null = null;
    
    // Optimisation possible : utiliser une Matrice de programmation dynamique pour O(N*M)
    // Mais l'approche itérative suffit pour <100k tuiles
    coords.forEach(({ x, y }) => {
      let size = 1;
      while (true) {
          let allExists = true;
          for (let i = 0; i <= size; i++) {
              if (!gridMap.has(`${x + size},${y + i}`)) { allExists = false; break; }
              if (!gridMap.has(`${x + i},${y + size}`)) { allExists = false; break; }
          }
          if (allExists) size++; else break;
      }
      if (size > maxSquareSize) { maxSquareSize = size; maxSquareTopLeft = { x, y, key: `${x},${y}` }; }
    });
    return { maxSquare: maxSquareSize, topLeft: maxSquareTopLeft };
}

export function getSquareTiles(topLeft: TileCoord | null, size: number): string[] {
    if (!topLeft || size <= 0) return [];
    const tiles: string[] = [];
    for (let dx = 0; dx < size; dx++) {
        for (let dy = 0; dy < size; dy++) {
            tiles.push(`${topLeft.x + dx},${topLeft.y + dy}`);
        }
    }
    return tiles;
}

// --- 2. CALCUL AIRE (Inchangé) ---
export function calculateTotalArea(tiles: Set<string>, zoom: number = 14): string {
    let totalAreaKm2 = 0;
    tiles.forEach(t => {
        const [x, y] = t.split(',').map(Number);
        const latNorth = tile2lat(y, zoom);
        const latSouth = tile2lat(y + 1, zoom);
        const lonWest = tile2lon(x, zoom);
        const lonEast = tile2lon(x + 1, zoom);
        const latDiff = Math.abs(latNorth - latSouth);
        const heightKm = latDiff * 111.32;
        const avgLatRad = (latNorth + latSouth) / 2 * (Math.PI / 180);
        const widthKm = Math.abs(lonWest - lonEast) * 111.32 * Math.cos(avgLatRad);
        totalAreaKm2 += heightKm * widthKm;
    });
    return totalAreaKm2.toFixed(2);
}

// --- 3. CLUSTER (Inchangé) ---
export function findLargestCluster(tilesSet: Set<string>): Set<string> {
    const visited = new Set<string>();
    let maxCluster = new Set<string>();
    const getNeighbors = (key: string) => {
        const [x, y] = key.split(',').map(Number);
        return [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`];
    };
    tilesSet.forEach(startTile => {
        if (!visited.has(startTile)) {
            const currentCluster = new Set<string>();
            const queue = [startTile];
            visited.add(startTile);
            currentCluster.add(startTile);
            while (queue.length > 0) {
                const tile = queue.pop()!;
                const neighbors = getNeighbors(tile);
                for (const n of neighbors) {
                    if (tilesSet.has(n) && !visited.has(n)) {
                        visited.add(n);
                        currentCluster.add(n);
                        queue.push(n);
                    }
                }
            }
            if (currentCluster.size > maxCluster.size) maxCluster = currentCluster;
        }
    });
    return maxCluster;
}

// --- 4. 🔥 SMART TARGETS : OPTIMISATION DIRECTIONNELLE ---

// Helper : Calcule le coût (nombre de tuiles manquantes) pour une extension donnée
function getExpansionCost(tilesSet: Set<string>, newTopLeftX: number, newTopLeftY: number, newSize: number): number {
    let missingCount = 0;
    // On vérifie tout le carré théorique (on pourrait optimiser en ne vérifiant que les bords, mais c'est plus sûr ainsi)
    for (let dx = 0; dx < newSize; dx++) {
        for (let dy = 0; dy < newSize; dy++) {
            const key = `${newTopLeftX + dx},${newTopLeftY + dy}`;
            if (!tilesSet.has(key)) {
                missingCount++;
            }
        }
    }
    return missingCount;
}

// Helper : Récupère les tuiles manquantes pour une configuration donnée
function getMissingTilesForConfig(tilesSet: Set<string>, newTopLeftX: number, newTopLeftY: number, newSize: number): string[] {
    const missing: string[] = [];
    for (let dx = 0; dx < newSize; dx++) {
        for (let dy = 0; dy < newSize; dy++) {
            const key = `${newTopLeftX + dx},${newTopLeftY + dy}`;
            if (!tilesSet.has(key)) {
                missing.push(key);
            }
        }
    }
    return missing;
}

export function getFutureTargets(tilesSet: Set<string>, topLeft: TileCoord | null, currentSize: number, depth: number = 10): Map<string, number> {
    if (!topLeft || currentSize <= 0) return new Map();
    
    const targets = new Map<string, number>();
    
    // On simule l'évolution du carré "virtuel"
    let virtualTLX = topLeft.x;
    let virtualTLY = topLeft.y;
    let virtualSize = currentSize;

    // Pour chaque niveau de profondeur (N+1, N+2...)
    for (let k = 1; k <= depth; k++) {
        const nextSize = virtualSize + 1;
        
        // On teste les 4 directions possibles d'expansion
        // 1. Bas-Droite (TL reste fixe)
        const costBR = getExpansionCost(tilesSet, virtualTLX, virtualTLY, nextSize);
        
        // 2. Bas-Gauche (TL bouge à gauche : x-1)
        const costBL = getExpansionCost(tilesSet, virtualTLX - 1, virtualTLY, nextSize);
        
        // 3. Haut-Droite (TL bouge en haut : y-1)
        const costTR = getExpansionCost(tilesSet, virtualTLX, virtualTLY - 1, nextSize);
        
        // 4. Haut-Gauche (TL bouge en haut-gauche : x-1, y-1)
        const costTL = getExpansionCost(tilesSet, virtualTLX - 1, virtualTLY - 1, nextSize);

        // On trouve le coût minimum
        const minCost = Math.min(costBR, costBL, costTR, costTL);

        // On applique le meilleur choix
        // Priorité arbitraire en cas d'égalité : BR > BL > TR > TL (ou aléatoire pour faire plus naturel ?)
        let bestMissingTiles: string[] = [];

        if (costBR === minCost) {
            bestMissingTiles = getMissingTilesForConfig(tilesSet, virtualTLX, virtualTLY, nextSize);
            // TL ne change pas
        } else if (costBL === minCost) {
            bestMissingTiles = getMissingTilesForConfig(tilesSet, virtualTLX - 1, virtualTLY, nextSize);
            virtualTLX -= 1; // Le carré se décale à gauche
        } else if (costTR === minCost) {
            bestMissingTiles = getMissingTilesForConfig(tilesSet, virtualTLX, virtualTLY - 1, nextSize);
            virtualTLY -= 1; // Le carré se décale en haut
        } else {
            bestMissingTiles = getMissingTilesForConfig(tilesSet, virtualTLX - 1, virtualTLY - 1, nextSize);
            virtualTLX -= 1;
            virtualTLY -= 1;
        }

        // On ajoute les cibles trouvées à la Map globale avec le niveau d'urgence K
        bestMissingTiles.forEach(tileKey => {
            // Si la tuile n'est pas déjà ciblée par un niveau inférieur (plus urgent)
            if (!targets.has(tileKey)) {
                targets.set(tileKey, k);
            }
        });

        // On met à jour la taille pour le prochain tour de boucle
        virtualSize = nextSize;
    }

    return targets;
}