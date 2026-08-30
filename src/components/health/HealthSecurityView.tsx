'use client';

import React, { useState } from 'react';
import {
  HealthScore,
  SecurityFinding,
  PatternFinding,
  ArchIssue,
  ArchNode,
} from '@/types';
import {
  ShieldAlert,
  ShieldCheck,
  Award,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Code2,
  Lock,
  Terminal,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface HealthSecurityViewProps {
  health: HealthScore;
  securityFindings: SecurityFinding[];
  patterns: PatternFinding[];
  issues: ArchIssue[];
  nodes: ArchNode[];
  onSelectNodeById: (nodeId: string) => void;
  onOpenSource?: (filePath: string, line?: number) => void;
}

export const HealthSecurityView: React.FC<HealthSecurityViewProps> = ({
  health,
  securityFindings = [],
  patterns = [],
  issues = [],
  nodes = [],
  onSelectNodeById,
  onOpenSource,
}) => {
  const [activeTab, setActiveTab] = useState<'health' | 'security' | 'patterns' | 'deadcode'>('health');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Grade color map
  const gradeColor = health.grade.startsWith('A')
    ? 'text-emerald-400 border-emerald-500 bg-emerald-950/40 shadow-emerald-500/20'
    : health.grade === 'B'
    ? 'text-cyan-400 border-cyan-500 bg-cyan-950/40 shadow-cyan-500/20'
    : health.grade === 'C'
    ? 'text-amber-400 border-amber-500 bg-amber-950/40 shadow-amber-500/20'
    : 'text-rose-400 border-rose-500 bg-rose-950/40 shadow-rose-500/20';

  const deadCodeNodes = nodes.filter((n) => n.metrics.isDeadCode);
  const designPatterns = patterns.filter((p) => p.category === 'design_pattern' || p.category === 'idiom');
  const antiPatterns = patterns.filter((p) => p.category === 'anti_pattern');

  const filteredSecFindings = securityFindings.filter((s) => {
    if (severityFilter === 'all') return true;
    return s.severity === severityFilter;
  });

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Banner with Grade & Sub-Scores */}
      <div className="p-6 bg-slate-900/70 border-b border-slate-800/80 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Main Grade Orb */}
          <div className="flex items-center gap-5">
            <div
              className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center shadow-xl ${gradeColor}`}
            >
              <span className="text-3xl font-black font-mono tracking-tight">{health.grade}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider mt-0.5">Health</span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-100 font-mono">
                  Codebase Health & Security Audit
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  Scale: {health.scaleGrade}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">{health.summary}</p>
            </div>
          </div>

          {/* Sub-Metrics Score Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto shrink-0 font-mono">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-[11px] text-slate-400">Maintainability</span>
              <span className="text-lg font-bold text-cyan-400 mt-0.5">{health.maintainability}%</span>
              <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${health.maintainability}%` }} />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-[11px] text-slate-400">Reliability</span>
              <span className="text-lg font-bold text-emerald-400 mt-0.5">{health.reliability}%</span>
              <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${health.reliability}%` }} />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-[11px] text-slate-400">Security Score</span>
              <span className="text-lg font-bold text-purple-400 mt-0.5">{health.security}%</span>
              <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-purple-400" style={{ width: `${health.security}%` }} />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-[11px] text-slate-400">Fragility Index</span>
              <span className="text-lg font-bold text-rose-400 mt-0.5">{health.fragility}%</span>
              <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-rose-400" style={{ width: `${health.fragility}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/60">
          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              activeTab === 'health'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Health & Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              activeTab === 'security'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Security Scanner ({securityFindings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('patterns')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              activeTab === 'patterns'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Patterns & Anti-Patterns ({patterns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deadcode')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              activeTab === 'deadcode'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Dead Code ({health.deadCodePercent}%)</span>
          </button>
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* TAB 1: Health & Diagnostics */}
          {activeTab === 'health' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-bold text-slate-200">Circular Dependencies</h3>
                  </div>
                  <div className="text-2xl font-bold text-slate-100 mb-1">{health.circularDependenciesCount}</div>
                  <p className="text-xs text-slate-400 font-sans">
                    {health.circularDependenciesCount === 0
                      ? 'No circular import cycles found. Clean acyclic hierarchy.'
                      : `${health.circularDependenciesCount} cycles detected causing tight coupling.`}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-slate-200">Coupling Hotspots</h3>
                  </div>
                  <div className="text-2xl font-bold text-slate-100 mb-1">{health.couplingHotspotsCount}</div>
                  <p className="text-xs text-slate-400 font-sans">
                    Components with excessive incoming/outgoing dependencies that represent high change risks.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-slate-200">Security Vulnerabilities</h3>
                  </div>
                  <div className="text-2xl font-bold text-slate-100 mb-1">{health.securityIssuesCount}</div>
                  <p className="text-xs text-slate-400 font-sans">
                    Hardcoded secrets, unsafe queries, or dynamic eval execution found in source code.
                  </p>
                </div>
              </div>

              {/* Dependency Cycles List */}
              {health.circularCycles && health.circularCycles.length > 0 && (
                <div className="p-5 rounded-xl bg-slate-900/80 border border-rose-900/50">
                  <h3 className="text-sm font-bold text-rose-300 font-mono mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Detected Circular Dependency Cycles
                  </h3>
                  <div className="space-y-2">
                    {health.circularCycles.map((cycle, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2 flex-wrap"
                      >
                        <span className="text-rose-400 font-bold">Cycle #{idx + 1}:</span>
                        {cycle.map((item, itemIdx) => (
                          <React.Fragment key={itemIdx}>
                            <button
                              onClick={() => onSelectNodeById(item)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-950 text-cyan-300 hover:border-cyan-700 border border-slate-700 transition-colors"
                            >
                              {item.replace(/^file:/, '').split('/').pop()}
                            </button>
                            {itemIdx < cycle.length - 1 && <span className="text-slate-500">→</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Security Scanner */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-mono text-slate-400">
                  Showing {filteredSecFindings.length} of {securityFindings.length} security alerts
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                        severityFilter === sev
                          ? 'bg-purple-600 text-white font-semibold'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {filteredSecFindings.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-200 font-mono">No Security Issues Found</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    No hardcoded secrets, SQL injection vectors, or dangerous eval expressions matched in active code.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSecFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono ${
                              finding.severity === 'critical'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : finding.severity === 'high'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-purple-950 text-purple-400 border border-purple-800'
                            }`}
                          >
                            {finding.severity}
                          </span>
                          <h4 className="text-sm font-bold text-slate-100 font-mono">{finding.title}</h4>
                        </div>

                        {finding.cwe && (
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {finding.cwe}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mb-3 leading-relaxed">{finding.description}</p>

                      {/* Code Snippet Box */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 mb-3 flex items-center justify-between">
                        <span className="text-rose-400 truncate">{finding.snippet}</span>
                        <button
                          onClick={() => onOpenSource?.(finding.file, finding.line)}
                          className="text-cyan-400 hover:underline shrink-0 flex items-center gap-1 text-[11px] ml-2"
                        >
                          <span>{finding.file}:{finding.line}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remediation Guide */}
                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 font-sans flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block font-mono text-[11px]">Remediation:</strong>
                          <span>{finding.remediation}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Patterns & Anti-Patterns */}
          {activeTab === 'patterns' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Design Patterns */}
              <div>
                <h3 className="text-sm font-bold text-slate-200 font-mono mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Identified Design Patterns & Idioms ({designPatterns.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {designPatterns.map((pat) => (
                    <div
                      key={pat.id}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-800/60 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-emerald-400 font-mono">{pat.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">{pat.type}</span>
                      </div>
                      <p className="text-xs text-slate-300 mb-2 leading-relaxed">{pat.description}</p>
                      <button
                        onClick={() => onOpenSource?.(pat.file, pat.line)}
                        className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>{pat.file}:{pat.line}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anti-Patterns */}
              <div>
                <h3 className="text-sm font-bold text-slate-200 font-mono mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Anti-Patterns & Architectural Smells ({antiPatterns.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {antiPatterns.map((pat) => (
                    <div
                      key={pat.id}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-900/50 hover:border-amber-700/80 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-amber-300 font-mono">{pat.name}</span>
                        <span className="text-[10px] text-rose-400 font-mono uppercase">Refactor Target</span>
                      </div>
                      <p className="text-xs text-slate-300 mb-2 leading-relaxed">{pat.description}</p>
                      <button
                        onClick={() => onOpenSource?.(pat.file, pat.line)}
                        className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>{pat.file}:{pat.line}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Dead Code */}
          {activeTab === 'deadcode' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 font-mono">Unused & Dead Components</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Found {deadCodeNodes.length} component files with zero incoming references or dependency calls.
                  </p>
                </div>
                <span className="text-xl font-bold font-mono text-amber-400">{health.deadCodePercent}% Dead</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {deadCodeNodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-200 font-mono truncate">{node.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {node.loc || 0} LOC
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate mb-3">{node.path}</p>
                    </div>

                    <button
                      onClick={() => onOpenSource?.(node.path)}
                      className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Inspect Code</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
