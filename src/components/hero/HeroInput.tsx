'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  GitBranch,
  Settings2,
  FolderGit2,
  FolderOpen,
  Key,
  GitPullRequest,
  Loader2,
  AlertCircle,
  ChevronDown,
  Globe2,
  X,
} from 'lucide-react';
import { SampleRepoInfo, getSampleRepositories } from '@/lib/sample-repos';

interface HeroInputProps {
  onAnalyze: (url: string, branch?: string, token?: string, localFiles?: any[]) => Promise<void>;
  isLoading: boolean;
  currentStage?: string;
  progressPercent?: number;
  stageDetail?: string;
  errorMessage?: string;
}

export const HeroInput: React.FC<HeroInputProps> = ({
  onAnalyze,
  isLoading,
  errorMessage,
}) => {
  const [inputMode, setInputMode] = useState<'url' | 'folder' | 'pr'>('url');
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState<string>('');
  const [prUrl, setPrUrl] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [samples, setSamples] = useState<SampleRepoInfo[]>(getSampleRepositories());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sampleDropdownRef = useRef<HTMLDivElement | null>(null);

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

  // Close sample dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sampleDropdownRef.current && !sampleDropdownRef.current.contains(event.target as Node)) {
        setShowSampleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    setShowSampleDropdown(false);
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
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-center items-center px-4 py-8 overflow-y-auto bg-background text-slate-100">
      {/* Hidden File Input for fallback directory selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
        className="hidden"
      />

      {/* Main Centered Content Container */}
      <div className="w-full max-w-xl flex flex-col items-center z-10">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 text-center tracking-tight mb-1.5 font-sans">
          Archon
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-slate-400 text-center mb-6 font-sans">
          Analyze your codebase architecture.
        </p>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 mb-3 text-xs">
          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors text-xs font-medium ${
              inputMode === 'url'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
            <span>GitHub</span>
          </button>

          <button
            type="button"
            onClick={handleOpenFolderPicker}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Local Folder</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('pr')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors text-xs font-medium ${
              inputMode === 'pr'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5 text-sky-400" />
            <span>Pull Request</span>
          </button>
        </div>

        {/* Main Input Form */}
        <div className="w-full relative">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 focus-within:border-slate-700 focus-within:ring-1 focus-within:ring-slate-700 transition-all">
              <div className="flex items-center gap-2.5 px-2.5 py-1.5 w-full">
                {inputMode === 'pr' ? (
                  <GitPullRequest className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <Globe2 className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <input
                  type="text"
                  value={inputMode === 'pr' ? prUrl : url}
                  onChange={(e) => (inputMode === 'pr' ? setPrUrl(e.target.value) : setUrl(e.target.value))}
                  placeholder={
                    inputMode === 'pr'
                      ? 'github.com/owner/repo/pull/123'
                      : 'Enter GitHub URL or owner/repo'
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
                  className={`p-1.5 rounded-md border text-xs font-medium transition-colors ${
                    token
                      ? 'bg-sky-950 border-sky-800 text-sky-400'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title="GitHub Personal Access Token"
                >
                  <Key className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`p-1.5 rounded-md border text-xs font-medium transition-colors ${
                    showAdvanced
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title="Branch & Scope Settings"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="submit"
                  disabled={(!url.trim() && !prUrl.trim()) || isLoading}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs sm:text-sm transition-colors shadow-sm"
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
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Target Branch (optional)</label>
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">
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
                    <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300 text-[11px]">
                      Full AST + Health + Security + Impact
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Clean Loading State */}
          {isLoading && (
            <div className="mt-4 flex items-center justify-center gap-2 py-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}

          {/* GitHub PAT Token Modal */}
          {showTokenModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-lg bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-semibold text-slate-100">GitHub Personal Access Token</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Used for private repositories & higher GitHub API rate limits.
                </p>

                <div>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => handleSaveToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-700"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Your token is stored locally in your browser memory and is never logged.
                  </p>
                </div>

                <div className="flex justify-end gap-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="px-3 py-1.5 rounded-md bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400 transition-colors"
                  >
                    Save Token
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Analysis Failed</p>
                <p className="text-rose-400">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sample Repositories (Dropdown / Selector) */}
        <div ref={sampleDropdownRef} className="relative mt-4">
          <button
            type="button"
            onClick={() => setShowSampleDropdown(!showSampleDropdown)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-900/60 rounded-md transition-colors disabled:opacity-50"
          >
            <span>Sample repositories</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showSampleDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showSampleDropdown && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 w-72 max-w-[90vw] bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-30">
              <div className="px-3 py-1.5 text-[11px] font-medium text-slate-500 border-b border-slate-800 uppercase tracking-wider">
                Select a sample repository
              </div>
              <div className="max-h-60 overflow-y-auto">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-slate-800 flex items-center justify-between group transition-colors"
                  >
                    <div className="truncate pr-2">
                      <div className="font-mono font-medium text-slate-200 group-hover:text-sky-400 truncate">
                        {sample.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {sample.category}
                      </div>
                    </div>
                    {sample.tags && sample.tags[0] && (
                      <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 shrink-0">
                        {sample.tags[0]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

