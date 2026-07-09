import { tile2lat, tile2lon } from './mapUtils';

export type TileCoord = { x: number; y: number; key: string };

// --- 1. MAX SQUARE (Mis à jour avec la Blacklist) ---
export function calculateMaxSquare(
  tiles: Set<string>, 
  blacklistSet?: Set<string>
): { maxSquare: number; topLeft: TileCoord | null } {
    if (tiles.size === 0) return { maxSquare: 0, topLeft: null };
    const coords = Array.from(tiles).map(t => { const [x, y] = t.split(',').map(Number); return { x, y }; });
    const gridMap = new Map<string, boolean>();
    tiles.forEach(t => gridMap.set(t, true));
    
    let maxSquareSize = 0;
    let maxSquareTopLeft: TileCoord | null = null;
    
    coords.forEach(({ x, y }) => {
      let size = 1;
      while (true) {
          let allExists = true;
          for (let i = 0; i <= size; i++) {
              const key1 = `${x + size},${y + i}`;
              const key2 = `${x + i},${y + size}`;
              
              // Si la tuile est blacklistée OU qu'elle n'est pas visitée -> Rupture du carré
              if (blacklistSet?.has(key1) || !gridMap.has(key1)) { allExists = false; break; }
              if (blacklistSet?.has(key2) || !gridMap.has(key2)) { allExists = false; break; }
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

// --- 2. CALCUL AIRE ---
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

// --- 3. CLUSTERS (Top 5) ---
export function findTopClusters(tilesSet: Set<string>, blacklistSet?: Set<string>, count: number = 5): Set<string>[] {
    const visited = new Set<string>();
    const clusters: Set<string>[] = [];
    
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
            clusters.push(currentCluster);
        }
    });

    // Trie par taille décroissante et renvoie le top X
    return clusters.sort((a, b) => b.size - a.size).slice(0, count);
}

// --- 5. UTILITAIRE : CIBLAGE MANUEL DE CARRÉ ---
export function getSquareAt(tilesSet: Set<string>, blacklistSet: Set<string> | undefined, startX: number, startY: number): number {
    let size = 1;
    const gridMap = new Map<string, boolean>();
    tilesSet.forEach(t => gridMap.set(t, true));

    // Si la tuile ciblée n'est pas explorée, impossible de démarrer un carré
    if (!gridMap.has(`${startX},${startY}`)) return 0;

    while (true) {
        let allExists = true;
        for (let i = 0; i <= size; i++) {
            const key1 = `${startX + size},${startY + i}`;
            const key2 = `${startX + i},${startY + size}`;

            if (blacklistSet?.has(key1) || !gridMap.has(key1)) { allExists = false; break; }
            if (blacklistSet?.has(key2) || !gridMap.has(key2)) { allExists = false; break; }
        }
        if (allExists) size++; else break;
    }
    return size;
}

// --- 4. SMART TARGETS ---
// Helper
function getExpansionCost(tilesSet: Set<string>, blacklistSet: Set<string>, newTopLeftX: number, newTopLeftY: number, newSize: number): number {
    let missingCount = 0;
    for (let dx = 0; dx < newSize; dx++) {
        for (let dy = 0; dy < newSize; dy++) {
            const key = `${newTopLeftX + dx},${newTopLeftY + dy}`;
            // Si la tuile est blacklistée, le coût d'expansion devient infini (bloquant)
            if (blacklistSet.has(key)) return Infinity; 
            if (!tilesSet.has(key)) missingCount++;
        }
    }
    return missingCount;
}

function getMissingTilesForConfig(tilesSet: Set<string>, newTopLeftX: number, newTopLeftY: number, newSize: number): string[] {
    const missing: string[] = [];
    for (let dx = 0; dx < newSize; dx++) {
        for (let dy = 0; dy < newSize; dy++) {
            const key = `${newTopLeftX + dx},${newTopLeftY + dy}`;
            if (!tilesSet.has(key)) missing.push(key);
        }
    }
    return missing;
}




export function getValidDiagonalTargets(
    tilesSet: Set<string>, 
    blacklistSet: Set<string> | undefined, 
    startX: number, 
    startY: number, 
    maxSearchSize: number = 15
): {x: number, y: number}[] {
    const targets: {x: number, y: number}[] = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    for (let size = 2; size <= maxSearchSize; size++) {
        for (const [dx, dy] of directions) {
            const endX = startX + (size - 1) * dx;
            const endY = startY + (size - 1) * dy;
            const topLeftX = Math.min(startX, endX);
            const topLeftY = Math.min(startY, endY);

            let isValid = true;
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const key = `${topLeftX + i},${topLeftY + j}`;
                    if (!tilesSet.has(key) || blacklistSet?.has(key)) {
                        isValid = false;
                        break;
                    }
                }
                if (!isValid) break;
            }
            if (isValid) targets.push({ x: endX, y: endY });
        }
    }
    return targets;
}

export function getFutureTargets(
    tilesSet: Set<string>, 
    blacklistSet: Set<string>, 
    topLeft: TileCoord | null, 
    currentSize: number, 
    depth: number = 10, 
    isCustom: boolean = false
): Map<string, number> {
    if (!topLeft || currentSize <= 0) return new Map();
    const targets = new Map<string, number>();
    
    // On crée un état virtuel pour avancer couche par couche (Algorithme Glouton)
    const virtualTopLeft = { ...topLeft };
    let virtualSize = currentSize;
    const virtualTiles = new Set(tilesSet); // Simulation des acquis pour ne pas recompter
    
    for (let k = 1; k <= depth; k++) {
        const targetSize = virtualSize + 1; // On n'augmente que d'une ligne/colonne à la fois
        let bestCost = Infinity;
        let bestMissingTiles: string[] = [];
        let bestDx = 0;
        let bestDy = 0;

        // Pour s'agrandir d'exactement +1, le point d'ancrage Nord-Ouest 
        // ne peut que rester sur place (0) ou reculer d'une case (1) vers le Nord/Ouest.
        for (let dx = 0; dx <= 1; dx++) {
            for (let dy = 0; dy <= 1; dy++) {
                const cx = virtualTopLeft.x - dx;
                const cy = virtualTopLeft.y - dy;
                
                let cost = 0;
                let isValid = true;
                const missing: string[] = [];

                // On scanne la surface du nouveau carré testé
                for (let ix = 0; ix < targetSize; ix++) {
                    for (let iy = 0; iy < targetSize; iy++) {
                        const tileKey = `${cx + ix},${cy + iy}`;
                        
                        if (blacklistSet?.has(tileKey)) {
                            isValid = false;
                            break;
                        }
                        // On vérifie contre les tuiles virtuelles (historique + niveaux précédents validés)
                        if (!virtualTiles.has(tileKey)) {
                            missing.push(tileKey);
                            cost++;
                        }
                    }
                    if (!isValid) break;
                }

                // On garde strictement le meilleur chemin local (sans fusion d'égalité)
                if (isValid && cost < bestCost) {
                    bestCost = cost;
                    bestMissingTiles = missing;
                    bestDx = dx;
                    bestDy = dy;
                }
            }
        }

        // Si une expansion valide a été trouvée
        if (bestCost !== Infinity) {
            bestMissingTiles.forEach(t => {
                if (!targets.has(t)) targets.set(t, k);
                virtualTiles.add(t); // On valide ces tuiles pour l'itération k+1
            });

            // On verrouille la nouvelle position d'ancrage pour la prochaine couche
            virtualTopLeft.x -= bestDx;
            virtualTopLeft.y -= bestDy;
            virtualSize++;
        } else {
            // Expansion bloquée (par la blacklist ou un cul-de-sac), on stoppe la recherche
            break;
        }
    }
    
    return targets;
}