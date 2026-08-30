'use client';

import React, { useState } from 'react';
import { ArchEdge, ArchNode } from '@/types';
import {
  Zap,
  FileCode,
  Shield,
  ArrowDownRight,
  ArrowUpRight,
  Code2,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ComponentInspectorProps {
  node: ArchNode | null;
  edges: ArchEdge[];
  allNodes: ArchNode[];
  onSelectNode: (node: ArchNode) => void;
  onAnalyzeImpact: (nodeId: string) => void;
  onOpenSource: (filePath: string, line?: number) => void;
}

export const ComponentInspector: React.FC<ComponentInspectorProps> = ({
  node,
  edges,
  allNodes,
  onSelectNode,
  onAnalyzeImpact,
  onOpenSource,
}) => {
  const [expandedEdgeId, setExpandedEdgeId] = useState<string | null>(null);

  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 select-none">
        <Layers className="w-10 h-10 mb-3 text-slate-600 stroke-[1.5]" />
        <p className="text-sm font-semibold text-slate-200 mb-1">No Component Selected</p>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Select any function, class, service, API endpoint, or database model to investigate its dependencies and change impact.
        </p>
      </div>
    );
  }

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  // Incoming (What depends on it) & Outgoing (What it depends on)
  const incomingEdges = edges.filter((e) => e.target === node.id);
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  return (
    <div className="h-full flex flex-col bg-surface overflow-y-auto border-l border-surface-border text-slate-200 select-none font-sans">
      {/* 1. WHAT DOES THIS COMPONENT DO? */}
      <div className="p-4 border-b border-surface-border bg-surface-elevated/40">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] uppercase px-2 py-0.5 rounded-md bg-sky-950 text-sky-400 border border-sky-800 font-semibold font-mono tracking-wider">
            {node.type}
          </span>
          <span className="text-[10px] uppercase px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 font-medium font-mono">
            {node.layer} layer
          </span>
          {node.inferred && (
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800 font-medium font-mono">
              Inferred
            </span>
          )}
        </div>

        <h2 className="text-base font-bold text-slate-100 break-all mb-1 font-sans">{node.name}</h2>
        <p className="text-xs text-slate-400 font-mono break-all flex items-center gap-1">
          <span className="truncate">{node.path}</span>
          {node.line && <span className="text-sky-400 font-semibold shrink-0">:{node.line}</span>}
        </p>
      </div>

      {/* 2. WHAT COULD BE AFFECTED IF IT CHANGES? (Hero Action) */}
      <div className="p-4 border-b border-surface-border flex flex-col gap-2 bg-slate-950/20">
        <button
          type="button"
          onClick={() => onAnalyzeImpact(node.id)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-sm group"
        >
          <Zap className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
          <span>Analyze Change Impact ({node.metrics.downstreamCount} deps)</span>
        </button>

        {node.path && (
          <button
            type="button"
            onClick={() => onOpenSource(node.path, node.line)}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-surface-border text-slate-300 hover:text-white font-medium text-xs transition-all"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Source Evidence</span>
          </button>
        )}
      </div>

      {/* Architectural Risk & Metrics */}
      <div className="p-4 border-b border-surface-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold uppercase tracking-wider font-mono">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>Risk Assessment</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono ${
              node.risk.level === 'critical'
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : node.risk.level === 'high'
                ? 'bg-rose-950 text-rose-300 border border-rose-900'
                : node.risk.level === 'medium'
                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
            }`}
          >
            {node.risk.level} ({node.risk.score}/100)
          </span>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-surface-border text-center">
            <p className="text-[10px] text-slate-400 font-medium">Centrality</p>
            <p className="text-xs font-bold text-slate-100 font-mono mt-0.5">{(node.metrics.centrality * 100).toFixed(0)}%</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-surface-border text-center">
            <p className="text-[10px] text-slate-400 font-medium">Blast Radius</p>
            <p className="text-xs font-bold text-rose-400 font-mono mt-0.5">{node.metrics.downstreamCount}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-surface-border text-center">
            <p className="text-[10px] text-slate-400 font-medium">Test Status</p>
            <p
              className={`text-xs font-bold font-mono mt-0.5 ${
                node.metrics.testCoverage === 'covered' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {node.metrics.testCoverage}
            </p>
          </div>
        </div>

        {/* Risk Reasons */}
        <div className="flex flex-col gap-1 text-xs text-slate-300">
          {node.risk.factors.map((factor, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className={factor.includes('Covered') ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {factor.includes('Covered') ? '✓' : '•'}
              </span>
              <span className="leading-snug">{factor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Snippet Box */}
      {node.codeSnippet && (
        <div className="p-4 border-b border-surface-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Code2 className="w-3.5 h-3.5 text-sky-400" /> Source Snippet
            </span>
            {node.line && <span className="text-[11px] font-mono text-slate-400">Line {node.line}</span>}
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-surface-border font-mono text-xs text-slate-300 overflow-x-auto max-h-36 leading-relaxed select-text">
            <pre>{node.codeSnippet}</pre>
          </div>
        </div>
      )}

      {/* 3. WHAT DEPENDS ON IT? (Incoming Callers & Consumers) */}
      <div className="p-4 border-b border-surface-border">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1 font-mono">
            <ArrowDownRight className="w-3.5 h-3.5 text-sky-400" /> What Depends on It ({incomingEdges.length})
          </span>
        </div>

        {incomingEdges.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No incoming dependents found</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {incomingEdges.map((edge) => {
              const srcNode = nodeMap.get(edge.source);
              if (!srcNode) return null;
              const isExpanded = expandedEdgeId === edge.id;

              return (
                <div
                  key={edge.id}
                  className="rounded-xl bg-slate-900/90 border border-surface-border overflow-hidden transition-all text-xs"
                >
                  <div
                    onClick={() => onSelectNode(srcNode)}
                    className="p-2.5 hover:bg-slate-850 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono font-semibold">
                        {edge.type}
                      </span>
                      <span className="text-slate-200 group-hover:text-sky-400 font-medium truncate">{srcNode.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {edge.evidence && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedEdgeId(isExpanded ? null : edge.id);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-300"
                          title="View relationship code evidence"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
                    </div>
                  </div>

                  {isExpanded && edge.evidence && (
                    <div className="p-2.5 bg-slate-950/70 border-t border-surface-border text-[11px] font-mono text-slate-400">
                      <p className="text-sky-400 font-semibold mb-1">
                        Evidence at {edge.evidence.file}:{edge.evidence.line}
                      </p>
                      {edge.evidence.snippet && (
                        <pre className="p-1.5 rounded bg-slate-950 border border-surface-border overflow-x-auto text-slate-300 text-[10px]">
                          {edge.evidence.snippet}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. WHAT DOES IT DEPEND ON? (Outgoing Dependencies) */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1 font-mono">
            <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" /> What It Depends on ({outgoingEdges.length})
          </span>
        </div>

        {outgoingEdges.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No outgoing dependencies</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {outgoingEdges.map((edge) => {
              const tgtNode = nodeMap.get(edge.target);
              if (!tgtNode) return null;
              const isExpanded = expandedEdgeId === edge.id;

              return (
                <div
                  key={edge.id}
                  className="rounded-xl bg-slate-900/90 border border-surface-border overflow-hidden transition-all text-xs"
                >
                  <div
                    onClick={() => onSelectNode(tgtNode)}
                    className="p-2.5 hover:bg-slate-850 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono font-semibold">
                        {edge.type}
                      </span>
                      <span className="text-slate-200 group-hover:text-sky-400 font-medium truncate">{tgtNode.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {edge.evidence && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedEdgeId(isExpanded ? null : edge.id);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-300"
                          title="View relationship code evidence"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
                    </div>
                  </div>

                  {isExpanded && edge.evidence && (
                    <div className="p-2.5 bg-slate-950/70 border-t border-surface-border text-[11px] font-mono text-slate-400">
                      <p className="text-sky-400 font-semibold mb-1">
                        Evidence at {edge.evidence.file}:{edge.evidence.line}
                      </p>
                      {edge.evidence.snippet && (
                        <pre className="p-1.5 rounded bg-slate-950 border border-surface-border overflow-x-auto text-slate-300 text-[10px]">
                          {edge.evidence.snippet}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
