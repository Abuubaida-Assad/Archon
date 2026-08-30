'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  GitBranch,
  Settings2,
  FolderGit2,
  FolderOpen,
  Key,
  Lock,
  GitPullRequest,
  Loader2,
  AlertCircle,
  ChevronDown,
  Globe2,
  X,
} from 'lucide-react';
import { SampleRepoInfo, getSampleRepositories } from '@/lib/sample-repos';

interface HeroInputProps {
  onAnalyze: (
    url: string,
    branch?: string,
    token?: string,
    localFiles?: any[],
    isPrivate?: boolean
  ) => Promise<void>;
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
  const [inputMode, setInputMode] = useState<'url' | 'private' | 'folder' | 'pr'>('url');
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [token, setToken] = useState<string>('');
  const [prUrl, setPrUrl] = useState('');
  const [localError, setLocalError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [samples, setSamples] = useState<SampleRepoInfo[]>(getSampleRepositories());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sampleDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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
      .catch(() => {});
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setLocalError('');

    if (inputMode === 'private') {
      if (!url.trim()) {
        setLocalError('Please enter a private repository URL.');
        return;
      }
      if (!token.trim()) {
        setLocalError('A GitHub Personal Access Token is required for private repositories.');
        return;
      }
      onAnalyze(url.trim(), branch.trim() || undefined, token.trim(), undefined, true);
    } else if (inputMode === 'url') {
      if (!url.trim()) {
        setLocalError('Please enter a repository URL.');
        return;
      }
      onAnalyze(url.trim(), branch.trim() || undefined, token.trim() || undefined, undefined, false);
    } else if (inputMode === 'pr') {
      if (!prUrl.trim()) {
        setLocalError('Please enter a pull request URL.');
        return;
      }
      onAnalyze(prUrl.trim(), undefined, token.trim() || undefined, undefined, false);
    }
  };

  const handleSelectSample = (sample: SampleRepoInfo) => {
    setUrl(sample.name);
    setShowSampleDropdown(false);
    setLocalError('');
    onAnalyze(sample.url, undefined, token.trim() || undefined, undefined, false);
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
          onAnalyze(dirHandle.name, undefined, undefined, files, false);
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
      onAnalyze('Local Folder', undefined, undefined, files, false);
    }
  };

  const activeError = localError || errorMessage;

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col justify-center items-center px-4 py-8 overflow-y-auto bg-background text-slate-100 relative">
      {/* Hidden File Input for fallback directory selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
        className="hidden"
      />

      {/* Very subtle faint grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Centered Content Container */}
      <div className="w-full max-w-2xl flex flex-col items-center z-10 my-auto">
        {/* Main Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-100 text-center tracking-tight leading-[1.15] max-w-xl mb-6 font-sans">
          Every module.<br />
          Every dependency.<br />
          <span className="text-sky-400 italic font-serif font-normal">Verified.</span>
        </h1>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 mb-3 text-xs">
          <button
            type="button"
            onClick={() => {
              setInputMode('url');
              setLocalError('');
            }}
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
            onClick={() => {
              setInputMode('private');
              setLocalError('');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors text-xs font-medium ${
              inputMode === 'private'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span>Private Repo</span>
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
            onClick={() => {
              setInputMode('pr');
              setLocalError('');
            }}
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
            {/* Standard Single Box Mode (Public GitHub / PR) */}
            {inputMode !== 'private' ? (
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
            ) : (
              /* Dedicated Private Repository Mode */
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-3 shadow-md">
                {/* Repository URL Input */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Repository URL</label>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 focus-within:border-slate-700">
                    <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://github.com/username/private-repository"
                      disabled={isLoading}
                      autoFocus
                      className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none font-sans"
                    />
                  </div>
                </div>

                {/* Personal Access Token Input */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    GitHub Personal Access Token
                  </label>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-800 focus-within:border-slate-700">
                    <Key className="w-4 h-4 text-sky-400 shrink-0" />
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxx"
                      disabled={isLoading}
                      className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Required only for private GitHub repositories. Never logged or stored.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Branch settings</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!url.trim() || !token.trim() || isLoading}
                    className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-md bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs sm:text-sm transition-colors shadow-sm"
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
            )}

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

          {/* Error Notification */}
          {activeError && (
            <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Analysis Failed</p>
                <p className="text-rose-400">{activeError}</p>
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


