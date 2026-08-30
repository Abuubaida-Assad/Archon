'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArchNode, ArchitectureSummary, ArchitectureLayer } from '@/types';
import {
  FileCode,
  Zap,
  ExternalLink,
  Code2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

interface DiscoverViewProps {
  summary: ArchitectureSummary;
  selectedNode: ArchNode | null;
  onSelectNode: (node: ArchNode) => void;
  onAnalyzeImpact: (nodeId: string) => void;
  onOpenSource: (filePath: string, line?: number) => void;
}

interface MindMapNode {
  id: string;
  label: string;
  type: 'root' | 'category' | 'folder' | 'file' | 'symbol';
  layer?: ArchitectureLayer;
  archNode?: ArchNode;
  filePath?: string;
  line?: number;
  children?: MindMapNode[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

const CATEGORY_DEFINITIONS: Array<{
  id: string;
  name: string;
  layer: ArchitectureLayer;
  filter: (n: ArchNode) => boolean;
}> = [
  {
    id: 'api',
    name: 'API Routes & Endpoints',
    layer: 'api',
    filter: (n) => n.type === 'api' || n.layer === 'api' || n.layer === 'gateway',
  },
  {
    id: 'service',
    name: 'Business Logic & Services',
    layer: 'service',
    filter: (n) =>
      (n.type === 'service' || n.type === 'function' || n.type === 'class' || n.layer === 'service' || n.layer === 'domain') &&
      n.type !== 'api' &&
      n.type !== 'database' &&
      n.layer !== 'test',
  },
  {
    id: 'database',
    name: 'Database & Persistence',
    layer: 'database',
    filter: (n) => n.type === 'database' || n.layer === 'database' || n.path.includes('model') || n.path.includes('schema'),
  },
  {
    id: 'frontend',
    name: 'Frontend & UI Components',
    layer: 'frontend',
    filter: (n) => n.layer === 'frontend' || n.path.includes('components') || n.path.includes('pages') || n.path.includes('app/'),
  },
  {
    id: 'util',
    name: 'Shared Utilities & Config',
    layer: 'util',
    filter: (n) => n.layer === 'util' || n.type === 'config' || n.path.includes('util') || n.path.includes('lib/'),
  },
  {
    id: 'test',
    name: 'Test Suites & Verification',
    layer: 'test',
    filter: (n) => n.layer === 'test' || n.type === 'test' || n.path.includes('test') || n.path.includes('spec'),
  },
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  summary,
  selectedNode,
  onSelectNode,
  onAnalyzeImpact,
  onOpenSource,
}) => {
  const { nodes, repository } = summary;

  // Track expanded node IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>(['root', 'cat-api', 'cat-service', 'cat-database']);
    return initial;
  });

  const [activeReadingNode, setActiveReadingNode] = useState<ArchNode | null>(selectedNode || nodes[0] || null);
  const [readerOpen, setReaderOpen] = useState<boolean>(true);

  // Pan & Zoom state
  const [transform, setTransform] = useState<{ x: number; y: number; k: number }>({ x: 80, y: 300, k: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Build the complete hierarchical Mind Map Tree
  const rootTree = useMemo<MindMapNode>(() => {
    const categoryChildren: MindMapNode[] = [];

    CATEGORY_DEFINITIONS.forEach((catDef) => {
      const matchedNodes = nodes.filter(catDef.filter);
      if (matchedNodes.length === 0) return;

      // Group nodes by file
      const fileMap = new Map<string, ArchNode[]>();
      matchedNodes.forEach((n) => {
        const key = n.path || 'shared';
        const list = fileMap.get(key) || [];
        list.push(n);
        fileMap.set(key, list);
      });

      const fileChildren: MindMapNode[] = [];
      fileMap.forEach((fNodes, fPath) => {
        const fileName = fPath.split('/').pop() || fPath;

        const symbolChildren: MindMapNode[] = fNodes.slice(0, 10).map((sNode) => ({
          id: `sym-${sNode.id}`,
          label: sNode.name,
          type: 'symbol',
          layer: sNode.layer,
          archNode: sNode,
          filePath: sNode.path,
          line: sNode.line,
        }));

        fileChildren.push({
          id: `file-${catDef.id}-${fPath}`,
          label: fileName,
          type: 'file',
          filePath: fPath,
          line: fNodes[0]?.line,
          archNode: fNodes[0],
          children: symbolChildren.length > 0 ? symbolChildren : undefined,
        });
      });

      categoryChildren.push({
        id: `cat-${catDef.id}`,
        label: catDef.name,
        type: 'category',
        layer: catDef.layer,
        children: fileChildren,
      });
    });

    return {
      id: 'root',
      label: repository.name || 'Codebase Root',
      type: 'root',
      children: categoryChildren,
    };
  }, [nodes, repository]);

  // Layout calculation: Traverse tree and assign (x, y) coordinates
  const { layoutNodes, layoutLinks } = useMemo(() => {
    const positionedNodes: MindMapNode[] = [];
    const links: Array<{ source: MindMapNode; target: MindMapNode }> = [];

    const nodeHeight = 36;
    const nodeGapY = 16;
    const levelSpacingX = 240;

    // Helper: calculate subtree height considering expanded state
    const computeSubtreeHeight = (node: MindMapNode): number => {
      const isExpanded = expandedIds.has(node.id);
      if (!isExpanded || !node.children || node.children.length === 0) {
        return nodeHeight;
      }
      let totalH = 0;
      node.children.forEach((child) => {
        totalH += computeSubtreeHeight(child) + nodeGapY;
      });
      return Math.max(nodeHeight, totalH - nodeGapY);
    };

    // Recursive layout assignment
    const assignPositions = (node: MindMapNode, startX: number, startY: number): number => {
      const isExpanded = expandedIds.has(node.id);
      const subtreeH = computeSubtreeHeight(node);
      const currentY = startY + subtreeH / 2;

      node.x = startX;
      node.y = currentY;
      positionedNodes.push(node);

      if (isExpanded && node.children && node.children.length > 0) {
        let childStartY = startY;
        node.children.forEach((child) => {
          const childH = computeSubtreeHeight(child);
          assignPositions(child, startX + levelSpacingX, childStartY);
          links.push({ source: node, target: child });
          childStartY += childH + nodeGapY;
        });
      }

      return subtreeH;
    };

    assignPositions(rootTree, 40, 0);

    return { layoutNodes: positionedNodes, layoutLinks: links };
  }, [rootTree, expandedIds]);

  const toggleExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleNodeClick = (node: MindMapNode) => {
    if (node.archNode) {
      setActiveReadingNode(node.archNode);
      onSelectNode(node.archNode);
      setReaderOpen(true);
    } else if (node.children && node.children.length > 0) {
      // Toggle category expansion if clicked
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
  };

  // Mouse pan & zoom handlers with cursor-centered zooming and drag threshold
  const dragDistanceRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = Math.abs(e.clientX - (dragStartRef.current.x + transform.x));
    const dy = Math.abs(e.clientY - (dragStartRef.current.y + transform.y));
    dragDistanceRef.current += dx + dy;

    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newK = Math.min(3, Math.max(0.25, transform.k * zoomFactor));

    // Cursor-centered zoom
    const newX = mouseX - (mouseX - transform.x) * (newK / transform.k);
    const newY = mouseY - (mouseY - transform.y) * (newK / transform.k);

    setTransform({ x: newX, y: newY, k: newK });
  };

  const resetView = () => {
    setTransform({ x: 80, y: 300, k: 1 });
  };

  const zoomIn = () => {
    const container = containerRef.current;
    const centerX = container ? container.clientWidth / 2 : 400;
    const centerY = container ? container.clientHeight / 2 : 300;
    const newK = Math.min(3, transform.k * 1.25);
    const newX = centerX - (centerX - transform.x) * (newK / transform.k);
    const newY = centerY - (centerY - transform.y) * (newK / transform.k);
    setTransform({ x: newX, y: newY, k: newK });
  };

  const zoomOut = () => {
    const container = containerRef.current;
    const centerX = container ? container.clientWidth / 2 : 400;
    const centerY = container ? container.clientHeight / 2 : 300;
    const newK = Math.max(0.25, transform.k * 0.8);
    const newX = centerX - (centerX - transform.x) * (newK / transform.k);
    const newY = centerY - (centerY - transform.y) * (newK / transform.k);
    setTransform({ x: newX, y: newY, k: newK });
  };

  return (
    <div className="w-full h-full flex bg-[#080B10] text-slate-200 overflow-hidden select-none relative">
      {/* Mind Map Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="flex-1 h-full relative overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {/* Floating View Controls */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs shadow-md">
          <button
            type="button"
            onClick={zoomIn}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetView}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono text-[10px] text-slate-400 font-semibold">
            {(transform.k * 100).toFixed(0)}%
          </span>
        </div>

        {/* SVG Bezier Connectors & Mind Map Tree */}
        <div
          className="absolute inset-0 origin-top-left transition-transform duration-75"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          }}
        >
          {/* SVG Links Layer */}
          <svg className="absolute inset-0 overflow-visible pointer-events-none" style={{ width: 1, height: 1 }}>
            {layoutLinks.map((link, idx) => {
              const x1 = (link.source.x || 0) + (link.source.width || 140);
              const y1 = (link.source.y || 0) + 18;
              const x2 = link.target.x || 0;
              const y2 = (link.target.y || 0) + 18;
              const dx = (x2 - x1) * 0.55;

              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              return (
                <path
                  key={`link-${idx}`}
                  d={pathD}
                  fill="none"
                  stroke="rgba(129, 140, 248, 0.4)"
                  strokeWidth="1.75"
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Node Cards Layer */}
          {layoutNodes.map((node) => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedIds.has(node.id);
            const isSelected = activeReadingNode?.id === node.archNode?.id;

            return (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className={`absolute flex items-center group transition-all duration-200 ${
                  node.type === 'root'
                    ? 'z-20'
                    : node.type === 'category'
                    ? 'z-10'
                    : 'z-0'
                }`}
                style={{
                  left: node.x || 0,
                  top: node.y || 0,
                }}
              >
                {/* Main Node Card */}
                <div
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer border ${
                    node.type === 'root'
                      ? 'bg-slate-900 border-sky-500/80 text-white font-bold ring-2 ring-sky-500/20'
                      : node.type === 'category'
                      ? 'bg-slate-900/95 border-slate-800 text-slate-100 hover:border-indigo-500/60 font-semibold hover:bg-slate-850'
                      : isSelected
                      ? 'bg-sky-950 border-sky-500 text-sky-100 font-semibold ring-2 ring-sky-500/20'
                      : 'bg-slate-950/90 border-slate-850 text-slate-300 hover:border-slate-700 hover:bg-slate-900 font-medium'
                  }`}
                >
                  <span className="truncate max-w-[200px]">{node.label}</span>
                </div>

                {/* Expansion Indicator Circle (NotebookLM style < / >) */}
                {hasChildren && (
                  <button
                    type="button"
                    onClick={(e) => toggleExpand(node.id, e)}
                    className="ml-1.5 w-5 h-5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-400 text-slate-400 hover:text-sky-300 flex items-center justify-center text-[10px] font-mono transition-all shadow-sm shrink-0"
                    title={isExpanded ? 'Collapse branch' : 'Expand branch'}
                  >
                    {isExpanded ? (
                      <ChevronLeft className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Drawer: Code Reader & Architecture Inspector */}
      {readerOpen && activeReadingNode && (
        <div className="w-full sm:w-96 md:w-[440px] h-full shrink-0 border-l border-slate-800 bg-slate-900/95 backdrop-blur-xl flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-slate-200">Source Inspector</span>
            </div>
            <button
              type="button"
              onClick={() => setReaderOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Identity Card */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-semibold">
                  {activeReadingNode.type}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {activeReadingNode.layer} layer
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 font-sans break-all">{activeReadingNode.name}</h2>
              <p className="text-xs font-mono text-slate-400 break-all flex items-center gap-1">
                <span>{activeReadingNode.path}</span>
                {activeReadingNode.line && <span className="text-sky-400 font-semibold">:{activeReadingNode.line}</span>}
              </p>
            </div>

            {/* Hero Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onAnalyzeImpact(activeReadingNode.id)}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Analyze Blast Radius</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenSource(activeReadingNode.path, activeReadingNode.line)}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
              >
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Full Source</span>
              </button>
            </div>

            {/* Architecture Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-medium">Inbound Callers</p>
                <p className="text-xs font-bold text-slate-100 font-mono mt-0.5">
                  {activeReadingNode.metrics.incomingCount}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-medium">Outbound Deps</p>
                <p className="text-xs font-bold text-slate-100 font-mono mt-0.5">
                  {activeReadingNode.metrics.outgoingCount}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-medium">Blast Radius</p>
                <p className="text-xs font-bold text-rose-400 font-mono mt-0.5">
                  {activeReadingNode.metrics.downstreamCount}
                </p>
              </div>
            </div>

            {/* Source Code Viewer */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Source Implementation</span>
                {activeReadingNode.line && (
                  <span className="text-[10px] font-mono text-slate-400">Line {activeReadingNode.line}</span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed max-h-72">
                {activeReadingNode.codeSnippet ? (
                  <pre>{activeReadingNode.codeSnippet}</pre>
                ) : (
                  <p className="text-slate-500 italic text-xs">
                    Declared in {activeReadingNode.path}. Click &quot;Full Source&quot; to view complete file.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
