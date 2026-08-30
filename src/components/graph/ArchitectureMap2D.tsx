'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3-force';
import { ArchEdge, ArchNode, ArchitectureLayer, RiskLevel } from '@/types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  ShieldAlert,
  Activity,
} from 'lucide-react';

interface SimulationNode extends ArchNode, d3.SimulationNodeDatum {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  id: string;
  source: SimulationNode | string;
  target: SimulationNode | string;
  type: string;
  confidence: number;
}

export type ColorMode = 'layer' | 'heatmap' | 'risk';

interface ArchitectureMap2DProps {
  nodes: ArchNode[];
  edges: ArchEdge[];
  selectedNodeId: string | null;
  impactedNodeIds?: string[];
  activePathNodeIds?: string[];
  colorMode?: ColorMode;
  onSelectNode: (node: ArchNode) => void;
  onAnalyzeImpact?: (nodeId: string) => void;
}

const LAYER_COLORS: Record<ArchitectureLayer, string> = {
  frontend: '#38BDF8', // Sky
  gateway: '#60A5FA',  // Blue
  api: '#0EA5E9',      // Bright Sky
  service: '#818CF8',  // Indigo / Violet
  domain: '#A78BFA',   // Purple
  database: '#F59E0B', // Amber
  queue: '#FB923C',    // Orange
  util: '#94A3B8',     // Slate
  test: '#10B981',     // Emerald
  infra: '#64748B',    // Muted slate
  note: '#F472B6',     // Pink
  external: '#E2E8F0', // Off-white
};

const RISK_COLORS: Record<RiskLevel, string> = {
  critical: '#F43F5E', // Rose
  high: '#FB7185',     // Light Rose
  medium: '#FBBF24',   // Amber
  low: '#10B981',      // Emerald
};

function getHeatmapColor(churnScore: number = 3): string {
  if (churnScore >= 8) return '#F43F5E';
  if (churnScore >= 6) return '#FB923C';
  if (churnScore >= 4) return '#FBBF24';
  if (churnScore >= 2) return '#38BDF8';
  return '#64748B';
}

function getNodeBadge(node: ArchNode): string {
  if (node.type === 'api' || node.layer === 'api' || node.layer === 'gateway') return 'API';
  if (node.type === 'database' || node.layer === 'database') return 'DB';
  if (node.type === 'service') return 'SRV';
  if (node.layer === 'frontend') return 'UI';
  if (node.layer === 'test' || node.type === 'test') return 'TEST';
  return 'FN';
}

export const ArchitectureMap2D: React.FC<ArchitectureMap2DProps> = ({
  nodes,
  edges,
  selectedNodeId,
  impactedNodeIds = [],
  activePathNodeIds = [],
  colorMode = 'layer',
  onSelectNode,
  onAnalyzeImpact,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [activeColorMode, setActiveColorMode] = useState<ColorMode>(colorMode);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<ArchNode | null>(null);

  // Transform state for Pan/Zoom
  const transformRef = useRef<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedNodeRef = useRef<SimulationNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Filtered nodes and edges
  const filteredData = useMemo(() => {
    let filteredNodes = nodes;
    if (selectedLayer !== 'all') {
      filteredNodes = filteredNodes.filter((n) => n.layer === selectedLayer);
    }
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [nodes, edges, selectedLayer]);

  // D3 Force Simulation setup
  const simNodesRef = useRef<SimulationNode[]>([]);
  const simLinksRef = useRef<SimulationLink[]>([]);
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);

  useEffect(() => {
    // Initial clustered placement
    const simNodes: SimulationNode[] = filteredData.nodes.map((n, i) => {
      const angle = (i / Math.max(1, filteredData.nodes.length)) * Math.PI * 2;
      const radius = 180 + (i % 3) * 60;
      return {
        ...n,
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 30,
        y: Math.sin(angle) * radius + (Math.random() - 0.5) * 30,
      };
    });

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: SimulationLink[] = filteredData.edges
      .map((e) => ({
        id: e.id,
        source: nodeMap.get(e.source)!,
        target: nodeMap.get(e.target)!,
        type: e.type,
        confidence: e.confidence,
      }))
      .filter((l) => l.source && l.target);

    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;

    // High-readability force parameters: generous spacing and clear collision margins
    const sim = d3
      .forceSimulation<SimulationNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimulationNode, SimulationLink>(simLinks)
          .id((d) => d.id)
          .distance(110)
          .strength(0.4)
      )
      .force('charge', d3.forceManyBody().strength(-350).distanceMax(600))
      .force('center', d3.forceCenter(0, 0).strength(0.08))
      .force('collision', d3.forceCollide().radius(48).strength(0.85))
      .alphaDecay(0.025);

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [filteredData]);

  // Continuous Canvas Render Loop
  useEffect(() => {
    let pulseStep = 0;

    const render = () => {
      pulseStep += 0.05;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Apply Pan and Zoom
      ctx.translate(width / 2 + transformRef.current.x, height / 2 + transformRef.current.y);
      ctx.scale(transformRef.current.k, transformRef.current.k);

      const simLinks = simLinksRef.current;
      const simNodes = simNodesRef.current;
      const selectedId = selectedNodeId;
      const impactedSet = new Set(impactedNodeIds);
      const activePathSet = new Set(activePathNodeIds);

      const isLight = document.documentElement.classList.contains('light');

      // 1. Draw Links / Edges
      for (const link of simLinks) {
        const source = link.source as SimulationNode;
        const target = link.target as SimulationNode;
        if (!source.x || !target.x) continue;

        const isLinkInPath = activePathSet.has(source.id) && activePathSet.has(target.id);
        const isConnectedToSelected = selectedId && (source.id === selectedId || target.id === selectedId);
        const isImpactedLink = impactedSet.has(source.id) && impactedSet.has(target.id);

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isLinkInPath) {
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 2.5;
        } else if (isImpactedLink) {
          ctx.strokeStyle = '#F43F5E';
          ctx.lineWidth = 2;
        } else if (isConnectedToSelected) {
          ctx.strokeStyle = isLight ? '#64748B' : '#94A3B8';
          ctx.lineWidth = 1.8;
        } else {
          ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1.2;
        }

        ctx.stroke();

        // Directional arrow
        if (isConnectedToSelected || isLinkInPath || isImpactedLink) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const angle = Math.atan2(dy, dx);
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;

          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(5, 0);
          ctx.lineTo(-5, -3.5);
          ctx.lineTo(-5, 3.5);
          ctx.closePath();
          ctx.fillStyle = isLinkInPath ? '#0284C7' : isImpactedLink ? '#F43F5E' : isLight ? '#64748B' : '#94A3B8';
          ctx.fill();
          ctx.restore();
        }
      }

      // 2. Draw Nodes
      for (const node of simNodes) {
        if (!node.x || !node.y) continue;

        const isSelected = node.id === selectedId;
        const isImpacted = impactedSet.has(node.id);

        let nodeColor = LAYER_COLORS[node.layer] || '#94A3B8';
        if (activeColorMode === 'heatmap') {
          nodeColor = getHeatmapColor(node.metrics.churnScore);
        } else if (activeColorMode === 'risk') {
          nodeColor = RISK_COLORS[node.risk.level] || '#10B981';
        }

        const baseRadius = node.type === 'service' ? 22 : node.type === 'api' || node.type === 'database' ? 20 : 16;

        // Blast radius pulse ring
        if (isImpacted) {
          const pulseRadius = baseRadius + 8 + Math.sin(pulseStep) * 4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Selection glow ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, baseRadius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Main Node Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = isLight
          ? (isSelected ? '#E0F2FE' : isImpacted ? '#FFE4E6' : '#FFFFFF')
          : (isSelected ? '#0F172A' : isImpacted ? '#2B1218' : '#0B0F17');
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#38BDF8' : isImpacted ? '#F43F5E' : nodeColor;
        ctx.lineWidth = isSelected ? 2.5 : 2;
        ctx.stroke();

        // Node Inner Dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Type Badge Pill above node
        const badgeLabel = (node.type || 'MOD').toUpperCase().slice(0, 4);
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = isLight ? 'rgba(241, 245, 249, 0.95)' : 'rgba(15, 23, 42, 0.95)';
        ctx.beginPath();
        ctx.roundRect(node.x - 14, node.y - baseRadius - 13, 28, 11, 3);
        ctx.fill();
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = nodeColor;
        ctx.fillText(badgeLabel, node.x, node.y - baseRadius - 7.5);

        // Node Name Label
        const label = node.name.length > 20 ? `${node.name.slice(0, 18)}…` : node.name;
        ctx.font = isSelected ? 'bold 11px system-ui, sans-serif' : '10.5px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Text halo for 100% visibility against lines/background
        ctx.strokeStyle = isLight ? '#FFFFFF' : '#080B10';
        ctx.lineWidth = 3.5;
        ctx.strokeText(label, node.x, node.y + baseRadius + 14);

        ctx.fillStyle = isLight
          ? (isSelected ? '#0369A1' : isImpacted ? '#BE123C' : '#0F172A')
          : (isSelected ? '#FFFFFF' : isImpacted ? '#FDA4AF' : '#E2E8F0');
        ctx.fillText(label, node.x, node.y + baseRadius + 14);
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [selectedNodeId, impactedNodeIds, activePathNodeIds, activeColorMode]);

  // Resize canvas to container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cursor-centered Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newK = Math.min(3, Math.max(0.2, transformRef.current.k * zoomFactor));

    const originX = canvas.width / 2 + transformRef.current.x;
    const originY = canvas.height / 2 + transformRef.current.y;

    const newOriginX = mouseX - (mouseX - originX) * (newK / transformRef.current.k);
    const newOriginY = mouseY - (mouseY - originY) * (newK / transformRef.current.k);

    transformRef.current = {
      x: newOriginX - canvas.width / 2,
      y: newOriginY - canvas.height / 2,
      k: newK,
    };
    setZoomLevel(newK);
  };

  // Mouse Pan & Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - canvas.width / 2 - transformRef.current.x) / transformRef.current.k;
    const worldY = (mouseY - canvas.height / 2 - transformRef.current.y) / transformRef.current.k;

    const clickedNode = simNodesRef.current.find((n) => {
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      return Math.sqrt(dx * dx + dy * dy) < 28;
    });

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
      if (simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
    } else {
      isDraggingRef.current = true;
      dragDistanceRef.current = 0;
      dragStartRef.current = {
        x: mouseX - transformRef.current.x,
        y: mouseY - transformRef.current.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggedNodeRef.current) {
      const worldX = (mouseX - canvas.width / 2 - transformRef.current.x) / transformRef.current.k;
      const worldY = (mouseY - canvas.height / 2 - transformRef.current.y) / transformRef.current.k;
      draggedNodeRef.current.fx = worldX;
      draggedNodeRef.current.fy = worldY;
      return;
    }

    if (isDraggingRef.current) {
      const newX = mouseX - dragStartRef.current.x;
      const newY = mouseY - dragStartRef.current.y;
      dragDistanceRef.current += Math.abs(newX - transformRef.current.x) + Math.abs(newY - transformRef.current.y);
      transformRef.current.x = newX;
      transformRef.current.y = newY;
      return;
    }

    // Hover detection
    const worldX = (mouseX - canvas.width / 2 - transformRef.current.x) / transformRef.current.k;
    const worldY = (mouseY - canvas.height / 2 - transformRef.current.y) / transformRef.current.k;

    const found = simNodesRef.current.find((n) => {
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      return Math.sqrt(dx * dx + dy * dy) < 28;
    });
    setHoveredNode(found || null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      // If was just a click (not a major drag), select the node
      onSelectNode(draggedNodeRef.current);
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      draggedNodeRef.current = null;
      if (simulationRef.current) simulationRef.current.alphaTarget(0);
    } else if (isDraggingRef.current && dragDistanceRef.current < 6) {
      // Clean canvas click: check if clicked on node
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - canvas.width / 2 - transformRef.current.x) / transformRef.current.k;
        const worldY = (mouseY - canvas.height / 2 - transformRef.current.y) / transformRef.current.k;
        const clickedNode = simNodesRef.current.find((n) => {
          const dx = n.x - worldX;
          const dy = n.y - worldY;
          return Math.sqrt(dx * dx + dy * dy) < 28;
        });
        if (clickedNode) {
          onSelectNode(clickedNode);
        }
      }
    }

    isDraggingRef.current = false;
  };

  const resetView = () => {
    transformRef.current = { x: 0, y: 0, k: 1 };
    setZoomLevel(1);
  };

  const zoomIn = () => {
    const newK = Math.min(3, transformRef.current.k * 1.25);
    transformRef.current.k = newK;
    setZoomLevel(newK);
  };

  const zoomOut = () => {
    const newK = Math.max(0.2, transformRef.current.k * 0.8);
    transformRef.current.k = newK;
    setZoomLevel(newK);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#080B10] select-none">
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-2rem)]">
        {/* Color Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs">
          {(['layer', 'risk', 'heatmap'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setActiveColorMode(m)}
              className={`px-2.5 py-1.5 rounded-md capitalize transition-all ${
                activeColorMode === m
                  ? 'bg-slate-800 text-sky-400 font-semibold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'layer' ? 'Layers' : m === 'risk' ? 'Risk' : 'Activity'}
            </button>
          ))}
        </div>

        {/* Layer Filter */}
        <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs">
          {['all', 'api', 'service', 'database', 'frontend'].map((layer) => (
            <button
              key={layer}
              onClick={() => setSelectedLayer(layer)}
              className={`px-2 py-1 rounded capitalize text-[11px] transition-all ${
                selectedLayer === layer
                  ? 'bg-slate-800 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs text-slate-400 shadow-md">
        <button
          onClick={zoomIn}
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <span className="px-2 font-mono text-[10px] text-slate-400 font-semibold">
          {(zoomLevel * 100).toFixed(0)}%
        </span>
      </div>

      {/* Concise Legend */}
      <div className="absolute bottom-4 right-4 z-20 p-2 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 flex items-center gap-3 shadow-md">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> API / Service
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Database
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Test
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Risk / Impact
        </span>
      </div>

      {/* Hover Info Tooltip */}
      {hoveredNode && (
        <div
          className="absolute z-30 p-2.5 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 text-xs shadow-xl pointer-events-none"
          style={{
            left: 20,
            top: 70,
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-bold text-slate-100">{hoveredNode.name}</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                hoveredNode.risk.level === 'critical'
                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                  : hoveredNode.risk.level === 'high'
                  ? 'bg-rose-950 text-rose-300 border border-rose-900'
                  : hoveredNode.risk.level === 'medium'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}
            >
              {hoveredNode.risk.level}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mb-1">{hoveredNode.path}</p>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-800 font-mono">
            <span>Callers: {hoveredNode.metrics.incomingCount}</span>
            <span>Dependencies: {hoveredNode.metrics.outgoingCount}</span>
            <span>Blast Radius: {hoveredNode.metrics.downstreamCount}</span>
          </div>
        </div>
      )}

      {/* Interactive HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
