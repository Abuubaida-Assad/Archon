'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArchNode, NaturalLanguageQueryResult } from '@/types';
import {
  Search,
  X,
  Layers,
  Box,
  Sparkles,
  ArrowRight,
  Code2,
  Globe,
  Database,
  Loader2,
  FileCode,
  CornerDownLeft,
  Bot,
  Cpu,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ArchNode[];
  repoId?: string;
  onSelectNode: (node: ArchNode) => void;
  onSelectNodeById?: (nodeId: string) => void;
  onViewChange: (view: any) => void;
  onOpenSource?: (filePath: string, line?: number) => void;
}

const SAMPLE_QUESTIONS = [
  'How does data flow from API to Database?',
  'What are the highest risk components and blast radius?',
  'Where is authentication and request routing handled?',
  'Which services have circular dependencies?',
];

const AVAILABLE_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (OpenRouter / Free)' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Anthropic)' },
  { id: 'openai/gpt-4o', name: 'GPT-4o (OpenAI)' },
  { id: 'local/deterministic', name: 'Deterministic AST Engine (Local)' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  nodes,
  repoId,
  onSelectNode,
  onSelectNodeById,
  onViewChange,
  onOpenSource,
}) => {
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<NaturalLanguageQueryResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setIsAiMode(false);
      setAiResult(null);
      setAiError(null);
      setAiLoading(false);
    }
  }, [isOpen]);

  // Instant filter for code symbols
  const filteredNodes = useMemo(() => {
    if (!query.trim()) return nodes.slice(0, 10);
    const q = query.toLowerCase();
    return nodes
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.path.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q) ||
          n.layer.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [nodes, query]);

  // Handle Ask AI submit
  const handleAskAi = (questionText?: string) => {
    const targetQuery = questionText || query;
    if (!targetQuery.trim() || !repoId || aiLoading) return;

    setIsAiMode(true);
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    fetch(`/api/repositories/${repoId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: targetQuery.trim(), model: selectedModel }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.result) {
          setAiResult(data.result);
        } else {
          setAiError(data.error || 'Unable to generate architectural response.');
        }
      })
      .catch((err) => {
        setAiError(err.message || 'Network error connecting to AI engine.');
      })
      .finally(() => {
        setAiLoading(false);
      });
  };

  const handleKeyDownInInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If query looks like a question or user explicitly hit enter on an empty match, run AI
      if (
        query.trim().endsWith('?') ||
        filteredNodes.length === 0 ||
        query.toLowerCase().startsWith('how') ||
        query.toLowerCase().startsWith('what') ||
        query.toLowerCase().startsWith('why') ||
        query.toLowerCase().startsWith('where') ||
        query.toLowerCase().startsWith('explain')
      ) {
        handleAskAi();
      } else if (filteredNodes.length > 0) {
        onSelectNode(filteredNodes[0]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-start justify-center pt-16 p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans text-xs max-h-[85vh]">
        {/* Search & AI Input Bar */}
        <div className="p-3.5 border-b border-white/10 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (isAiMode && !e.target.value) {
                setIsAiMode(false);
                setAiResult(null);
              }
            }}
            onKeyDown={handleKeyDownInInput}
            placeholder="Search symbols, files, or ask any architectural question..."
            autoFocus
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
          />

          {query.trim() && !isAiMode && (
            <button
              type="button"
              onClick={() => handleAskAi()}
              className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-400 border border-sky-800 hover:bg-sky-900 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors shadow-sm"
            >
              <span>Ask AI</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Model Selector Bar */}
        <div className="px-3.5 py-2 border-b border-white/5 bg-slate-950/40 flex items-center justify-between gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Bot className="w-3.5 h-3.5 text-sky-400" />
            <span>Reasoning Model:</span>
          </div>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-900 text-sky-300 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-sky-500 cursor-pointer max-w-[280px] truncate"
          >
            {AVAILABLE_MODELS.map((m) => (
              <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* AI Answer Screen */}
        {isAiMode ? (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-slate-950/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Architecture Explanation</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAiMode(false);
                  setAiResult(null);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Back to search
              </button>
            </div>

            {aiLoading ? (
              <div className="h-44 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
                <span className="text-xs">Reasoning over repository graph using selected model...</span>
              </div>
            ) : aiError ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs">
                {aiError}
              </div>
            ) : aiResult ? (
              <div className="space-y-4">
                {/* Narrative Answer Card */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 text-slate-200 leading-relaxed text-xs shadow-md">
                  <p>{aiResult.answer}</p>
                </div>

                {/* Clickable Execution Flow Steps */}
                {aiResult.pathSteps && aiResult.pathSteps.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>Execution Flow Steps:</span>
                    </h4>

                    <div className="flex flex-col gap-2">
                      {aiResult.pathSteps.map((step, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (onSelectNodeById) onSelectNodeById(step.nodeId);
                            onClose();
                          }}
                          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 cursor-pointer transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-800 text-sky-400 flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-100 group-hover:text-sky-400 transition-colors">
                                {step.nodeName}
                              </p>
                              <p className="text-[11px] text-slate-400">{step.action}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence Files */}
                {aiResult.evidenceSnippets && aiResult.evidenceSnippets.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-sky-400" />
                      <span>Evidence Coordinates:</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {aiResult.evidenceSnippets.map((ev, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (onOpenSource) onOpenSource(ev.file, ev.line);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/5 hover:border-sky-500/40 text-[11px] font-mono text-slate-300 hover:text-sky-300 transition-colors"
                        >
                          {ev.file}:{ev.line}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          /* Normal Instant Search Mode */
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Ask AI Banner when user types */}
            {query.trim() && (
              <div
                onClick={() => handleAskAi()}
                className="p-3 bg-sky-950/40 hover:bg-sky-950/70 border-b border-sky-900/40 cursor-pointer flex items-center justify-between text-xs text-sky-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    Ask AI: <strong className="text-slate-100">&quot;{query}&quot;</strong>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                  Press Enter
                </span>
              </div>
            )}

            {/* Suggested Sample Questions when search is empty */}
            {!query.trim() && (
              <div className="p-4 border-b border-white/10 bg-slate-950/30">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Suggested Architectural Questions:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {SAMPLE_QUESTIONS.map((sq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuery(sq);
                        handleAskAi(sq);
                      }}
                      className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-white/5 text-slate-300 hover:text-sky-300 text-[11px] text-left transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{sq}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-sky-400 shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Instant Symbol Search Results */}
            <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
              <span className="px-2 py-1 text-[10px] uppercase font-mono text-slate-500 font-semibold">
                Components & Files ({filteredNodes.length})
              </span>

              {filteredNodes.length === 0 ? (
                <p className="p-4 text-center text-slate-500 italic">No matching code components found for &quot;{query}&quot;</p>
              ) : (
                filteredNodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => {
                      onSelectNode(node);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 cursor-pointer border border-transparent hover:border-sky-500/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {node.type === 'api' ? (
                        <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      ) : node.type === 'database' ? (
                        <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Code2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-100 font-semibold group-hover:text-sky-400 transition-colors">
                            {node.name}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 font-mono">
                            {node.type}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{node.path}</p>
                      </div>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-400 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
