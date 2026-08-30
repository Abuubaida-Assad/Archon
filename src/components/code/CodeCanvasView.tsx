'use client';

import React, { useState, useMemo } from 'react';
import { ArchNode, ArchEdge } from '@/types';
import {
  Folder,
  FileCode2,
  Maximize2,
  Minimize2,
  Search,
  ArrowRight,
  Layers,
  Flame,
  ExternalLink,
} from 'lucide-react';

interface CodeCanvasViewProps {
  nodes: ArchNode[];
  edges: ArchEdge[];
  selectedNodeId: string | null;
  impactedNodeIds?: string[];
  onSelectNode: (node: ArchNode) => void;
  onOpenSource?: (filePath: string, line?: number) => void;
  onAnalyzeImpact?: (nodeId: string) => void;
}

export const CodeCanvasView: React.FC<CodeCanvasViewProps> = ({
  nodes,
  edges,
  selectedNodeId,
  impactedNodeIds = [],
  onSelectNode,
  onOpenSource,
  onAnalyzeImpact,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState<string>('all');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // Filter file and service nodes
  const fileNodes = useMemo(() => {
    return nodes.filter(
      (n) => n.type === 'file' || n.type === 'service' || n.type === 'api' || n.type === 'database' || n.type === 'test'
    );
  }, [nodes]);

  // Group file nodes by directory
  const directories = useMemo(() => {
    const dirMap = new Map<string, ArchNode[]>();
    fileNodes.forEach((node) => {
      const dir = node.directory || 'root';
      if (!dirMap.has(dir)) {
        dirMap.set(dir, []);
      }
      dirMap.get(dir)!.push(node);
    });
    return dirMap;
  }, [fileNodes]);

  const dirList = useMemo(() => Array.from(directories.keys()), [directories]);

  // Filtered nodes based on search & directory
  const filteredNodes = useMemo(() => {
    return fileNodes.filter((node) => {
      const matchesSearch =
        searchTerm === '' ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.fullContent && node.fullContent.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDir =
        selectedDirectory === 'all' || (node.directory || 'root') === selectedDirectory;

      return matchesSearch && matchesDir;
    });
  }, [fileNodes, searchTerm, selectedDirectory]);

  // Selected node details and connected files
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const connectedEdgeInfo = useMemo(() => {
    if (!selectedNodeId) return { importedFiles: [], importedByFiles: [] };

    const importedIds = edges
      .filter((e) => e.source === selectedNodeId && (e.type === 'IMPORTS' || e.type === 'WIKI_LINKS_TO' || e.type === 'DEPENDS_ON'))
      .map((e) => e.target);

    const importedByIds = edges
      .filter((e) => e.target === selectedNodeId && (e.type === 'IMPORTS' || e.type === 'WIKI_LINKS_TO' || e.type === 'DEPENDS_ON'))
      .map((e) => e.source);

    const importedFiles = nodes.filter((n) => importedIds.includes(n.id));
    const importedByFiles = nodes.filter((n) => importedByIds.includes(n.id));

    return { importedFiles, importedByFiles };
  }, [edges, nodes, selectedNodeId]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedNodeIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedNodeIds(next);
  };

  const expandAll = () => {
    setExpandedNodeIds(new Set(filteredNodes.map((n) => n.id)));
  };

  const collapseAll = () => {
    setExpandedNodeIds(new Set());
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#080B10] text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Toolbar */}
      <div className="h-14 px-4 border-b border-surface-border bg-surface/90 backdrop-blur-md flex items-center justify-between shrink-0 gap-3">
        {/* Directory Selector & Search */}
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search code files, paths, or symbol contents..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Folder className="w-3.5 h-3.5 text-sky-400" />
            <select
              value={selectedDirectory}
              onChange={(e) => setSelectedDirectory(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none font-mono cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Directories ({dirList.length})</option>
              {dirList.map((dir) => (
                <option key={dir} value={dir} className="bg-slate-900">
                  {dir} ({directories.get(dir)?.length || 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={expandAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors"
            title="Expand all code cards"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Expand All</span>
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono transition-colors"
            title="Collapse all code cards"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Collapse All</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />
          <span className="text-xs font-mono text-sky-400 font-semibold">
            {filteredNodes.length} Files
          </span>
        </div>
      </div>

      {/* Main Connected Canvas Grid */}
      <div className="flex-1 overflow-auto p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Selected Node Dependency Bar */}
        {selectedNode && (
          <div className="mb-6 p-4 rounded-xl bg-slate-900/90 border border-sky-500/40 shadow-xl backdrop-blur-md animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-950 border border-sky-800 text-sky-400">
                  <FileCode2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-sans flex items-center gap-2">
                    {selectedNode.name}
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 font-mono">
                      {selectedNode.layer}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedNode.path}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onAnalyzeImpact && (
                  <button
                    type="button"
                    onClick={() => onAnalyzeImpact(selectedNode.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-sm"
                  >
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>Blast Radius ({selectedNode.metrics.downstreamCount})</span>
                  </button>
                )}
                {onOpenSource && (
                  <button
                    type="button"
                    onClick={() => onOpenSource(selectedNode.path)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    <span>Full Editor</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Direct Connected Files */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-400 block mb-1.5 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-sky-400 rotate-180" />
                  Imports from ({connectedEdgeInfo.importedFiles.length} files):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {connectedEdgeInfo.importedFiles.length === 0 ? (
                    <span className="text-slate-500 text-[11px]">No local dependencies</span>
                  ) : (
                    connectedEdgeInfo.importedFiles.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelectNode(n)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-sky-950 hover:border-sky-700 border border-slate-700 text-slate-300 text-[11px] transition-colors"
                      >
                        {n.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1.5 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                  Imported by ({connectedEdgeInfo.importedByFiles.length} files):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {connectedEdgeInfo.importedByFiles.length === 0 ? (
                    <span className="text-slate-500 text-[11px]">No upstream dependents</span>
                  ) : (
                    connectedEdgeInfo.importedByFiles.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelectNode(n)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-950 hover:border-emerald-700 border border-slate-700 text-slate-300 text-[11px] transition-colors"
                      >
                        {n.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Directory-grouped Code Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredNodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            const isImpacted = impactedNodeIds.includes(node.id);
            const isExpanded = expandedNodeIds.has(node.id);
            const rawContent = node.fullContent || node.codeSnippet || '// No preview available';
            const lines = rawContent.split('\n');
            const previewLines = isExpanded ? lines : lines.slice(0, 14);

            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(node)}
                className={`flex flex-col rounded-xl bg-slate-900/90 border transition-all duration-200 shadow-md cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-sky-400 ring-2 ring-sky-500/30'
                    : isImpacted
                    ? 'border-rose-500/80 shadow-rose-950/40 shadow-xl'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Code Card Header */}
                <div className="px-3.5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <FileCode2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {node.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {node.loc || lines.length} LOC
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(node.id);
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Subtitle / Path Bar */}
                <div className="px-3.5 py-1 bg-slate-950/40 text-[10px] text-slate-400 font-mono flex items-center justify-between border-b border-slate-900">
                  <span className="truncate">{node.path}</span>
                  <span className="text-sky-400 font-semibold shrink-0 uppercase">{node.language}</span>
                </div>

                {/* Code Snippet Box */}
                <div className="p-3 bg-slate-950 text-[11px] font-mono leading-relaxed overflow-x-auto text-slate-300 select-text max-h-[360px]">
                  <pre className="m-0">
                    {previewLines.map((lineStr, idx) => (
                      <div key={idx} className="table-row">
                        <span className="table-cell pr-3 text-slate-600 select-none text-right w-6">
                          {idx + 1}
                        </span>
                        <span className="table-cell whitespace-pre font-mono">
                          {lineStr || ' '}
                        </span>
                      </div>
                    ))}
                  </pre>
                  {!isExpanded && lines.length > 14 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 text-center text-[10px] text-sky-400/80 font-mono">
                      + {lines.length - 14} more lines (Click card or expand icon)
                    </div>
                  )}
                </div>

                {/* Card Footer / Metrics */}
                <div className="px-3.5 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-400" />
                      <span>Blast: {node.metrics.downstreamCount}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-sky-400" />
                      <span>Deps: {node.metrics.incomingCount + node.metrics.outgoingCount}</span>
                    </span>
                  </div>

                  <span className="text-slate-400 capitalize px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {node.layer}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
