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
    <header className="h-12 border-b border-slate-800 bg-background px-4 flex items-center justify-between select-none z-30 sticky top-0">
      {/* Brand & Logo */}
      <div className="flex items-center gap-4">
        <div
          onClick={onNewAnalysis}
          className="flex items-center gap-2 cursor-pointer group"
          title="Archon Architecture Intelligence"
        >
          <div className="w-6 h-6 rounded bg-sky-500 text-slate-950 flex items-center justify-center font-bold font-sans text-xs">
            A
          </div>
          <span className="font-semibold text-sm text-slate-100 font-sans tracking-tight">
            Archon
          </span>
        </div>

        {/* Active Repo Badge & Health Grade */}
        {summary && (
          <div className="hidden md:flex items-center gap-2 ml-2 pl-3 border-l border-slate-800 text-xs">
            <div className="text-slate-300 font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              <span className="font-medium">{summary.repository.owner ? `${summary.repository.owner}/` : ''}{summary.repository.name}</span>
            </div>

            {summary.health && (
              <div
                onClick={() => onViewChange('health')}
                className="font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors flex items-center gap-1.5"
                title="View Codebase Health Score"
              >
                <span className="text-slate-400">Grade:</span>
                <span className="text-emerald-400 font-medium">{summary.health.grade}</span>
                <span className="text-[10px] text-slate-500">({summary.health.overallScore}/100)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center View Navigation Tabs - Clean, Minimalist Text Tabs */}
      {summary && (
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => onViewChange('discover')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'discover'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Discover
          </button>

          <button
            type="button"
            onClick={() => onViewChange('2d')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeView === '2d'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Graph Map
          </button>

          <button
            type="button"
            onClick={() => onViewChange('code')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'code'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Code Canvas
          </button>

          <button
            type="button"
            onClick={() => onViewChange('3d')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeView === '3d'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Spatial View
          </button>

          <button
            type="button"
            onClick={() => onViewChange('health')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'health'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Health & Security
          </button>

          <button
            type="button"
            onClick={() => onViewChange('overview')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'overview'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
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
                className="hidden sm:block px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors font-medium"
                title="Generate Architecture Outline Card"
              >
                Outline
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSearch}
              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors font-medium font-mono flex items-center gap-1.5"
              title="Search components or Ask AI (Cmd+K / Ctrl+K)"
            >
              <span>Search / AI</span>
              <kbd className="text-[10px] text-slate-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">⌘K</kbd>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

