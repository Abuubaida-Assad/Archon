'use client';

import React from 'react';
import { ImpactResult } from '@/types';
import {
  X,
  Zap,
  ShieldAlert,
  Layers,
  FileCode,
  CheckSquare,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Database,
  Globe,
  TestTube,
} from 'lucide-react';

interface ImpactDrawerProps {
  impact: ImpactResult | null;
  onClose: () => void;
  onSelectNodeById: (nodeId: string) => void;
  onOpenSource: (filePath: string, line?: number) => void;
}

export const ImpactDrawer: React.FC<ImpactDrawerProps> = ({
  impact,
  onClose,
  onSelectNodeById,
  onOpenSource,
}) => {
  if (!impact) return null;

  const target = impact.targetNode;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[580px] bg-surface-elevated/95 backdrop-blur-2xl border-l border-surface-border shadow-panel z-50 flex flex-col text-slate-200 animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-5 border-b border-surface-border bg-surface flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400 shrink-0 shadow-glow-rose">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                Change Impact Analysis
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                  impact.blastRadiusLevel === 'critical'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : impact.blastRadiusLevel === 'high'
                    ? 'bg-rose-950 text-rose-300 border border-rose-900'
                    : impact.blastRadiusLevel === 'medium'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}
              >
                {impact.blastRadiusLevel} Blast Radius ({impact.blastRadiusScore}/100)
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100 font-mono break-all">{target.name}</h2>
            <p className="text-xs text-slate-400 font-mono">{target.path}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Executive Summary */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-surface-border text-xs leading-relaxed font-mono text-slate-300">
          <p>{impact.summary}</p>
        </div>

        {/* Blast Radius Breakdown Grid */}
        <div>
          <h3 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Affected Systems Breakdown
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-surface border border-surface-border text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-mono mb-1">
                <Globe className="w-3.5 h-3.5 text-sky-400" /> APIs
              </div>
              <p className="text-base font-bold text-slate-100 font-mono">{impact.impactedApis.length}</p>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-surface-border text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-mono mb-1">
                <Database className="w-3.5 h-3.5 text-amber-400" /> Databases
              </div>
              <p className="text-base font-bold text-slate-100 font-mono">{impact.impactedDatabases.length}</p>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-surface-border text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-mono mb-1">
                <TestTube className="w-3.5 h-3.5 text-emerald-400" /> Tests
              </div>
              <p className="text-base font-bold text-slate-100 font-mono">{impact.impactedTests.length}</p>
            </div>
          </div>
        </div>

        {/* AI Architect Insight */}
        {impact.aiArchitectInsight && (
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 shadow-glow-cyan">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>AI Architect Reasoning</span>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed mb-3">
              {impact.aiArchitectInsight.blastRadiusExplanation}
            </p>

            {/* Potential Breakages */}
            {impact.aiArchitectInsight.potentialBreakages.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] font-mono text-rose-400 font-semibold mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Potential Breakage Points:
                </p>
                <ul className="text-xs text-slate-300 font-mono flex flex-col gap-1 pl-4 list-disc">
                  {impact.aiArchitectInsight.potentialBreakages.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inspection Checklist */}
            {impact.aiArchitectInsight.inspectionChecklist.length > 0 && (
              <div>
                <p className="text-[11px] font-mono text-cyan-300 font-semibold mb-1 flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5" /> Inspection Checklist:
                </p>
                <ul className="text-xs text-slate-300 font-mono flex flex-col gap-1 pl-4 list-disc">
                  {impact.aiArchitectInsight.inspectionChecklist.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Concrete Dependency Propagation Chains */}
        <div>
          <h3 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Explainable Dependency Paths
          </h3>

          <div className="flex flex-col gap-2">
            {impact.dependencyPaths.slice(0, 5).map((chain, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-surface border border-surface-border text-xs font-mono"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-slate-200">
                  {chain.nodes.map((node, nodeIdx) => (
                    <React.Fragment key={node.id}>
                      <span
                        onClick={() => onSelectNodeById(node.id)}
                        className={`px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-700 transition-colors ${
                          nodeIdx === 0
                            ? 'bg-rose-950 text-rose-300 font-bold'
                            : nodeIdx === chain.nodes.length - 1
                            ? 'bg-cyan-950 text-cyan-300 font-bold'
                            : 'bg-slate-900 text-slate-300'
                        }`}
                      >
                        {node.name}
                      </span>
                      {nodeIdx < chain.nodes.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 pl-1 border-l border-slate-800 leading-tight">
                  {chain.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Checklist */}
        <div>
          <h3 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Recommended Validation Plan
          </h3>

          <div className="flex flex-col gap-2">
            {impact.validationChecklist.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-surface border border-surface-border text-xs font-mono"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span> {item.title}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                    {item.priority} priority
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{item.description}</p>
                {item.targetPath && (
                  <button
                    onClick={() => onOpenSource(item.targetPath!)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline font-mono"
                  >
                    <FileCode className="w-3 h-3" /> Inspect {item.targetPath}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
