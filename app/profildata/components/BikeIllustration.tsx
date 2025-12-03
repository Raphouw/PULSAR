// Composant BikeIllustration EXTENDED
// Ajout de 10+ types de vélos avec géométries améliorées
// VERSION A – Complet, avec beaux designs SVG

import React from 'react';

export const BikeIllustration = ({ type, color, size = 150 }: { type: string, color: string, size?: number }) => {
    const viewBox = "0 0 260 170";

    const mainStroke = 3;
    const fatTireStroke = 5;
    const aeroFillOpacity = 0.3;

    const rearHub = { x: 60, y: 125 };
    const frontHub = { x: 190, y: 125 };
    const crankBB = { x: 115, y: 125 };
    const wheelRadius = 36;

    // --- Wheels ---
    const Wheel = ({ cx, cy, deep = false, fat = false, disc = false }: any) => (
        <g>
            <circle cx={cx} cy={cy} r={wheelRadius} stroke={color} strokeWidth={fat ? fatTireStroke : mainStroke} fill="none" />
            {disc ? (
                <circle cx={cx} cy={cy} r={wheelRadius - 4} fill={color} opacity={0.18} />
            ) : deep ? (
                <circle cx={cx} cy={cy} r={wheelRadius - 12} stroke={color} strokeWidth={2} opacity={0.6} fill="none" />
            ) : null}
            <circle cx={cx} cy={cy} r={3} fill={color} />
        </g>
    );

    const Spokes = ({ cx, cy }: any) => (
        <g stroke={color} strokeWidth={1} opacity={0.35}>
            <line x1={cx} y1={cy - wheelRadius} x2={cx} y2={cy + wheelRadius} />
            <line x1={cx - wheelRadius} y1={cy} x2={cx + wheelRadius} y2={cy} />
            <line x1={cx - wheelRadius * 0.7} y1={cy - wheelRadius * 0.7} x2={cx + wheelRadius * 0.7} y2={cy + wheelRadius * 0.7} />
            <line x1={cx + wheelRadius * 0.7} y1={cy - wheelRadius * 0.7} x2={cx - wheelRadius * 0.7} y2={cy + wheelRadius * 0.7} />
        </g>
    );

    // --- Handlebars ---
    const Handlebar = ({ top, mode }: any) => {
        switch (mode) {
            case "flat":
                return <line x1={top.x - 20} y1={top.y - 4} x2={top.x + 30} y2={top.y - 6} stroke={color} strokeWidth={mainStroke} strokeLinecap="round" />;
            case "aero":
                return (
                    <g stroke={color} strokeWidth={mainStroke}>
                        <line x1={top.x - 5} y1={top.y} x2={top.x + 15} y2={top.y} />
                        <path d={`M${top.x + 5} ${top.y} L${top.x + 45} ${top.y - 5} L${top.x + 50} ${top.y - 18}`} strokeWidth={2.5} />
                        <rect x={top.x - 2} y={top.y - 6} width={12} height={4} fill={color} opacity={0.5} />
                    </g>
                );
            default:
                return <path d={`M${top.x} ${top.y} l12 0 c12 0 16 6 16 16 c0 12 -6 20 -14 20 l-10 0`} stroke={color} strokeWidth={mainStroke} fill="none" />;
        }
    };

    const CrankAndSaddle = ({ seat }: any) => (
        <>
            <circle cx={crankBB.x} cy={crankBB.y} r={10} stroke={color} strokeWidth={mainStroke} fill="none" />
            <line x1={seat.x} y1={seat.y} x2={seat.x + 2} y2={seat.y - 15} stroke={color} strokeWidth={mainStroke + 1} />
            <path d={`M${seat.x - 12} ${seat.y - 18} L${seat.x + 10} ${seat.y - 18}`} stroke={color} strokeWidth={6} strokeLinecap="round" />
        </>
    );

    // ------------------------------------------------------------------
    // ------------------------ BIKE DESIGNS -----------------------------
    // ------------------------------------------------------------------

    const bikes: Record<string, React.ReactNode> = {};

    // 1. Aero
    bikes["Aero"] = (() => {
        const st = { x: 105, y: 65 };
        const ht = { x: 175, y: 75 };
        const hb = { x: 180, y: 108 };
        const frame = `${rearHub.x},${rearHub.y} ${crankBB.x},${crankBB.y} ${hb.x},${hb.y} ${ht.x},${ht.y} ${st.x},${st.y}`;
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} deep />
                <Wheel cx={frontHub.x} cy={frontHub.y} deep />
                <polygon points={frame} fill={color} opacity={aeroFillOpacity} stroke={color} strokeWidth={mainStroke} />
                <line x1={rearHub.x} y1={rearHub.y} x2={st.x} y2={st.y} stroke={color} strokeWidth={mainStroke} />
                <line x1={hb.x} y1={hb.y} x2={frontHub.x} y2={frontHub.y} stroke={color} strokeWidth={mainStroke + 2} />
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="drop" />
            </>
        );
    })();

    // 2. Grimpeur
    bikes["Grimpeur"] = (() => {
        const st = { x: 100, y: 60 };
        const ht = { x: 165, y: 65 };
        const hb = { x: 170, y: 108 };
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} />
                <Spokes cx={rearHub.x} cy={rearHub.y} />
                <Wheel cx={frontHub.x} cy={frontHub.y} />
                <Spokes cx={frontHub.x} cy={frontHub.y} />
                <g stroke={color} strokeWidth={mainStroke} fill="none">
                    <path d={`M${rearHub.x},${rearHub.y} L${crankBB.x},${crankBB.y} L${hb.x},${hb.y} L${ht.x},${ht.y} L${st.x},${st.y} Z`} />
                    <line x1={rearHub.x} y1={rearHub.y} x2={st.x} y2={st.y} />
                    <line x1={hb.x} y1={hb.y} x2={frontHub.x} y2={frontHub.y} />
                </g>
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="drop" />
            </>
        );
    })();

    // 3. TT / CLM
    bikes["TT"] = bikes["CLM"] = (() => {
        const st = { x: 120, y: 70 };
        const ht = { x: 185, y: 88 };
        const hb = { x: 188, y: 110 };
        const frame = `${rearHub.x},${rearHub.y} ${crankBB.x},${crankBB.y + 5} ${hb.x},${hb.y} ${ht.x},${ht.y} ${st.x},${st.y}`;
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} disc />
                <Wheel cx={frontHub.x} cy={frontHub.y} deep />
                <polygon points={frame} fill={color} opacity={aeroFillOpacity + 0.1} stroke={color} strokeWidth={mainStroke} />
                <line x1={hb.x} y1={hb.y} x2={frontHub.x} y2={frontHub.y} stroke={color} strokeWidth={mainStroke + 2} />
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="aero" />
            </>
        );
    })();

    // 4. VTT (XC)
    bikes["VTT"] = (() => {
        const st = { x: 95, y: 85 };
        const ht = { x: 160, y: 65 };
        const hb = { x: 165, y: 100 };
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} fat />
                <Wheel cx={frontHub.x} cy={frontHub.y} fat />
                <g stroke={color} strokeWidth={mainStroke + 1} fill="none">
                    <path d={`M${crankBB.x},${crankBB.y} L${hb.x},${hb.y} L${ht.x},${ht.y} L${st.x},${st.y} Z`} />
                    <line x1={rearHub.x} y1={rearHub.y} x2={crankBB.x} y2={crankBB.y} />
                    <line x1={rearHub.x} y1={rearHub.y} x2={st.x} y2={st.y} />
                    <line x1={hb.x} y1={hb.y} x2={frontHub.x} y2={frontHub.y} strokeWidth={6} opacity={0.5} />
                    <line x1={hb.x} y1={hb.y} x2={frontHub.x} y2={frontHub.y} strokeWidth={2} />
                </g>
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="flat" />
            </>
        );
    })();

    // 5. Gravel
    bikes["Gravel"] = (() => {
        const st = { x: 100, y: 70 };
        const ht = { x: 165, y: 75 };
        const hb = { x: 170, y: 110 };
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} fat />
                <Wheel cx={frontHub.x} cy={frontHub.y} fat />
                <g stroke={color} strokeWidth={mainStroke} fill="none">
                    <path d={`M${rearHub.x},${rearHub.y} L${crankBB.x},${crankBB.y} L${hb.x},${hb.y} L${ht.x},${ht.y} L${st.x},${st.y} Z`} />
                </g>
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="drop" />
            </>
        );
    })();

    // 6. Endurance
    bikes["Endurance"] = (() => {
        const st = { x: 100, y: 68 };
        const ht = { x: 165, y: 72 };
        const hb = { x: 170, y: 110 };
        const bag = `${st.x + 5},${st.y + 5} ${ht.x - 5},${ht.y + 5} ${hb.x - 2},${hb.y - 2} ${crankBB.x + 5},${crankBB.y - 5}`;
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} />
                <Wheel cx={frontHub.x} cy={frontHub.y} />
                <g stroke={color} strokeWidth={mainStroke} fill="none">
                    <path d={`M${rearHub.x},${rearHub.y} L${crankBB.x},${crankBB.y} L${hb.x},${hb.y} L${ht.x},${ht.y} L${st.x},${st.y} Z`} />
                </g>
                <polygon points={bag} fill={color} opacity={0.4} />
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="drop" />
            </>
        );
    })();

    // 7. Cyclocross
    bikes["Cyclocross"] = (() => {
        const st = { x: 100, y: 68 };
        const ht = { x: 165, y: 70 };
        const hb = { x: 170, y: 108 };
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} fat />
                <Wheel cx={frontHub.x} cy={frontHub.y} fat />
                <g stroke={color} strokeWidth={mainStroke} fill="none">
                    <path d={`M${rearHub.x},${rearHub.y} L${crankBB.x},${crankBB.y} L${hb.x},${hb.y} L${ht.x},${ht.y} L${st.x},${st.y} Z`} />
                </g>
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="drop" />
            </>
        );
    })();

    // 8. Fixie / Messenger
    bikes["Fixie"] = (() => {
        const st = { x: 105, y: 62 };
        const ht = { x: 170, y: 70 };
        const hb = { x: 175, y: 112 };
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} deep />
                <Wheel cx={frontHub.x} cy={frontHub.y} deep />
                <g stroke={color} strokeWidth={mainStroke} fill="none">
                    <path d={`M${rearHub.x},${rearHub.y} L${crankBB.x},${crankBB.y} L${hb.x},${hb.y} L${ht.x},${ht.y} L${st.x},${st.y} Z`} />
                </g>
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="flat" />
            </>
        );
    })();

    // 9. Cargo
    bikes["Cargo"] = (() => {
        const st = { x: 105, y: 75 };
        const ht = { x: 150, y: 75 };
        const hb = { x: 155, y: 115 };
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} fat />
                <Wheel cx={frontHub.x + 25} cy={frontHub.y} fat />
                <rect x={frontHub.x - 10} y={frontHub.y - 40} width={50} height={30} stroke={color} fill={color} opacity={0.2} strokeWidth={mainStroke} />
                <g stroke={color} strokeWidth={mainStroke} fill="none">
                    <path d={`M${rearHub.x},${rearHub.y} L${crankBB.x},${crankBB.y} L${hb.x},${hb.y} L${ht.x},${ht.y} L${st.x},${st.y} Z`} />
                </g>
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="flat" />
            </>
        );
    })();

    // 10. BMX
    bikes["BMX"] = (() => {
        const st = { x: 90, y: 90 };
        const ht = { x: 140, y: 75 };
        const hb = { x: 145, y: 115 };
        return (
            <>
                <Wheel cx={rearHub.x} cy={rearHub.y} />
                <Wheel cx={frontHub.x - 20} cy={frontHub.y} />
                <g stroke={color} strokeWidth={mainStroke + 1} fill="none">
                    <path d={`M${crankBB.x - 15},${crankBB.y} L${hb.x},${hb.y} L${ht.x},${ht.y} L${st.x},${st.y} Z`} />
                </g>
                <CrankAndSaddle seat={st} />
                <Handlebar top={ht} mode="flat" />
            </>
        );
    })();

    const bike = bikes[type] || bikes["Grimpeur"];

    return (
        <svg width={size} height={size * (170 / 260)} viewBox={viewBox} style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}>
            {bike}
        </svg>
    );
};
