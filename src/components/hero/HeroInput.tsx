'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowRight,
  GitBranch,
  Settings2,
  Sparkles,
  Zap,
  Layers,
  ShieldCheck,
  FolderGit2,
  FolderOpen,
  Key,
  GitPullRequest,
  Loader2,
  AlertCircle,
  FileCode2,
  Flame,
  CheckCircle2,
  Cpu,
  Globe2,
} from 'lucide-react';
import { SampleRepoInfo, getSampleRepositories } from '@/lib/sample-repos';

interface HeroInputProps {
  onAnalyze: (url: string, branch?: string, token?: string, localFiles?: any[]) => Promise<void>;
  isLoading: boolean;
  currentStage: string;
  progressPercent: number;
  stageDetail?: string;
  errorMessage?: string;
}

export const HeroInput: React.FC<HeroInputProps> = ({
  onAnalyze,
  isLoading,
  currentStage,
  progressPercent,
  stageDetail,
  errorMessage,
}) => {
  const [inputMode, setInputMode] = useState<'url' | 'folder' | 'pr'>('url');
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState<string>('');
  const [prUrl, setPrUrl] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [samples, setSamples] = useState<SampleRepoInfo[]>(getSampleRepositories());

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('archon_github_token');
      if (savedToken) setToken(savedToken);
    } catch {}

    fetch('/api/samples')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.success && Array.isArray(data.samples) && data.samples.length > 0) {
          setSamples(data.samples);
        }
      })
      .catch((err) => console.warn('Failed to load sample repos from API, using built-ins:', err));
  }, []);

  const handleSaveToken = (val: string) => {
    setToken(val);
    try {
      if (val.trim()) {
        localStorage.setItem('archon_github_token', val.trim());
      } else {
        localStorage.removeItem('archon_github_token');
      }
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (inputMode === 'url' && url.trim()) {
      onAnalyze(url.trim(), branch.trim() || undefined, token.trim() || undefined);
    } else if (inputMode === 'pr' && prUrl.trim()) {
      onAnalyze(prUrl.trim(), undefined, token.trim() || undefined);
    }
  };

  const handleSelectSample = (sample: SampleRepoInfo) => {
    setUrl(sample.name);
    onAnalyze(sample.url, undefined, token.trim() || undefined);
  };

  // Browser Native Directory Picker (Web File System Access API)
  const handleOpenFolderPicker = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: Array<{ relativePath: string; content: string; name: string }> = [];

        async function readDir(handle: any, currentPath: string = '') {
          for await (const entry of handle.values()) {
            const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

            // Skip heavy / generated folders
            if (
              entry.name === 'node_modules' ||
              entry.name === '.git' ||
              entry.name === '.next' ||
              entry.name === 'dist' ||
              entry.name === 'build' ||
              entry.name === '.cache' ||
              entry.name === '__pycache__'
            ) {
              continue;
            }

            if (entry.kind === 'file') {
              const ext = entry.name.split('.').pop()?.toLowerCase();
              if (
                ['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'md', 'mdx', 'sql', 'yaml', 'yml', 'go', 'java', 'html', 'css'].includes(
                  ext || ''
                )
              ) {
                const file = await entry.getFile();
                if (file.size < 1024 * 1024) {
                  const content = await file.text();
                  files.push({ relativePath: relPath, content, name: entry.name });
                }
              }
            } else if (entry.kind === 'directory') {
              await readDir(entry, relPath);
            }
          }
        }

        await readDir(dirHandle);

        if (files.length > 0) {
          onAnalyze(dirHandle.name, undefined, undefined, files);
        }
      } else if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Folder selection error:', err);
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files: Array<{ relativePath: string; content: string; name: string }> = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const relPath = (file as any).webkitRelativePath || file.name;

      if (
        relPath.includes('node_modules/') ||
        relPath.includes('.git/') ||
        relPath.includes('.next/') ||
        relPath.includes('dist/') ||
        relPath.includes('build/')
      ) {
        continue;
      }

      if (file.size < 1024 * 1024) {
        const text = await file.text();
        files.push({ relativePath: relPath, content: text, name: file.name });
      }
    }

    if (files.length > 0) {
      onAnalyze('Local Folder', undefined, undefined, files);
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-between items-center px-4 py-4 sm:py-6 overflow-y-auto lg:overflow-hidden relative bg-background">
      {/* Hidden File Input for fallback directory selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
        className="hidden"
      />

      {/* High-Tech Background Subtle Ambient Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b14_1px,transparent_1px),linear-gradient(to_bottom,#1e293b14_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[320px] bg-sky-500/10 blur-[140px] rounded-3xl pointer-events-none" />

      {/* Main Centered Content Container */}
      <div className="w-full max-w-3xl flex flex-col items-center z-10 my-auto py-2">
        {/* Subtle Eyebrow / Kicker */}
        <div className="flex items-center justify-center text-[11px] sm:text-xs font-semibold tracking-widest text-slate-400 uppercase mb-3">
          <span>CODEBASE ARCHITECTURE INTELLIGENCE</span>
        </div>

        {/* Main Headline (Referencing image design) */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-black text-slate-100 text-center tracking-tight leading-[1.1] max-w-2xl mb-3 font-sans">
          Every module.<br />
          Every dependency.<br />
          <span className="text-sky-400 italic font-serif font-normal">Verified.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-400 text-center max-w-lg mb-5 leading-relaxed font-sans">
          Archon gives engineering teams complete visibility and uses graph intelligence to map dependencies, simulate blast radius, and detect architectural drift.
        </p>

        {/* Hero Quick CTA Buttons */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement | null;
              input?.focus();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-sm"
          >
            <span>Analyze repository</span>
            <span>→</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (samples.length > 0) {
                handleSelectSample(samples[0]);
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs sm:text-sm border border-slate-800 transition-all"
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>Explore sample repository (expressjs/express)</span>
          </button>
        </div>

        {/* Mode Switcher Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800 mb-3 text-xs shadow-md backdrop-blur-md">
          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all text-xs font-medium ${
              inputMode === 'url'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
            <span>GitHub Repository</span>
          </button>

          <button
            type="button"
            onClick={handleOpenFolderPicker}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all text-xs font-medium"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Local Folder</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('pr')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all text-xs font-medium ${
              inputMode === 'pr'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5 text-sky-400" />
            <span>PR Blast Radius</span>
          </button>
        </div>

        {/* Main Input Box */}
        <div className="w-full max-w-2xl relative">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 shadow-xl focus-within:border-sky-500/70 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all">
              <div className="flex items-center gap-3 px-3 py-1.5 w-full">
                {inputMode === 'pr' ? (
                  <GitPullRequest className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <Globe2 className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <input
                  type="text"
                  value={inputMode === 'pr' ? prUrl : url}
                  onChange={(e) => (inputMode === 'pr' ? setPrUrl(e.target.value) : setUrl(e.target.value))}
                  placeholder={
                    inputMode === 'pr'
                      ? 'github.com/owner/repo/pull/123'
                      : 'Enter GitHub URL or owner/repo (e.g. expressjs/express)'
                  }
                  disabled={isLoading}
                  autoFocus
                  className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none font-sans"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(true)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                    token
                      ? 'bg-sky-950 border-sky-800 text-sky-400'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                  title="GitHub Personal Access Token (for private repos & higher limits)"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                    showAdvanced
                      ? 'bg-slate-700 border-slate-600 text-slate-200'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Advanced Branch & Scope Settings"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="submit"
                  disabled={(!url.trim() && !prUrl.trim()) || isLoading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Configuration Panel */}
            {showAdvanced && (
              <div className="mt-2 p-3 rounded-xl bg-slate-900/95 border border-slate-800 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in-50 duration-200">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Target Branch (optional)</label>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                    <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main, master, develop..."
                      className="bg-transparent w-full text-slate-200 text-xs focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Analysis Depth</label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px]">
                      Full AST + Health + Security + Impact
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* GitHub PAT Token Modal */}
          {showTokenModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-950 border border-sky-800 text-sky-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">GitHub Personal Access Token</h3>
                    <p className="text-xs text-slate-400">Used for private repositories & higher API rate limits</p>
                  </div>
                </div>

                <div>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => handleSaveToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Your token stays 100% in your browser memory and is never logged or persisted.
                  </p>
                </div>

                <div className="flex justify-end gap-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-bold hover:bg-sky-400 transition-all"
                  >
                    Save Token
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div className="mt-3 p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Analysis Failed</p>
                <p className="text-rose-400">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Real-Time Live Analysis Progress Visualizer */}
          {isLoading && (
            <div className="mt-3 p-4 rounded-xl bg-slate-900/95 border border-slate-800 shadow-xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                  <span className="text-xs font-medium text-slate-200">{currentStage || 'Processing...'}</span>
                </div>
                <span className="text-xs text-sky-400 font-semibold">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-950 rounded-md overflow-hidden mb-2 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>

              {stageDetail && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-sm bg-sky-400" />
                  {stageDetail}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sample Repositories (1-Click Instant Analysis) */}
        <div className="w-full max-w-2xl mt-5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 font-mono">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>Sample Repositories (1-Click)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Click to test instantly</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {samples.slice(0, 6).map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleSelectSample(sample)}
                disabled={isLoading}
                className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/50 transition-all duration-200 text-left group flex flex-col justify-between shadow-sm hover:shadow-md disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 truncate">
                    {sample.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate">{sample.category}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:text-slate-300 text-[10px] font-mono">
                    {sample.tags[0]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Capabilities Dock - Sleek minimalist container */}
      <div className="w-full max-w-3xl pt-3 pb-2 z-10">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-2 px-5 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800 text-xs text-slate-400 shadow-sm">
          <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Interactive 2D/3D Graph</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
            <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Code Canvas</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Blast Radius Analysis</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Security & Secret Audit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
