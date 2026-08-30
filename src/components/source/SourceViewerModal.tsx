'use client';

import React, { useEffect, useState } from 'react';
import { X, FileCode, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { ArchNode } from '@/types';

interface SourceViewerModalProps {
  repoId: string;
  filePath: string | null;
  targetLine?: number;
  nodes?: ArchNode[];
  onClose: () => void;
}

export const SourceViewerModal: React.FC<SourceViewerModalProps> = ({
  repoId,
  filePath,
  targetLine = 1,
  nodes = [],
  onClose,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!filePath || !repoId) return;

    // Check if node is in client memory first
    const matchingNode = nodes.find(
      (n) => n.path === filePath || n.id === filePath || n.name === filePath || n.path.endsWith(filePath)
    );

    setLoading(true);
    setError(null);

    fetch(`/api/repositories/${repoId}/source?path=${encodeURIComponent(filePath)}&line=${targetLine}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.content) {
          setContent(data.content);
        } else if (matchingNode && (matchingNode.fullContent || matchingNode.codeSnippet)) {
          setContent(matchingNode.fullContent || matchingNode.codeSnippet || '');
        } else {
          setError(data.error || 'Failed to load source code.');
        }
      })
      .catch((err) => {
        if (matchingNode && (matchingNode.fullContent || matchingNode.codeSnippet)) {
          setContent(matchingNode.fullContent || matchingNode.codeSnippet || '');
        } else {
          setError(err.message || 'Failed to fetch source code.');
        }
      })
      .finally(() => setLoading(false));
  }, [repoId, filePath, targetLine, nodes]);

  if (!filePath) return null;

  const lines = content.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[85vh] bg-surface-elevated border border-surface-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-surface-border bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-bold text-xs sm:text-sm font-mono text-slate-200 truncate">{filePath}</span>
            {targetLine > 1 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 shrink-0">
                Line {targetLine}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-xs text-slate-300">
          {loading ? (
            <div className="h-64 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span>Loading source code...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="table w-full">
              {lines.map((lineStr, idx) => {
                const lineNum = idx + 1;
                const isTarget = lineNum === targetLine;

                return (
                  <div
                    key={idx}
                    className={`table-row transition-colors ${
                      isTarget ? 'bg-sky-500/20 text-sky-200' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <span className="table-cell pr-4 text-slate-600 select-none text-right w-10 py-0.5 border-r border-slate-800/80 font-mono text-[11px]">
                      {lineNum}
                    </span>
                    <span className="table-cell pl-4 whitespace-pre font-mono py-0.5 select-text">
                      {lineStr || ' '}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
