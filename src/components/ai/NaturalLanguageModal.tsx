'use client';

import React, { useState } from 'react';
import { NaturalLanguageQueryResult } from '@/types';
import {
  X,
  Sparkles,
  Search,
  ArrowRight,
  Loader2,
  FileCode,
  Globe,
  Database,
  Code2,
} from 'lucide-react';

interface NaturalLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  onSelectNodeById: (nodeId: string) => void;
}

export const NaturalLanguageModal: React.FC<NaturalLanguageModalProps> = ({
  isOpen,
  onClose,
  repoId,
  onSelectNodeById,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NaturalLanguageQueryResult | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    fetch(`/api/repositories/${repoId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setResult(data.result);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const sampleQueries = [
    'What happens when a user places an order?',
    'How does payment processing interact with the database?',
    'Where are API endpoints registered and handled?',
    'Which components depend on inventory service?',
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-surface-elevated border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-surface-border bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-100 font-mono">Ask Architecture Explorer</span>
          </div>

          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="p-4 border-b border-surface-border bg-surface-elevated">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. What happens when a user places an order?"
              autoFocus
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-surface-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs font-mono"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-glow-cyan"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Ask</span>}
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sampleQueries.map((sq, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(sq);
                  setLoading(true);
                  fetch(`/api/repositories/${repoId}/ask`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: sq }),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.success) setResult(data.result);
                    })
                    .finally(() => setLoading(false));
                }}
                className="text-[10px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-slate-700 transition-all text-left"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>

        {/* Query Result Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-slate-950/50">
          {loading ? (
            <div className="h-48 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span>Tracing architectural execution paths...</span>
            </div>
          ) : result ? (
            <>
              {/* Narrative Answer */}
              <div className="p-4 rounded-xl bg-surface border border-surface-border text-slate-300 leading-relaxed text-xs">
                <p>{result.answer}</p>
              </div>

              {/* Clickable Step by Step Execution Flow */}
              {result.pathSteps.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider mb-2.5">
                    Architectural Execution Flow:
                  </h4>

                  <div className="flex flex-col gap-2">
                    {result.pathSteps.map((step, idx) => (
                      <div
                        key={step.nodeId}
                        onClick={() => {
                          onSelectNodeById(step.nodeId);
                          onClose();
                        }}
                        className="p-3 rounded-lg bg-surface hover:bg-slate-850 border border-surface-border hover:border-cyan-800/80 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-6 h-6 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-slate-100 font-bold group-hover:text-cyan-400 transition-colors">
                                {step.nodeName}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-900 text-slate-400">
                                {step.action}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{step.file}</p>
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="p-6 text-center text-slate-500 italic">
              Ask any question to trace execution and data flows across the codebase architecture.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
