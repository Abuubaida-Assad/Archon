'use client';

import React from 'react';
import { ArchitectureSummary, ArchNode } from '@/types';
import {
  Layers,
  Globe,
  Database,
  Code2,
  TestTube,
  Flame,
  Cpu,
  Zap,
} from 'lucide-react';

interface ArchitectureOverviewProps {
  summary: ArchitectureSummary;
  onSelectNode: (node: ArchNode) => void;
  onAnalyzeImpact: (nodeId: string) => void;
}

export const ArchitectureOverview: React.FC<ArchitectureOverviewProps> = ({
  summary,
  onSelectNode,
  onAnalyzeImpact,
}) => {
  const { stats, repository, layers, issues, nodes } = summary;

  // Sort top high-centrality nodes
  const topHubs = [...nodes]
    .filter((n) => n.type !== 'config' && n.type !== 'test')
    .sort((a, b) => (b.metrics.centrality || 0) - (a.metrics.centrality || 0))
    .slice(0, 6);

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#080B10] text-slate-200 select-none pb-28">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Repo Header Card with Glassmorphism */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-800/80 font-semibold tracking-wider">
                Repository Architecture Overview
              </span>
              <span className="text-xs text-slate-400 font-mono">Branch: {repository.branch}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 font-sans">{repository.owner} / {repository.name}</h1>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <p className="text-slate-400 text-[11px]">Total Files</p>
              <p className="text-base font-bold text-slate-100 font-mono">{repository.totalFiles}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Lines of Code</p>
              <p className="text-base font-bold text-slate-100 font-mono">{repository.totalLoc.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Dependencies</p>
              <p className="text-base font-bold text-sky-400 font-mono">{summary.edges.length}</p>
            </div>
          </div>
        </div>

        {/* High Level Stats Grid with Glassmorphism */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">Services</span>
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-100">{stats.servicesCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">APIs</span>
              <Globe className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-100">{stats.apisCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">Databases</span>
              <Database className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-100">{stats.databasesCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">Functions</span>
              <Code2 className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-100">{stats.functionsCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">Tests</span>
              <TestTube className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-slate-100">{stats.testsCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-md">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span className="font-medium">Issues</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-rose-400">{issues.length}</p>
          </div>
        </div>

        {/* Architectural Layers Breakdown with Glassmorphism */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>Architecture Layer Distribution</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(layers).map(([layerName, data]) => {
              if (data.nodeCount === 0) return null;
              return (
                <div key={layerName} className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 shadow-inner">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                    <span className="capitalize font-medium">{layerName}</span>
                    <span className="font-bold text-slate-100 font-mono">{data.nodeCount}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{ width: `${Math.min(100, (data.nodeCount / nodes.length) * 100 * 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Architectural Hubs Table with Glassmorphism */}
        <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Key Architectural Hubs (High Centrality)</span>
          </h3>

          <div className="flex flex-col gap-2.5">
            {topHubs.map((hub) => (
              <div
                key={hub.id}
                className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-850/80 border border-white/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div
                  onClick={() => onSelectNode(hub)}
                  className="cursor-pointer group flex-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-bold font-mono">
                      {hub.type}
                    </span>
                    <span className="font-semibold text-slate-100 group-hover:text-sky-400 transition-colors">
                      {hub.name}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400">{hub.path}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-mono">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-sans">Centrality</p>
                    <p className="font-bold text-slate-200">{(hub.metrics.centrality * 100).toFixed(0)}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-sans">Blast Radius</p>
                    <p className="font-bold text-rose-400">{hub.metrics.downstreamCount} deps</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAnalyzeImpact(hub.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-all shadow-sm font-sans text-xs"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Impact</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
