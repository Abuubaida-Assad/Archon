'use client';

import React from 'react';
import { ArchIssue, ArchNode } from '@/types';
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Flame,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface IssuesListProps {
  issues: ArchIssue[];
  nodes: ArchNode[];
  onSelectNodeById: (nodeId: string) => void;
}

export const IssuesList: React.FC<IssuesListProps> = ({
  issues,
  nodes,
  onSelectNodeById,
}) => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (issues.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono bg-background">
        <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-500 stroke-[1.5]" />
        <p className="text-base font-bold text-slate-300 mb-1">Architecture Clean</p>
        <p className="text-xs max-w-sm leading-relaxed">
          No circular dependencies, high-coupling hotspots, or critical untested bottlenecks detected.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-background text-slate-200 select-none">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>Architectural Issues & Hotspots</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Deterministic issue detection based on graph cycle algorithms, coupling metrics, and test coverage signals.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold">
            {issues.length} Issues Found
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {issues.map((issue) => {
            const isCritical = issue.severity === 'critical';
            return (
              <div
                key={issue.id}
                className={`p-5 rounded-xl border transition-all ${
                  isCritical
                    ? 'bg-surface-elevated/90 border-rose-800/80 shadow-glow-rose'
                    : 'bg-surface border-surface-border'
                }`}
              >
                {/* Issue Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {issue.type === 'circular_dependency' ? (
                      <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : issue.type === 'high_coupling_hotspot' ? (
                      <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    <h3 className="text-sm font-bold text-slate-100 font-mono">{issue.title}</h3>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                      isCritical
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {issue.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-mono leading-relaxed mb-3">
                  {issue.description}
                </p>

                {/* Interactive Cycle Path if applicable */}
                {issue.cyclePath && (
                  <div className="mb-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                    <p className="text-[10px] text-slate-500 mb-1.5 uppercase font-bold">Cycle Chain:</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {issue.cyclePath.map((nodeId, idx) => {
                        const n = nodeMap.get(nodeId);
                        return (
                          <React.Fragment key={idx}>
                            <span
                              onClick={() => onSelectNodeById(nodeId)}
                              className="px-2 py-1 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 cursor-pointer hover:bg-rose-900 transition-colors font-bold"
                            >
                              {n?.name || nodeId}
                            </span>
                            {idx < issue.cyclePath!.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Evidence & Remediation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Evidence:</span>
                    <p className="text-slate-400">{issue.evidence}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-cyan-400 uppercase font-bold block mb-0.5">Remediation:</span>
                    <p className="text-slate-300">{issue.remediation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
