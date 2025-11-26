// Dans LivingTree.tsx
"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react' 
import { ActivityNode, DISTANCE_PALETTE } from '../../lib/treeUtils'

interface LivingTreeProps {
  data: ActivityNode[]
  selectedType: string | null
  onNodeHover: (node: ActivityNode | null) => void;
}

const HOVER_RADIUS = 25; // Légèrement augmenté pour plus de tolérance

export default function LivingTree({ data, selectedType, onNodeHover }: LivingTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastHoveredNodeRef = useRef<ActivityNode | null>(null); // 🔥 Correction : utiliser une ref
  
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let rotation = 0
    let nodesOnScreen: { x: number, y: number, node: ActivityNode }[] = [];

    const resize = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    window.addEventListener('resize', resize)
    resize()

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    };

    const handleMouseLeave = () => {
      setMousePos(null);
      onNodeHover(null);
      lastHoveredNodeRef.current = null; // 🔥 Reset la ref aussi
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    const render = () => {
      if (!ctx || !canvas) return
      
      ctx.fillStyle = DISTANCE_PALETTE.background
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const startY = canvas.height * 0.95
      
      const radius = Math.min(canvas.width, canvas.height) * 0.35
      const heightSpacing = (canvas.height * 0.9) / (data.length || 1) * 1.5;
      
      rotation += 0.002

      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5
      ctx.moveTo(centerX, canvas.height * 0.05)
      ctx.lineTo(centerX, canvas.height * 0.98)
      ctx.stroke()
      ctx.shadowBlur = 0;

      nodesOnScreen = [];

      let closestNode: ActivityNode | null = null;
      let minDistanceSq = HOVER_RADIUS * HOVER_RADIUS;
    
      data.forEach((node, index) => {
        const isDimmed = selectedType && node.type !== selectedType
        
        const y = startY - (index * heightSpacing)
        const angle = (index * 0.2) + rotation
        const barLength = 20 + (node.intensity * radius)
        const x = Math.cos(angle) * barLength
        const z = Math.sin(angle) * barLength

        const perspective = 400
        const scale = perspective / (perspective + z)
        
        const screenX = centerX + (x * scale)
        const screenY = y

        // Stocker la position projetée
        if (screenY > canvas.height * 0.05 && screenY < canvas.height * 0.98) {
          nodesOnScreen.push({ x: screenX, y: screenY, node });
        }

        // Dessin des branches...
        ctx.beginPath()
        ctx.moveTo(centerX, screenY)
        ctx.lineTo(screenX, screenY)
        
        const gradient = ctx.createLinearGradient(centerX, screenY, screenX, screenY)
        gradient.addColorStop(0, 'rgba(255,255,255,0)')
        gradient.addColorStop(0.5, node.color + (isDimmed ? '10' : '80'))
        gradient.addColorStop(1, node.color + (isDimmed ? '20' : 'FF'))
        
        ctx.strokeStyle = gradient
        ctx.lineWidth = isDimmed ? 1 : 2 * scale
        ctx.stroke()

        // Dessin des points
        if (!isDimmed) {
          ctx.beginPath()
          ctx.arc(screenX, screenY, 2 * scale, 0, Math.PI * 2)
          ctx.fillStyle = node.color
          ctx.fill()
          
          ctx.shadowBlur = 10 * scale
          ctx.shadowColor = node.color
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      });

      // 🔥 CORRECTION : Logique de hover améliorée
      if (mousePos) {
        nodesOnScreen.forEach(projNode => {
          const dx = projNode.x - mousePos.x;
          const dy = projNode.y - mousePos.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            closestNode = projNode.node;
          }
        });
      }

      // 🔥 CORRECTION : Utilisation de la ref pour la comparaison
      if (closestNode !== lastHoveredNodeRef.current) {
        onNodeHover(closestNode);
        lastHoveredNodeRef.current = closestNode;
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId)
    }
  }, [data, selectedType, onNodeHover, mousePos]) // 🔥 Ajout de mousePos aux dépendances

  return (
    <div ref={containerRef} style={{ background: DISTANCE_PALETTE.background }} className="w-full h-full relative">
      <canvas ref={canvasRef} className="block" />
      <div style={overlayStyle} />
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: 'linear-gradient(to top, #02040a 0%, transparent 50%, #02040a 100%)',
    opacity: 0.5,
};