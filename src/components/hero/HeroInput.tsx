'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  GitBranch,
  Settings2,
  FolderGit2,
  FolderOpen,
  GitPullRequest,
  Loader2,
  AlertCircle,
  ChevronDown,
  Globe2,
  Sparkles,
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
  const [inputMode, setInputMode] = useState<'url' | 'folder' | 'pr'>('url');
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [localError, setLocalError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [samples, setSamples] = useState<SampleRepoInfo[]>(getSampleRepositories());

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setLocalError('');

    if (inputMode === 'url') {
      if (!url.trim()) {
        setLocalError('Please enter a repository URL.');
        return;
      }
      onAnalyze(url.trim(), branch.trim() || undefined, undefined, undefined, false);
    } else if (inputMode === 'pr') {
      if (!prUrl.trim()) {
        setLocalError('Please enter a pull request URL.');
        return;
      }
      onAnalyze(prUrl.trim(), undefined, undefined, undefined, false);
    }
  };

  const handleSelectSample = (sample: SampleRepoInfo) => {
    if (isLoading) return;
    setUrl(sample.name);
    setLocalError('');
    onAnalyze(sample.url, undefined, undefined, undefined, false);
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
                      : 'Enter GitHub repository URL (e.g. expressjs/express or https://github.com/...)'
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
              <span>Analyzing repository architecture and dependency graph...</span>
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

        {/* Sample Repositories (Button with Horizontal Cards Showcase) */}
        <div className="mt-4 w-full flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowSamples(!showSamples)}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-all ${
              showSamples
                ? 'bg-slate-800 text-slate-100 border-slate-700 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Sample repositories</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${showSamples ? 'rotate-180' : ''}`} />
          </button>

          {/* Horizontal Layout Showcase (No scrollbar, clean responsive flex/grid) */}
          {showSamples && (
            <div className="mt-3 w-full max-w-2xl animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                {samples.map((sample) => {
                  const shortName = sample.name.split('/')[1] || sample.name;
                  const langTag = sample.tags?.[0] || 'Code';

                  return (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      disabled={isLoading}
                      title={sample.description}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 transition-all text-left group shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="font-mono text-xs font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
                        {shortName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0">
                        {langTag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


