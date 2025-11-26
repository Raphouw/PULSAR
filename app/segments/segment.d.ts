// Fichier : app/segments/segment.d.ts

// Étend le type Segment importé de app/segments/page
declare module './page' {
    export interface Segment {
        tags: { label: string; color: string; }[] | null;
        max_grade: number | null; 
    }
}

// Étend le type SegmentDetail importé de app/segments/[id]/page
declare module './[id]/page' {
    export interface SegmentDetail {
        tags: { label: string; color: string; }[] | null;
    }
}