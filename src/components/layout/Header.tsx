'use client';

import React from 'react';
import { ArchitectureSummary } from '@/types';

export type AppViewMode = 'discover' | '2d' | 'code' | '3d' | 'health' | 'overview' | 'issues';

interface HeaderProps {
  summary: ArchitectureSummary | null;
  activeView: AppViewMode;
  onViewChange: (view: AppViewMode) => void;
  onOpenSearch: () => void;
  onOpenAskAi: () => void;
  onOpenCardModal?: () => void;
  onNewAnalysis: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  summary,
  activeView,
  onViewChange,
  onOpenSearch,
  onOpenAskAi,
  onOpenCardModal,
  onNewAnalysis,
}) => {
  return (
    <header className="h-14 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl px-4 flex items-center justify-between select-none z-30 sticky top-0 shadow-lg">
      {/* Brand & Logo */}
      <div className="flex items-center gap-6">
        <div
          onClick={onNewAnalysis}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Archon Architecture Intelligence"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black font-sans shadow-md shadow-sky-500/25 text-sm group-hover:scale-105 transition-transform">
            A
          </div>
          <span className="font-bold tracking-tight text-lg text-slate-100 font-sans">
            Archon
          </span>
        </div>

        {/* Active Repo Badge & Health Grade */}
        {summary && (
          <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-white/10 text-xs">
            <div className="text-slate-300 font-mono px-2.5 py-1 rounded-lg bg-slate-900/60 backdrop-blur-md border border-white/10">
              <span className="font-semibold">{summary.repository.owner ? `${summary.repository.owner}/` : ''}{summary.repository.name}</span>
            </div>

            {summary.health && (
              <div
                onClick={() => onViewChange('health')}
                className="font-mono px-2.5 py-1 rounded-lg bg-slate-900/60 backdrop-blur-md border border-white/10 cursor-pointer hover:border-emerald-500/40 transition-colors flex items-center gap-1.5"
                title="View Codebase Health Score"
              >
                <span className="text-slate-400">Grade:</span>
                <span className="text-emerald-400 font-bold">{summary.health.grade}</span>
                <span className="text-[10px] text-slate-500">({summary.health.overallScore}/100)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center View Navigation Tabs - Clean, Text-Only, Glassmorphic */}
      {summary && (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-inner overflow-x-auto">
          <button
            type="button"
            onClick={() => onViewChange('discover')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'discover'
                ? 'bg-sky-950/90 text-sky-400 border border-sky-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Discover
          </button>

          <button
            type="button"
            onClick={() => onViewChange('2d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === '2d'
                ? 'bg-sky-950/90 text-sky-400 border border-sky-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Graph Map
          </button>

          <button
            type="button"
            onClick={() => onViewChange('code')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'code'
                ? 'bg-sky-950/90 text-sky-400 border border-sky-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Code Canvas
          </button>

          <button
            type="button"
            onClick={() => onViewChange('3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === '3d'
                ? 'bg-sky-950/90 text-sky-400 border border-sky-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Spatial View
          </button>

          <button
            type="button"
            onClick={() => onViewChange('health')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'health'
                ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Health & Security
          </button>

          <button
            type="button"
            onClick={() => onViewChange('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'overview'
                ? 'bg-sky-950/90 text-sky-400 border border-sky-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Overview
          </button>
        </div>
      )}

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2">
        {summary && (
          <>
            {onOpenCardModal && (
              <button
                type="button"
                onClick={onOpenCardModal}
                className="hidden sm:block px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 text-xs text-slate-300 hover:text-white transition-all font-medium backdrop-blur-md"
                title="Generate Architecture Outline Card"
              >
                Outline
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSearch}
              className="px-3 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900/90 border border-sky-800/80 text-xs text-sky-300 hover:text-white transition-all font-medium backdrop-blur-md font-mono flex items-center gap-1.5 shadow-sm"
              title="Search components or Ask AI (Cmd+K / Ctrl+K)"
            >
              <span>Search / Ask AI</span>
              <kbd className="text-[10px] text-sky-400 bg-sky-900/60 px-1 py-0.5 rounded border border-sky-800/60">⌘K</kbd>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
