'use client';

import React, { useState, useMemo } from 'react';
import { ArchitectureSummary } from '@/types';
import {
  X,
  Copy,
  Check,
  Download,
  Sparkles,
  Code,
  Eye,
} from 'lucide-react';

interface ArchonCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ArchitectureSummary;
}

export const ArchonCardModal: React.FC<ArchonCardModalProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  const [cardStyle, setCardStyle] = useState<'compact' | 'detailed' | 'badge' | 'minimal'>('detailed');
  const [theme, setTheme] = useState<'dark' | 'cyberpunk' | 'emerald' | 'light'>('dark');
  const [copiedType, setCopiedType] = useState<'svg' | 'md' | null>(null);

  const { repository, health, stats } = summary;

  // Generate dynamic SVG based on style and theme
  const svgContent = useMemo(() => {
    const isDark = theme !== 'light';
    const bgFill = theme === 'cyberpunk' ? '#0f172a' : theme === 'emerald' ? '#064e3b' : isDark ? '#0b0f19' : '#ffffff';
    const cardBorder = theme === 'cyberpunk' ? '#38bdf8' : theme === 'emerald' ? '#10b981' : isDark ? '#1e293b' : '#e2e8f0';
    const textPrimary = isDark ? '#f8fafc' : '#0f172a';
    const textMuted = isDark ? '#94a3b8' : '#64748b';
    const accentColor = theme === 'cyberpunk' ? '#38bdf8' : theme === 'emerald' ? '#10b981' : '#38bdf8';
    const gradeColor = health.grade.startsWith('A') ? '#10b981' : health.grade === 'B' ? '#38bdf8' : '#f59e0b';

    if (cardStyle === 'badge') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="48" viewBox="0 0 320 48" fill="none">
  <rect width="320" height="48" rx="8" fill="${bgFill}" stroke="${cardBorder}" stroke-width="1.5"/>
  <text x="16" y="29" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="13">Archon Outline</text>
  <rect x="145" y="10" width="36" height="28" rx="6" fill="${gradeColor}22" stroke="${gradeColor}" stroke-width="1"/>
  <text x="163" y="29" fill="${gradeColor}" font-family="monospace" font-weight="800" font-size="14" text-anchor="middle">${health.grade}</text>
  <text x="195" y="29" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="12">${stats.modulesCount} files · ${health.scaleGrade}</text>
</svg>`;
    }

    if (cardStyle === 'compact') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="130" viewBox="0 0 480 130" fill="none">
  <rect width="480" height="130" rx="12" fill="${bgFill}" stroke="${cardBorder}" stroke-width="1.5"/>
  <!-- Header -->
  <text x="24" y="36" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16">${repository.name}</text>
  <text x="24" y="56" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="12">Archon Architecture Outline · Scale: ${health.scaleGrade}</text>

  <!-- Grade Badge -->
  <rect x="390" y="24" width="66" height="66" rx="12" fill="${gradeColor}18" stroke="${gradeColor}" stroke-width="1.5"/>
  <text x="423" y="66" fill="${gradeColor}" font-family="monospace" font-weight="800" font-size="28" text-anchor="middle">${health.grade}</text>

  <!-- Stats row -->
  <text x="24" y="98" fill="${textMuted}" font-family="monospace" font-size="12">Files: <tspan fill="${accentColor}" font-weight="700">${stats.modulesCount}</tspan>   Deps: <tspan fill="${accentColor}" font-weight="700">${stats.totalEdges}</tspan>   Dead Code: <tspan fill="${textPrimary}" font-weight="700">${health.deadCodePercent}%</tspan>   Fragility: <tspan fill="${textPrimary}" font-weight="700">${health.fragility}%</tspan></text>
</svg>`;
    }

    // Detailed Style
    return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="220" viewBox="0 0 560 220" fill="none">
  <rect width="560" height="220" rx="16" fill="${bgFill}" stroke="${cardBorder}" stroke-width="1.5"/>
  
  <!-- Header -->
  <text x="28" y="38" fill="${textPrimary}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="18">${repository.name}</text>
  <text x="28" y="58" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="12">Archon Architecture Outline · ${repository.branch || 'main'}</text>

  <!-- Grade Box -->
  <rect x="450" y="24" width="80" height="80" rx="14" fill="${gradeColor}18" stroke="${gradeColor}" stroke-width="1.5"/>
  <text x="490" y="74" fill="${gradeColor}" font-family="monospace" font-weight="900" font-size="34" text-anchor="middle">${health.grade}</text>
  <text x="490" y="93" fill="${gradeColor}" font-family="monospace" font-weight="600" font-size="10" text-anchor="middle">${health.overallScore}/100</text>

  <!-- Metric Gauges -->
  <!-- Maintainability -->
  <text x="28" y="104" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Maintainability</text>
  <text x="130" y="104" fill="${accentColor}" font-family="monospace" font-weight="700" font-size="11">${health.maintainability}%</text>
  <rect x="28" y="112" width="130" height="6" rx="3" fill="${cardBorder}"/>
  <rect x="28" y="112" width="${Math.round(130 * (health.maintainability / 100))}" height="6" rx="3" fill="${accentColor}"/>

  <!-- Reliability -->
  <text x="180" y="104" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Reliability</text>
  <text x="280" y="104" fill="#10b981" font-family="monospace" font-weight="700" font-size="11">${health.reliability}%</text>
  <rect x="180" y="112" width="130" height="6" rx="3" fill="${cardBorder}"/>
  <rect x="180" y="112" width="${Math.round(130 * (health.reliability / 100))}" height="6" rx="3" fill="#10b981"/>

  <!-- Security -->
  <text x="330" y="104" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Security</text>
  <text x="400" y="104" fill="#c084fc" font-family="monospace" font-weight="700" font-size="11">${health.security}%</text>
  <rect x="330" y="112" width="90" height="6" rx="3" fill="${cardBorder}"/>
  <rect x="330" y="112" width="${Math.round(90 * (health.security / 100))}" height="6" rx="3" fill="#c084fc"/>

  <!-- Divider -->
  <line x1="28" y1="145" x2="532" y2="145" stroke="${cardBorder}" stroke-width="1"/>

  <!-- Bottom Stats Grid -->
  <text x="28" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Files: <tspan fill="${textPrimary}" font-weight="700">${stats.modulesCount}</tspan></text>
  <text x="120" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Dependencies: <tspan fill="${textPrimary}" font-weight="700">${stats.totalEdges}</tspan></text>
  <text x="240" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Cycles: <tspan fill="${health.circularDependenciesCount > 0 ? '#f43f5e' : textPrimary}" font-weight="700">${health.circularDependenciesCount}</tspan></text>
  <text x="330" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Dead Code: <tspan fill="${textPrimary}" font-weight="700">${health.deadCodePercent}%</tspan></text>
  <text x="435" y="176" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">Fragility: <tspan fill="${textPrimary}" font-weight="700">${health.fragility}%</tspan></text>

  <text x="28" y="200" fill="${textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="10">Generated by Archon · Auto-updates on merge</text>
</svg>`;
  }, [cardStyle, theme, repository, health, stats]);

  const markdownSnippet = `[![Archon Outline](${typeof window !== 'undefined' ? window.location.origin : ''}/api/card?id=${repository.id}&style=${cardStyle}&theme=${theme})](${repository.url})`;

  const handleCopySvg = () => {
    navigator.clipboard.writeText(svgContent);
    setCopiedType('svg');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownSnippet);
    setCopiedType('md');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repository.name.toLowerCase()}-archon-outline.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-950/80 border border-sky-800/80 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-sans">Architecture Outline Card</h2>
              <p className="text-xs text-slate-400">Export self-updating outline cards for your repository documentation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Controls: Style & Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-sans text-slate-400 mb-1.5 font-medium">Outline Style</label>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {(['detailed', 'compact', 'badge'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setCardStyle(style)}
                    className={`flex-1 py-1.5 rounded-lg capitalize border transition-all ${
                      cardStyle === style
                        ? 'bg-sky-950 text-sky-400 border-sky-800 font-semibold shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-sans text-slate-400 mb-1.5 font-medium">Color Theme</label>
              <div className="flex items-center gap-1.5 text-xs font-mono">
                {(['dark', 'cyberpunk', 'emerald', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`flex-1 py-1.5 rounded-lg capitalize border transition-all ${
                      theme === t
                        ? 'bg-sky-950 text-sky-400 border-sky-800 font-semibold shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card Live Preview */}
          <div>
            <label className="block text-xs font-sans text-slate-400 mb-2 flex items-center gap-1.5 font-medium">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              Live Outline SVG Preview
            </label>
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-white/5 flex items-center justify-center overflow-x-auto min-h-[160px] shadow-inner">
              <div dangerouslySetInnerHTML={{ __html: svgContent }} />
            </div>
          </div>

          {/* Embed Markdown Snippet */}
          <div>
            <label className="block text-xs font-sans text-slate-400 mb-1.5 flex items-center gap-1.5 font-medium">
              <Code className="w-3.5 h-3.5 text-sky-400" />
              Markdown Embed Snippet
            </label>
            <div className="p-3 rounded-xl bg-slate-950 border border-white/5 font-mono text-xs text-slate-300 flex items-center justify-between gap-2 overflow-x-auto">
              <span className="truncate">{markdownSnippet}</span>
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-semibold shrink-0 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copiedType === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'md' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-end gap-3 text-xs">
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download SVG</span>
          </button>

          <button
            type="button"
            onClick={handleCopySvg}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all shadow-md shadow-sky-950/50"
          >
            {copiedType === 'svg' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedType === 'svg' ? 'SVG Copied!' : 'Copy Raw SVG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
